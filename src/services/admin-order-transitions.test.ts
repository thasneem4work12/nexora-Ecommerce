import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateAdminOrderStatus, updateOrderShipment } from "./admin-order.service";

describe("Order & Payment State Machine Transitions (Fulfillment Security Guard)", () => {
  let unpaidOrderId: string;
  let cancelledOrderId: string;
  let paidOrderId: string;

  beforeAll(async () => {
    // 1. Unpaid order
    const unpaid = await prisma.order.create({
      data: {
        orderNumber: `NXR-TRANS-UNPAID-${Date.now()}`,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotalInCents: 150000,
        totalInCents: 150000,
        currency: "USD",
        guestEmail: "unpaid@nexora.com",
      },
    });
    unpaidOrderId = unpaid.id;

    // 2. Cancelled order
    const cancelled = await prisma.order.create({
      data: {
        orderNumber: `NXR-TRANS-CANC-${Date.now()}`,
        status: "CANCELLED",
        paymentStatus: "UNPAID",
        cancelReason: "Cancelled by patron",
        subtotalInCents: 150000,
        totalInCents: 150000,
        currency: "USD",
        guestEmail: "cancelled@nexora.com",
      },
    });
    cancelledOrderId = cancelled.id;

    // 3. Paid order
    const paid = await prisma.order.create({
      data: {
        orderNumber: `NXR-TRANS-PAID-${Date.now()}`,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalInCents: 150000,
        totalInCents: 150000,
        currency: "USD",
        guestEmail: "paid@nexora.com",
        paidAt: new Date(),
      },
    });
    paidOrderId = paid.id;
  });

  afterAll(async () => {
    await prisma.shipment.deleteMany({
      where: { orderId: { in: [unpaidOrderId, cancelledOrderId, paidOrderId] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [unpaidOrderId, cancelledOrderId, paidOrderId] } },
    });
  });

  it("should prevent an unpaid order from being advanced to PROCESSING, SHIPPED, or DELIVERED", async () => {
    await expect(
      updateAdminOrderStatus(unpaidOrderId, "PROCESSING", "Attempting fulfillment before payment")
    ).rejects.toThrow(/because payment status is "UNPAID"/);

    await expect(
      updateAdminOrderStatus(unpaidOrderId, "SHIPPED", "Attempting dispatch before payment")
    ).rejects.toThrow(/because payment status is "UNPAID"/);

    await expect(
      updateAdminOrderStatus(unpaidOrderId, "DELIVERED", "Attempting delivery before payment")
    ).rejects.toThrow(/because payment status is "UNPAID"/);
  });

  it("should prevent a cancelled order from being reopened or advanced to fulfillment", async () => {
    await expect(
      updateAdminOrderStatus(cancelledOrderId, "PROCESSING", "Attempting to fulfill cancelled order")
    ).rejects.toThrow(/Cancelled order .* cannot be moved to "PROCESSING"/);

    await expect(
      updateAdminOrderStatus(cancelledOrderId, "SHIPPED", "Attempting to ship cancelled order")
    ).rejects.toThrow(/Cancelled order .* cannot be moved to "SHIPPED"/);

    await expect(
      updateAdminOrderStatus(cancelledOrderId, "PAID", "Attempting to mark cancelled order as paid")
    ).rejects.toThrow(/Cancelled order .* cannot be moved to "PAID"/);
  });

  it("should reject recording a courier shipment on an unpaid order", async () => {
    await expect(
      updateOrderShipment(unpaidOrderId, {
        carrier: "FedEx International",
        trackingNumber: "FX-123456789",
      })
    ).rejects.toThrow(/Payment is unverified \(status: "UNPAID"\)/);
  });

  it("should reject recording a courier shipment on a cancelled order", async () => {
    await expect(
      updateOrderShipment(cancelledOrderId, {
        carrier: "FedEx International",
        trackingNumber: "FX-123456789",
      })
    ).rejects.toThrow(/Cannot (record|dispatch) shipment/);
  });

  it("should allow legitimate status progression on verified paid orders", async () => {
    const updated = await updateAdminOrderStatus(
      paidOrderId,
      "PROCESSING",
      "Piece assigned to master tailor"
    );
    expect(updated.status).toBe("PROCESSING");

    const shipment = await updateOrderShipment(paidOrderId, {
      carrier: "DHL Priority",
      trackingNumber: `DHL-${Date.now()}`,
      notes: "Sealed velvet courier box",
    });
    expect(shipment).toBeDefined();

    const orderAfterShipment = await prisma.order.findUnique({ where: { id: paidOrderId } });
    expect(orderAfterShipment?.status).toBe("SHIPPED");

    const delivered = await updateAdminOrderStatus(
      paidOrderId,
      "DELIVERED",
      "Delivered with concierge signature"
    );
    expect(delivered.status).toBe("DELIVERED");
  });
});
