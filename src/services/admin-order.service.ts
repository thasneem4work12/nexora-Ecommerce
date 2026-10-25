import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentStatus, Prisma, ShipmentStatus } from "@prisma/client";
import { releaseReservations } from "./reservation.service";
import type { OrderWithDetails } from "@/types/order";

export interface AdminOrderFilter {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  limit?: number;
}

/**
 * Retrieves paginated orders for the administrator dashboard with search and status filters.
 */
export async function getAdminOrders(filter: AdminOrderFilter = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.paymentStatus) {
    where.paymentStatus = filter.paymentStatus;
  }

  if (filter.search && filter.search.trim().length > 0) {
    const term = filter.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" as const } },
      { guestEmail: { contains: term, mode: "insensitive" as const } },
      { guestName: { contains: term, mode: "insensitive" as const } },
      { user: { name: { contains: term, mode: "insensitive" as const } } },
      { user: { email: { contains: term, mode: "insensitive" as const } } },
    ];
  }

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        shippingAddress: true,
        items: true,
        payments: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        shipments: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves single order with complete audit trail, payments, events, and reservations.
 */
export async function getAdminOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: true,
      billingAddress: true,
      items: {
        include: {
          variant: true,
          product: true,
        },
      },
      payments: {
        include: {
          events: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      shipments: {
        orderBy: { createdAt: "desc" },
      },
      stockReservations: {
        include: { variant: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return order as OrderWithDetails | null;
}

/**
 * Updates order status through permitted fulfillment transitions.
 * Guarded against fraudulent manual marking of unpaid orders as paid.
 */
export async function updateAdminOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  adminNotes?: string
): Promise<OrderWithDetails> {
  return await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, stockReservations: true },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Security Guard: Prevent invalid order and payment state transitions
    const fulfillmentStatuses: OrderStatus[] = ["PROCESSING", "SHIPPED", "DELIVERED"];

    // 1. Prevent advancing cancelled orders to fulfillment
    if (order.status === "CANCELLED" && (fulfillmentStatuses.includes(newStatus) || newStatus === "PAID")) {
      throw new Error(
        `Invalid order transition: Cancelled order ${order.orderNumber} cannot be moved to "${newStatus}". Inventory was already released.`
      );
    }

    // 2. Prevent manually marking unpaid orders as PAID
    if (newStatus === "PAID" && order.paymentStatus !== "PAID") {
      throw new Error(
        "Unauthorized: Orders cannot be manually marked as PAID without a verified payment gateway transaction."
      );
    }

    // 3. Prevent advancing unpaid or failed orders to fulfillment
    if (fulfillmentStatuses.includes(newStatus) && order.paymentStatus !== "PAID") {
      throw new Error(
        `Invalid order transition: Order ${order.orderNumber} cannot be advanced to "${newStatus}" because payment status is "${order.paymentStatus}".`
      );
    }

    // If transitioning to CANCELLED, release stock reservations if active
    if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
      await releaseReservations(order.id, adminNotes || "Cancelled by store director", tx);
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        notes: adminNotes
          ? `${order.notes ? `${order.notes}\n` : ""}[Director Note ${new Date().toISOString().split("T")[0]}]: ${adminNotes}`
          : order.notes,
        cancelledAt: newStatus === "CANCELLED" ? new Date() : order.cancelledAt,
        cancelReason: newStatus === "CANCELLED" ? adminNotes || "Director administrative cancellation" : order.cancelReason,
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

/**
 * Creates or updates shipment information and automatically advances fulfillment state.
 */
export async function updateOrderShipment(
  orderId: string,
  input: {
    carrier: string;
    trackingNumber: string;
    status?: ShipmentStatus;
    notes?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.paymentStatus !== "PAID") {
      throw new Error(
        `Cannot dispatch shipment for order ${order.orderNumber}: Payment is unverified (status: "${order.paymentStatus}").`
      );
    }

    if (order.status === "CANCELLED") {
      throw new Error(
        `Cannot dispatch shipment for cancelled order ${order.orderNumber}.`
      );
    }

    const existingShipment = order.shipments[0];
    let shipment;

    if (existingShipment) {
      shipment = await tx.shipment.update({
        where: { id: existingShipment.id },
        data: {
          carrier: input.carrier.trim(),
          trackingNumber: input.trackingNumber.trim(),
          status: input.status || "IN_TRANSIT",
          notes: input.notes?.trim() || existingShipment.notes,
          shippedAt: existingShipment.shippedAt || new Date(),
        },
      });
    } else {
      shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: input.carrier.trim(),
          trackingNumber: input.trackingNumber.trim(),
          status: input.status || "IN_TRANSIT",
          shippedAt: new Date(),
          notes: input.notes?.trim() || null,
        },
      });
    }

    // Advance order status to SHIPPED if currently PAID or PROCESSING
    if (order.status === "PAID" || order.status === "PROCESSING") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED" },
      });
    }

    return shipment;
  });
}

/**
 * Computes high-level executive order metrics for the administration dashboard.
 */
export async function getAdminOrderMetrics() {
  const [
    totalOrders,
    paidOrders,
    pendingFulfillment,
    shippedOrders,
    revenueData,
  ] = await prisma.$transaction([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: "PAID" } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalInCents: true },
    }),
  ]);

  return {
    totalOrders,
    paidOrders,
    pendingFulfillment,
    shippedOrders,
    totalRevenueInCents: revenueData._sum.totalInCents || 0,
  };
}
