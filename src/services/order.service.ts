import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
import {
  calculateShipping,
  calculateTax,
} from "./shipping-tax.service";
import {
  createStockReservations,
  releaseReservations,
  releaseExpiredReservations,
} from "./reservation.service";
import type {
  CheckoutSubmissionInput,
  OrderWithDetails,
} from "@/types/order";

/**
 * Generates unique, prestigious order reference code.
 * Format: NXR-YYYY-XXXXXX (e.g. NXR-2026-K7W92Q)
 */
export async function generateOrderNumber(businessId?: string): Promise<string> {
  let prefix = "NXR";
  if (businessId) {
    const settings = await prisma.businessSettings.findUnique({
      where: { businessId },
      select: { orderPrefix: true },
    });
    if (settings?.orderPrefix) {
      prefix = settings.orderPrefix.toUpperCase();
    }
  }

  const year = new Date().getFullYear();
  let orderNumber = "";
  let exists = true;

  while (exists) {
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    orderNumber = `${prefix}-${year}-${randomSuffix}`;

    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });
    if (!existing) {
      exists = false;
    }
  }

  return orderNumber;
}

/**
 * Authoritative, transactional order creation from checkout.
 * Enforces PostgreSQL row locks, validates stock against DB, computes server totals,
 * captures immutable item snapshots, and establishes stock reservations.
 */
export async function createOrderFromCheckout(
  input: CheckoutSubmissionInput,
  authenticatedUserId?: string
): Promise<OrderWithDetails> {
  if (!input.items || input.items.length === 0) {
    throw new Error("Cannot checkout with an empty cart.");
  }

  const targetBusinessId = input.businessId || DEFAULT_BUSINESS_ID;

  // 1. Proactively sweep any expired reservations across the store
  await releaseExpiredReservations(targetBusinessId).catch((err) =>
    console.error("Expired reservation cleanup notice:", err)
  );

  return await prisma.$transaction(async (tx) => {
    // 2. Row-lock all requested variants in sorted order (avoids deadlocks)
    const sortedItems = [...input.items].sort((a, b) =>
      a.variantId.localeCompare(b.variantId)
    );

    const verifiedItems: Array<{
      variantId: string;
      productId: string;
      productTitle: string;
      variantTitle: string;
      sku: string;
      imageUrl: string | null;
      priceInCents: number;
      quantity: number;
      subtotalInCents: number;
    }> = [];

    let calculatedSubtotal = 0;

    for (const item of sortedItems) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid item quantity: ${item.quantity}`);
      }

      // Concurrency protection: acquire exclusive PostgreSQL row lock
      await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${item.variantId} FOR UPDATE`;

      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });

      if (!variant) {
        throw new Error(`Variant not found with ID: ${item.variantId}`);
      }

      if (variant.product.businessId !== targetBusinessId) {
        throw new Error(
          `Cross-tenant checkout error: item "${variant.product.title}" does not belong to this store.`
        );
      }

      if (!variant.product.published || variant.product.isArchived) {
        throw new Error(
          `The piece "${variant.product.title}" is currently unavailable or archived.`
        );
      }

      if (variant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${variant.product.title} (${variant.title})". Requested: ${item.quantity}, Available: ${variant.stock}.`
        );
      }

      const itemSubtotal = variant.priceInCents * item.quantity;
      calculatedSubtotal += itemSubtotal;

      verifiedItems.push({
        variantId: variant.id,
        productId: variant.productId,
        productTitle: variant.product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        imageUrl: variant.product.images[0]?.url || null,
        priceInCents: variant.priceInCents, // Authoritative price from PostgreSQL
        quantity: item.quantity,
        subtotalInCents: itemSubtotal,
      });
    }

    // 3. Authoritative server-side shipping calculation
    const { priceInCents: shippingInCents } = calculateShipping(
      input.shippingMethod,
      calculatedSubtotal
    );

    // 4. Authoritative server-side tax calculation
    const { taxInCents } = calculateTax(calculatedSubtotal, input.shippingAddress);

    const discountInCents = 0; // Future promo engine integration
    const totalInCents = calculatedSubtotal + shippingInCents + taxInCents - discountInCents;

    // 5. Create Shipping Address
    const shippingAddress = await tx.address.create({
      data: {
        userId: authenticatedUserId || null,
        firstName: input.shippingAddress.firstName.trim(),
        lastName: input.shippingAddress.lastName.trim(),
        company: input.shippingAddress.company?.trim() || null,
        addressLine1: input.shippingAddress.addressLine1.trim(),
        addressLine2: input.shippingAddress.addressLine2?.trim() || null,
        city: input.shippingAddress.city.trim(),
        stateOrProvince: input.shippingAddress.stateOrProvince?.trim() || null,
        postalCode: input.shippingAddress.postalCode.trim(),
        country: input.shippingAddress.country.trim(),
        phone: input.shippingAddress.phone?.trim() || null,
      },
    });

    // 6. Create Billing Address if distinct
    let billingAddressId = shippingAddress.id;
    if (input.billingAddress) {
      const billingAddress = await tx.address.create({
        data: {
          userId: authenticatedUserId || null,
          firstName: input.billingAddress.firstName.trim(),
          lastName: input.billingAddress.lastName.trim(),
          company: input.billingAddress.company?.trim() || null,
          addressLine1: input.billingAddress.addressLine1.trim(),
          addressLine2: input.billingAddress.addressLine2?.trim() || null,
          city: input.billingAddress.city.trim(),
          stateOrProvince: input.billingAddress.stateOrProvince?.trim() || null,
          postalCode: input.billingAddress.postalCode.trim(),
          country: input.billingAddress.country.trim(),
          phone: input.billingAddress.phone?.trim() || null,
        },
      });
      billingAddressId = billingAddress.id;
    }

    const orderNumber = await generateOrderNumber(targetBusinessId);

    // 7. Create Order Record
    const order = await tx.order.create({
      data: {
        businessId: targetBusinessId,
        orderNumber,
        userId: authenticatedUserId || null,
        guestEmail: !authenticatedUserId ? input.guestEmail?.trim() : null,
        guestName: !authenticatedUserId ? input.guestName?.trim() : null,
        status: "PENDING",
        currency: "USD",
        subtotalInCents: calculatedSubtotal,
        shippingInCents,
        taxInCents,
        discountInCents,
        totalInCents,
        paymentStatus: "UNPAID",
        shippingAddressId: shippingAddress.id,
        billingAddressId,
        shippingMethod: input.shippingMethod,
        notes: input.notes?.trim() || null,
      },
    });

    // 8. Create Immutable OrderItem Snapshots
    await tx.orderItem.createMany({
      data: verifiedItems.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        variantId: i.variantId,
        productTitle: i.productTitle,
        variantTitle: i.variantTitle,
        sku: i.sku,
        imageUrl: i.imageUrl,
        priceInCents: i.priceInCents,
        quantity: i.quantity,
        subtotalInCents: i.subtotalInCents,
      })),
    });

    // 9. Establish Stock Reservation
    await createStockReservations(
      order.id,
      input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      20, // 20-minute reservation window
      tx
    );

    // 10. Return order with relations
    const completeOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
        shipments: true,
        stockReservations: true,
      },
    });

    return completeOrder as OrderWithDetails;
  });
}

/**
 * Retrieves order details with strict client authorization.
 * Prevents customers from accessing other customers' orders.
 */
export async function getOrderForCustomer(
  orderIdOrNumber: string,
  requester: { userId?: string; guestEmail?: string; isAdmin?: boolean; businessId?: string }
): Promise<OrderWithDetails | null> {
  const whereClause: Record<string, unknown> = {
    OR: [
      { id: orderIdOrNumber },
      { orderNumber: orderIdOrNumber },
    ],
  };

  if (requester.businessId) {
    whereClause.businessId = requester.businessId;
  }

  const order = await prisma.order.findFirst({
    where: whereClause,
    include: {
      items: true,
      shippingAddress: true,
      billingAddress: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
      shipments: {
        orderBy: { createdAt: "desc" },
      },
      stockReservations: true,
      returnRequests: {
        orderBy: { createdAt: "desc" },
      },
      supportTickets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return null;
  }

  // Administrators can view any order
  if (requester.isAdmin) {
    return order as OrderWithDetails;
  }

  // Authenticated user check
  if (requester.userId && order.userId === requester.userId) {
    return order as OrderWithDetails;
  }

  // Guest email check
  if (
    requester.guestEmail &&
    order.guestEmail &&
    order.guestEmail.toLowerCase() === requester.guestEmail.toLowerCase()
  ) {
    return order as OrderWithDetails;
  }

  // Authorization failed
  throw new Error("Access denied: You are not authorized to view this order.");
}

/**
 * Retrieves order history for an authenticated customer.
 */
export async function getCustomerOrderHistory(userId: string, businessId?: string) {
  return await prisma.order.findMany({
    where: {
      userId,
      ...(businessId ? { businessId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      shippingAddress: true,
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      shipments: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      returnRequests: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Allows a customer to cancel an eligible order prior to fulfillment.
 * Releases reserved stock and handles paid orders as refund-required workflows.
 */
export async function cancelCustomerOrder(
  orderId: string,
  userId: string,
  reason: string = "Client requested cancellation"
): Promise<OrderWithDetails> {
  return await prisma.$transaction(async (tx) => {
    // Lock order
    await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        stockReservations: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.userId !== userId) {
      throw new Error("Access denied: You do not own this order.");
    }

    // Only allow cancellation for PENDING, AWAITING_PAYMENT, or PAID prior to dispatch
    if (["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)) {
      throw new Error(
        `Order ${order.orderNumber} cannot be cancelled as its status is "${order.status}".`
      );
    }

    // 1. Release stock back to catalog
    await releaseReservations(order.id, reason, tx);

    // 2. Update order status: paid orders are NOT marked "REFUNDED" immediately;
    // they enter a refundRequired workflow for reconciliation.
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancellationRequested: false,
        refundRequired: order.paymentStatus === "PAID",
        refundAmountInCents: order.paymentStatus === "PAID" ? order.totalInCents : null,
        refundReason: order.paymentStatus === "PAID" ? "Client requested cancellation" : null,
      },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
        shipments: true,
        stockReservations: true,
      },
    });

    return updated as OrderWithDetails;
  });
}
