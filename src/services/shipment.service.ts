import { prisma } from "@/lib/prisma";
import type { ShipmentStatus, FulfillmentStatus, OrderStatus } from "@prisma/client";
import { notifyOrderShipped, notifyOrderDelivered } from "./notification.service";

export interface UpdateShipmentInput {
  orderId: string;
  businessId?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: ShipmentStatus;
  dispatchedAt?: Date | null;
  estimatedDelivery?: Date | null;
  deliveredAt?: Date | null;
  notes?: string;
}

/**
 * Validates tracking URL to reject unsafe protocols (e.g. javascript:, data:, vbscript:).
 */
export function validateTrackingUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid tracking URL format. Must be a well-formed HTTP/HTTPS URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Invalid tracking link protocol. Only HTTP and HTTPS links are permitted.");
  }

  return trimmed;
}

/**
 * Updates or creates shipment tracking information for an order.
 * Validates order payment state and synchronizes order status with fulfillment progression.
 */
export async function updateOrderShipment(input: UpdateShipmentInput) {
  const { orderId } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        shipments: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }

    if (input.businessId && order.businessId && order.businessId !== input.businessId) {
      throw new Error("Access denied: Order does not belong to the active business.");
    }

    if (order.status === "CANCELLED") {
      throw new Error(`Cannot dispatch shipment for cancelled order ${order.orderNumber}.`);
    }

    if (order.paymentStatus !== "PAID") {
      throw new Error(
        `Cannot dispatch shipment for order ${order.orderNumber}: Payment is unverified (status: "${order.paymentStatus}").`
      );
    }

    const validTrackingUrl = input.trackingUrl !== undefined
      ? validateTrackingUrl(input.trackingUrl)
      : undefined;

    const existingShipment = order.shipments[0];
    const newStatus = input.status ?? existingShipment?.status ?? "IN_TRANSIT";

    let shipment;
    if (existingShipment) {
      shipment = await tx.shipment.update({
        where: { id: existingShipment.id },
        data: {
          carrier: input.carrier ?? existingShipment.carrier,
          trackingNumber: input.trackingNumber ?? existingShipment.trackingNumber,
          trackingUrl: validTrackingUrl !== undefined ? validTrackingUrl : existingShipment.trackingUrl,
          status: newStatus,
          notes: input.notes !== undefined ? input.notes : existingShipment.notes,
          dispatchedAt: input.dispatchedAt !== undefined ? input.dispatchedAt : existingShipment.dispatchedAt,
          estimatedDelivery: input.estimatedDelivery !== undefined ? input.estimatedDelivery : existingShipment.estimatedDelivery,
          deliveredAt: input.deliveredAt !== undefined ? input.deliveredAt : existingShipment.deliveredAt,
          shippedAt: newStatus === "IN_TRANSIT" && !existingShipment.shippedAt ? new Date() : existingShipment.shippedAt,
        },
      });
    } else {
      shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: input.carrier || "Boutique Courier",
          trackingNumber: input.trackingNumber || null,
          trackingUrl: validTrackingUrl || null,
          status: newStatus,
          notes: input.notes || null,
          dispatchedAt: input.dispatchedAt || (newStatus === "IN_TRANSIT" ? new Date() : null),
          estimatedDelivery: input.estimatedDelivery || null,
          deliveredAt: input.deliveredAt || null,
          shippedAt: newStatus === "IN_TRANSIT" ? new Date() : null,
        },
      });
    }

    // Determine corresponding OrderStatus and FulfillmentStatus
    let targetOrderStatus: OrderStatus = order.status;
    let targetFulfillmentStatus: FulfillmentStatus = order.fulfillmentStatus;

    if (newStatus === "PACKED") {
      targetFulfillmentStatus = "PACKED";
      if (order.status === "PROCESSING" || order.status === "PAID") {
        targetOrderStatus = "PACKED";
      }
    } else if (newStatus === "IN_TRANSIT") {
      targetFulfillmentStatus = "SHIPPED";
      targetOrderStatus = "SHIPPED";
    } else if (newStatus === "DELIVERED") {
      targetFulfillmentStatus = "DELIVERED";
      targetOrderStatus = "DELIVERED";
    }

    if (targetOrderStatus !== order.status || targetFulfillmentStatus !== order.fulfillmentStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetOrderStatus,
          fulfillmentStatus: targetFulfillmentStatus,
        },
      });
    }

    // Trigger transactional notifications on dispatch or delivery
    if (order.userId) {
      if (newStatus === "IN_TRANSIT" && (!existingShipment || existingShipment.status !== "IN_TRANSIT")) {
        await notifyOrderShipped(
          order.id,
          order.userId,
          order.orderNumber,
          shipment.carrier || "Boutique Courier",
          shipment.trackingNumber || undefined,
          shipment.trackingUrl || undefined
        );
      } else if (newStatus === "DELIVERED" && (!existingShipment || existingShipment.status !== "DELIVERED")) {
        await notifyOrderDelivered(order.id, order.userId, order.orderNumber);
      }
    }

    return shipment;
  });
}

/**
 * Computes a luxury multi-step fulfillment and delivery timeline for customer tracking.
 */
export function computeOrderDeliveryTimeline(order: {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date;
  paidAt?: Date | null;
  shipments?: Array<{
    status: ShipmentStatus;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: Date | null;
    dispatchedAt?: Date | null;
    deliveredAt?: Date | null;
    estimatedDelivery?: Date | null;
  }>;
}) {
  const shipment = order.shipments?.[0];

  const steps = [
    {
      id: "ORDER_PLACED",
      title: "Order Placed",
      description: "Order reserved and registered in the atelier database.",
      completed: true,
      current: order.status === "PENDING" || order.status === "AWAITING_PAYMENT",
      date: order.createdAt,
    },
    {
      id: "PAYMENT_CONFIRMED",
      title: "Payment Confirmed",
      description: "Gateway payment authorization verified by treasury.",
      completed: !!order.paidAt,
      current: order.status === "PAID" && order.fulfillmentStatus === "UNFULFILLED",
      date: order.paidAt || null,
    },
    {
      id: "PROCESSING",
      title: "Bespoke Preparation",
      description: "Craftspeople at the atelier prepare your order.",
      completed:
        order.fulfillmentStatus === "PROCESSING" ||
        order.fulfillmentStatus === "PACKED" ||
        order.fulfillmentStatus === "SHIPPED" ||
        order.fulfillmentStatus === "DELIVERED",
      current: order.fulfillmentStatus === "PROCESSING",
      date: null,
    },
    {
      id: "PACKED",
      title: "Quality Inspection & Packed",
      description: "Rigorous quality review and bespoke packaging.",
      completed:
        order.fulfillmentStatus === "PACKED" ||
        order.fulfillmentStatus === "SHIPPED" ||
        order.fulfillmentStatus === "DELIVERED",
      current: order.fulfillmentStatus === "PACKED",
      date: null,
    },
    {
      id: "DISPATCHED",
      title: "Dispatched with Courier",
      description: shipment?.carrier
        ? `In transit with ${shipment.carrier}${shipment.trackingNumber ? ` (${shipment.trackingNumber})` : ""}.`
        : "Dispatched with boutique logistics partner.",
      completed:
        order.fulfillmentStatus === "SHIPPED" ||
        order.fulfillmentStatus === "DELIVERED",
      current: order.fulfillmentStatus === "SHIPPED",
      date: shipment?.shippedAt || shipment?.dispatchedAt || null,
      trackingUrl: shipment?.trackingUrl,
    },
    {
      id: "DELIVERED",
      title: "Safely Delivered",
      description: "Consignment safely delivered to client address.",
      completed: order.fulfillmentStatus === "DELIVERED",
      current: order.fulfillmentStatus === "DELIVERED",
      date: shipment?.deliveredAt || null,
    },
  ];

  return {
    carrier: shipment?.carrier || null,
    trackingNumber: shipment?.trackingNumber || null,
    trackingUrl: shipment?.trackingUrl || null,
    estimatedDelivery: shipment?.estimatedDelivery || null,
    steps,
  };
}
