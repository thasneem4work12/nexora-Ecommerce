import { prisma } from "@/lib/prisma";
import type { ReturnStatus, RefundStatus } from "@prisma/client";
import { notifyReturnDecision } from "./notification.service";

export interface CreateReturnRequestInput {
  orderId: string;
  orderItemId?: string;
  userId: string;
  requestedQuantity: number;
  reason: string;
}

export interface ReviewReturnRequestInput {
  returnRequestId: string;
  adminUserId: string;
  status: ReturnStatus;
  adminNotes?: string;
  resolutionNotes?: string;
  refundStatus?: RefundStatus;
  refundAmountInCents?: number;
  restockInventory?: boolean;
  businessId?: string;
}

/**
 * Creates a return request for a delivered order.
 * Validates customer ownership and checks that requested quantity does not exceed purchased item quantity.
 */
export async function createReturnRequest(input: CreateReturnRequestInput) {
  const { orderId, orderItemId, userId, requestedQuantity, reason } = input;

  if (requestedQuantity <= 0) {
    throw new Error("Return quantity must be at least 1.");
  }

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

    // Verify customer ownership
    if (order.userId !== userId) {
      throw new Error("Unauthorized: You can only request returns for your own orders.");
    }

    // Order must be DELIVERED to request a return
    if (order.status !== "DELIVERED" && order.fulfillmentStatus !== "DELIVERED") {
      throw new Error(
        `Returns are only permitted for delivered orders. Current order status: "${order.status}".`
      );
    }

    // Validate item and quantity if an orderItemId is specified
    let selectedItem = null;
    if (orderItemId) {
      selectedItem = order.items.find((item) => item.id === orderItemId);
      if (!selectedItem) {
        throw new Error(`Order item ${orderItemId} does not belong to order ${order.orderNumber}.`);
      }
      if (requestedQuantity > selectedItem.quantity) {
        throw new Error(
          `Requested return quantity (${requestedQuantity}) exceeds purchased quantity (${selectedItem.quantity}).`
        );
      }
    }

    // Check existing non-rejected return requests to prevent cumulative over-return
    const existingReturns = await tx.returnRequest.findMany({
      where: {
        orderId: order.id,
        orderItemId: orderItemId || undefined,
        status: { in: ["PENDING", "APPROVED", "COMPLETED"] },
      },
    });

    const alreadyReturnedQty = existingReturns.reduce((sum, r) => sum + r.requestedQuantity, 0);
    const maxAllowedQty = selectedItem
      ? selectedItem.quantity
      : order.items.reduce((sum, item) => sum + item.quantity, 0);

    if (alreadyReturnedQty + requestedQuantity > maxAllowedQty) {
      throw new Error(
        `Cannot return ${requestedQuantity} item(s). You have already submitted return requests for ${alreadyReturnedQty} of ${maxAllowedQty} eligible pieces.`
      );
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const returnRequest = await tx.returnRequest.create({
      data: {
        businessId: order.businessId,
        returnNumber,
        orderId: order.id,
        orderItemId: orderItemId || null,
        userId,
        requestedQuantity,
        reason,
        status: "PENDING",
        refundStatus: "NONE",
      },
    });

    // Update order status to RETURN_REQUESTED if not already returned
    if (order.status === "DELIVERED") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "RETURN_REQUESTED" },
      });
    }

    return returnRequest;
  });
}

/**
 * Reviews a return request (approves, rejects, or completes inspection).
 * If completed and restockInventory is true, restores variant inventory via an audit movement.
 */
export async function reviewReturnRequest(input: ReviewReturnRequestInput) {
  const {
    returnRequestId,
    adminUserId,
    status,
    adminNotes,
    resolutionNotes,
    refundStatus,
    refundAmountInCents,
    restockInventory = true,
    businessId,
  } = input;

  return await prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        orderItem: true,
      },
    });

    if (!returnRequest) {
      throw new Error(`Return request not found with ID: ${returnRequestId}`);
    }

    if (businessId && returnRequest.businessId !== businessId && returnRequest.order.businessId !== businessId) {
      throw new Error("Access denied: Return request does not belong to the active business.");
    }

    // Restock inventory if completing return
    if (status === "COMPLETED" && returnRequest.status !== "COMPLETED" && restockInventory) {
      const variantId = returnRequest.orderItem?.variantId;
      if (variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
        if (variant) {
          const previousStock = variant.stock;
          const newStock = previousStock + returnRequest.requestedQuantity;

          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock },
          });

          await tx.inventoryMovement.create({
            data: {
              businessId: returnRequest.businessId || returnRequest.order.businessId,
              variantId: variant.id,
              quantityChange: returnRequest.requestedQuantity,
              previousStock,
              newStock,
              type: "RETURN",
              reason: `Returned goods restocked for ${returnRequest.returnNumber} (Order ${returnRequest.order.orderNumber}): ${resolutionNotes || "Inspected and accepted"}`,
              reference: returnRequest.id,
              userId: adminUserId,
            },
          });
        }
      }

      // Update order fulfillment status to RETURNED if all items returned
      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: {
          status: "RETURNED",
          fulfillmentStatus: "RETURNED",
          refundRequired: refundStatus === "PENDING_MANUAL_REVIEW" || refundStatus === "PROCESSED",
          refundAmountInCents: refundAmountInCents ?? returnRequest.refundAmountInCents ?? null,
          refundReason: "Customer return accepted",
        },
      });
    }

    const updated = await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status,
        adminNotes: adminNotes !== undefined ? adminNotes : returnRequest.adminNotes,
        resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : returnRequest.resolutionNotes,
        refundStatus: refundStatus !== undefined ? refundStatus : returnRequest.refundStatus,
        refundAmountInCents: refundAmountInCents !== undefined ? refundAmountInCents : returnRequest.refundAmountInCents,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
      },
    });

    if (returnRequest.userId) {
      await notifyReturnDecision(
        returnRequest.orderId,
        returnRequest.userId,
        returnRequest.order.orderNumber,
        status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "COMPLETED",
        resolutionNotes || adminNotes
      );
    }

    return updated;
  });
}

/**
 * Reconciles a manual refund for an order or return request.
 * Documents the manual bank transfer / gateway reversal reference without faking external automation.
 */
export async function recordManualRefund(params: {
  orderId: string;
  adminUserId: string;
  refundAmountInCents: number;
  reconciliationReference: string;
  notes?: string;
  businessId?: string;
}) {
  const { orderId, adminUserId, refundAmountInCents, reconciliationReference, notes, businessId } = params;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }

    if (businessId && order.businessId !== businessId) {
      throw new Error("Access denied: Order does not belong to the active business.");
    }

    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED") {
      throw new Error(`Cannot refund order with payment status: "${order.paymentStatus}".`);
    }

    if (refundAmountInCents > order.totalInCents) {
      throw new Error(
        `Refund amount (${refundAmountInCents} cents) cannot exceed order total (${order.totalInCents} cents).`
      );
    }

    // Update order
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "REFUNDED",
        status: order.status === "RETURNED" || order.status === "CANCELLED" ? order.status : "REFUNDED",
        refundRequired: false,
        refundAmountInCents,
        refundReason: notes || "Manual refund reconciled by store management",
        refundedAt: new Date(),
        notes: `${order.notes ? `${order.notes}\n` : ""}[Manual Refund Reconciled on ${new Date().toISOString()} by ${adminUserId}]: Amount: ${refundAmountInCents} cents. Reference: ${reconciliationReference}.`,
      },
    });

    // Update return requests if pending
    await tx.returnRequest.updateMany({
      where: { orderId: order.id, refundStatus: "PENDING_MANUAL_REVIEW" },
      data: {
        refundStatus: "PROCESSED",
        resolutionNotes: `Manual refund reconciled: Ref ${reconciliationReference}`,
      },
    });

    return updated;
  });
}

/**
 * Queries return requests with filters and pagination for admin and customer views.
 */
export async function getReturnRequests(params: {
  userId?: string;
  orderId?: string;
  status?: ReturnStatus;
  page?: number;
  limit?: number;
  businessId?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 10));
  const skip = (page - 1) * limit;

  const where = {
    userId: params.userId || undefined,
    orderId: params.orderId || undefined,
    status: params.status || undefined,
    businessId: params.businessId || undefined,
  };

  const [total, returns] = await prisma.$transaction([
    prisma.returnRequest.count({ where }),
    prisma.returnRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { id: true, orderNumber: true, totalInCents: true, status: true } },
        orderItem: true,
        user: { select: { id: true, name: true, email: true } },
        reviewedByUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
