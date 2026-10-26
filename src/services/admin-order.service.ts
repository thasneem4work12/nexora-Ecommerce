import { prisma } from "@/lib/prisma";
import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  Prisma,
  ShipmentStatus,
} from "@prisma/client";
import { releaseReservations } from "./reservation.service";
import type { OrderWithDetails } from "@/types/order";
import { updateOrderShipment as updateShipmentService } from "./shipment.service";
import { notifyCancellationDecision } from "./notification.service";

export interface AdminOrderFilter {
  businessId?: string;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

/**
 * Retrieves paginated orders for the administrator dashboard with search, status, fulfillment, date range, and sort options.
 */
export async function getAdminOrders(filter: AdminOrderFilter = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (filter.businessId) {
    where.businessId = filter.businessId;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.paymentStatus) {
    where.paymentStatus = filter.paymentStatus;
  }

  if (filter.fulfillmentStatus) {
    where.fulfillmentStatus = filter.fulfillmentStatus;
  }

  if (filter.startDate || filter.endDate) {
    where.createdAt = {};
    if (filter.startDate) {
      where.createdAt.gte = filter.startDate;
    }
    if (filter.endDate) {
      where.createdAt.lte = filter.endDate;
    }
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

  const orderBy: Prisma.OrderOrderByWithRelationInput = {
    createdAt: filter.sortBy === "oldest" ? "asc" : "desc",
  };

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
        returnRequests: {
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
 * Retrieves single order with complete audit trail, payments, events, reservations, shipments, and return requests.
 */
export async function getAdminOrderById(
  orderId: string,
  businessId?: string
): Promise<OrderWithDetails | null> {
  const where: Prisma.OrderWhereUniqueInput = { id: orderId };
  const order = await prisma.order.findUnique({
    where,
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

  if (businessId && order.businessId !== businessId) {
    return null;
  }

  return order as OrderWithDetails | null;
}

/**
 * Updates order status through permitted fulfillment transitions.
 * Guarded against fraudulent manual marking of unpaid orders as paid.
 */
export async function updateAdminOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  adminNotes?: string,
  businessId?: string
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

    if (businessId && order.businessId !== businessId) {
      throw new Error("Access denied: Order does not belong to the active business.");
    }

    // Security Guard: Prevent invalid order and payment state transitions
    const fulfillmentStatuses: OrderStatus[] = ["PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

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

    // 4. Prevent cancelling shipped or delivered orders without return workflow
    if (newStatus === "CANCELLED" && (order.status === "SHIPPED" || order.status === "DELIVERED")) {
      throw new Error(
        `Invalid order transition: Order ${order.orderNumber} has already been dispatched (${order.status}). Cancellation is forbidden; please initiate a Return Request.`
      );
    }

    // If transitioning to CANCELLED, release stock reservations if active
    if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
      await releaseReservations(order.id, adminNotes || "Cancelled by store director", tx);
    }

    // Synchronize fulfillmentStatus based on new status
    let targetFulfillmentStatus: FulfillmentStatus = order.fulfillmentStatus;
    if (newStatus === "PROCESSING") targetFulfillmentStatus = "PROCESSING";
    else if (newStatus === "PACKED") targetFulfillmentStatus = "PACKED";
    else if (newStatus === "SHIPPED") targetFulfillmentStatus = "SHIPPED";
    else if (newStatus === "DELIVERED") targetFulfillmentStatus = "DELIVERED";
    else if (newStatus === "RETURNED") targetFulfillmentStatus = "RETURNED";
    else if (newStatus === "CANCELLED") targetFulfillmentStatus = "CANCELLED";

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        fulfillmentStatus: targetFulfillmentStatus,
        notes: adminNotes
          ? `${order.notes ? `${order.notes}\n` : ""}[Director Note ${new Date().toISOString().split("T")[0]}]: ${adminNotes}`
          : order.notes,
        cancelledAt: newStatus === "CANCELLED" ? new Date() : order.cancelledAt,
        cancelReason: newStatus === "CANCELLED" ? adminNotes || "Director administrative cancellation" : order.cancelReason,
        refundRequired: newStatus === "CANCELLED" && order.paymentStatus === "PAID",
        refundAmountInCents: newStatus === "CANCELLED" && order.paymentStatus === "PAID" ? order.totalInCents : order.refundAmountInCents,
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

    if (newStatus === "CANCELLED" && order.userId) {
      await notifyCancellationDecision(order.id, order.userId, order.orderNumber, "APPROVED", adminNotes);
    }

    return updated as OrderWithDetails;
  });
}

/**
 * Creates or updates shipment information and synchronizes fulfillment state.
 */
export async function updateOrderShipment(
  orderId: string,
  input: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    status?: ShipmentStatus;
    notes?: string;
  }
) {
  return await updateShipmentService({
    orderId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    status: input.status,
    notes: input.notes,
  });
}

/**
 * Computes high-level executive order and operational metrics from PostgreSQL.
 */
export async function getAdminOrderMetrics(businessId?: string) {
  const bWhere = businessId ? { businessId } : {};

  const [
    totalOrders,
    paidOrders,
    ordersAwaitingFulfillment,
    shippedOrders,
    completedOrders,
    openSupportTickets,
    pendingReturnRequests,
    revenueData,
  ] = await prisma.$transaction([
    // 1. Total orders placed
    prisma.order.count({ where: bWhere }),
    // 2. Paid orders
    prisma.order.count({ where: { ...bWhere, paymentStatus: "PAID" } }),
    // 3. Orders awaiting fulfillment (paid, but unfulfilled/processing/packed)
    prisma.order.count({
      where: {
        ...bWhere,
        paymentStatus: "PAID",
        fulfillmentStatus: { in: ["UNFULFILLED", "PROCESSING", "PACKED"] },
      },
    }),
    // 4. Shipped orders currently in transit
    prisma.order.count({ where: { ...bWhere, fulfillmentStatus: "SHIPPED" } }),
    // 5. Completed orders safely delivered
    prisma.order.count({ where: { ...bWhere, fulfillmentStatus: "DELIVERED" } }),
    // 6. Open support tickets awaiting resolution
    prisma.supportTicket.count({
      where: {
        ...bWhere,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] },
      },
    }),
    // 7. Pending return requests awaiting inspection
    prisma.returnRequest.count({ where: { ...bWhere, status: "PENDING" } }),
    // 8. Authoritative revenue from verified paid orders excluding cancellations
    prisma.order.aggregate({
      where: {
        ...bWhere,
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
      },
      _sum: { totalInCents: true },
    }),
  ]);

  const confirmedRevenueInCents = revenueData._sum.totalInCents || 0;

  return {
    totalOrders,
    paidOrders,
    ordersAwaitingFulfillment,
    pendingFulfillment: ordersAwaitingFulfillment,
    shippedOrders,
    completedOrders,
    openSupportTickets,
    pendingReturnRequests,
    confirmedRevenueInCents,
    totalRevenueInCents: confirmedRevenueInCents,
  };
}
