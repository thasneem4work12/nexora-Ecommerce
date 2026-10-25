import { prisma } from "@/lib/prisma";
import { releaseReservations } from "./reservation.service";
import { notifyCancellationDecision } from "./notification.service";

export interface RequestCancellationInput {
  orderId: string;
  userId?: string; // If customer requested
  requestedBy: "CUSTOMER" | "STAFF";
  reason: string;
}

export interface ReviewCancellationInput {
  orderId: string;
  adminUserId: string;
  decision: "APPROVED" | "REJECTED";
  adminNotes?: string;
}

/**
 * Handles a cancellation request from a customer or store staff.
 * For unpaid orders: immediately cancels order and releases reserved stock.
 * For paid, unfulfilled orders: registers a pending cancellation request for admin review.
 * For shipped or delivered orders: strictly rejects cancellation.
 */
export async function requestOrderCancellation(input: RequestCancellationInput) {
  const { orderId, userId, requestedBy, reason } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        stockReservations: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }

    // Customer ownership verification if invoked by a customer
    if (requestedBy === "CUSTOMER") {
      if (!userId || order.userId !== userId) {
        throw new Error("Unauthorized: You can only request cancellation for your own orders.");
      }
    }

    if (order.status === "CANCELLED") {
      return {
        success: true,
        alreadyCancelled: true,
        message: `Order ${order.orderNumber} is already cancelled.`,
        status: order.status,
      };
    }

    // Shipped or delivered orders cannot be cancelled
    if (order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED") {
      throw new Error(
        `Order ${order.orderNumber} has already been dispatched (${order.fulfillmentStatus}). Cancellation is not permitted. Please submit a Return Request after delivery.`
      );
    }

    // Scenario A: Unpaid Order (Pending Payment)
    if (order.paymentStatus === "UNPAID" || order.status === "PENDING" || order.status === "AWAITING_PAYMENT") {
      await releaseReservations(order.id, `Order cancelled by ${requestedBy}: ${reason}`, tx);

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          fulfillmentStatus: "CANCELLED",
          cancelReason: `Cancelled by ${requestedBy}: ${reason}`,
          cancelledAt: new Date(),
          cancellationRequested: false,
          cancellationReason: reason,
          cancellationRequestedBy: requestedBy,
          cancellationRequestedAt: new Date(),
        },
      });

      if (order.userId) {
        await notifyCancellationDecision(order.id, order.userId, order.orderNumber, "APPROVED", reason);
      }

      return {
        success: true,
        immediateCancellation: true,
        message: `Order ${order.orderNumber} has been cancelled and stock reservation released.`,
        order: updated,
      };
    }

    // Scenario B: Paid Order (Awaiting Fulfillment)
    // Marks order with cancellation requested flag for admin review
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        cancellationRequested: true,
        cancellationReason: reason,
        cancellationRequestedAt: new Date(),
        cancellationRequestedBy: requestedBy,
        notes: `${order.notes ? `${order.notes}\n` : ""}[Cancellation Request by ${requestedBy} on ${new Date().toISOString()}]: ${reason}`,
      },
    });

    return {
      success: true,
      pendingAdminReview: true,
      message: `Cancellation request for order ${order.orderNumber} submitted for atelier review.`,
      order: updated,
    };
  });
}

/**
 * Store administrator reviews a cancellation request for a paid order.
 */
export async function reviewOrderCancellation(input: ReviewCancellationInput) {
  const { orderId, decision, adminNotes } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }

    if (order.status === "CANCELLED") {
      throw new Error(`Order ${order.orderNumber} is already cancelled.`);
    }

    if (order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED") {
      throw new Error(
        `Cannot cancel order ${order.orderNumber} because it is already ${order.fulfillmentStatus}.`
      );
    }

    if (decision === "REJECTED") {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          cancellationRequested: false,
          notes: `${order.notes ? `${order.notes}\n` : ""}[Cancellation Rejected on ${new Date().toISOString()}]: ${adminNotes || "Request declined by atelier director."}`,
        },
      });

      if (order.userId) {
        await notifyCancellationDecision(order.id, order.userId, order.orderNumber, "REJECTED", adminNotes);
      }

      return {
        success: true,
        decision: "REJECTED",
        order: updated,
      };
    }

    // Decision === "APPROVED"
    // Restore variant inventory and log audit movements
    for (const item of order.items) {
      if (!item.variantId) continue;
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (variant) {
        const previousStock = variant.stock;
        const newStock = previousStock + item.quantity;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            quantityChange: item.quantity,
            previousStock,
            newStock,
            type: "RELEASE",
            reason: `Cancellation approved for Order ${order.orderNumber}: ${adminNotes || order.cancellationReason || "Atelier approval"}`,
            reference: order.id,
          },
        });
      }
    }

    // Transition order: requires manual refund workflow
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        cancellationRequested: false,
        cancelReason: adminNotes || order.cancellationReason || "Cancellation approved by store administration",
        cancelledAt: new Date(),
        refundRequired: order.paymentStatus === "PAID",
        refundAmountInCents: order.paymentStatus === "PAID" ? order.totalInCents : null,
        refundReason: order.paymentStatus === "PAID" ? "Customer order cancellation" : null,
        notes: `${order.notes ? `${order.notes}\n` : ""}[Cancellation Approved on ${new Date().toISOString()}]: Stock restored. Flagged for refund of ${order.totalInCents} cents.`,
      },
    });

    if (order.userId) {
      await notifyCancellationDecision(order.id, order.userId, order.orderNumber, "APPROVED", adminNotes);
    }

    return {
      success: true,
      decision: "APPROVED",
      refundRequired: order.paymentStatus === "PAID",
      order: updated,
    };
  });
}
