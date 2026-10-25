import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateOrderShipment,
  getAdminOrderMetrics,
} from "./admin-order.service";

describe("Admin Order Service (Fulfillment, Logistics & Metrics)", () => {
  let testOrderId: string;
  let testOrderNumber: string;

  beforeAll(async () => {
    testOrderNumber = `NXR-ADM-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalInCents: 450000,
        shippingInCents: 4500,
        taxInCents: 22500,
        totalInCents: 477000,
        currency: "USD",
        guestEmail: "director-client@nexora.com",
        guestName: "Lady Genevieve",
        paidAt: new Date(),
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    await prisma.shipment.deleteMany({ where: { orderId: testOrderId } });
    await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
  });

  it("should retrieve paginated orders with search and status filters", async () => {
    const result = await getAdminOrders({
      search: testOrderNumber,
      limit: 10,
    });

    expect(result.orders.length).toBe(1);
    expect(result.orders[0].id).toBe(testOrderId);
    expect(result.orders[0].orderNumber).toBe(testOrderNumber);
    expect(result.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("should retrieve complete order details by ID for the admin editor", async () => {
    const order = await getAdminOrderById(testOrderId);

    expect(order).toBeDefined();
    expect(order?.id).toBe(testOrderId);
    expect(order?.totalInCents).toBe(477000);
  });

  it("should update permitted fulfillment states (e.g. PAID -> PROCESSING)", async () => {
    const updated = await updateAdminOrderStatus(
      testOrderId,
      "PROCESSING",
      "Gown moved to tailoring atelier workshop"
    );

    expect(updated.status).toBe("PROCESSING");
    expect(updated.notes).toContain("Gown moved to tailoring");
  });

  it("should strictly reject fraudulently marking an unpaid order as PAID", async () => {
    const unpaidOrder = await prisma.order.create({
      data: {
        orderNumber: `NXR-UNPAID-${Date.now()}`,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotalInCents: 100000,
        totalInCents: 100000,
      },
    });

    try {
      await expect(
        updateAdminOrderStatus(unpaidOrder.id, "PAID", "Manual director override")
      ).rejects.toThrow(
        /Orders cannot be manually marked as PAID without a verified payment gateway transaction/
      );
    } finally {
      await prisma.order.delete({ where: { id: unpaidOrder.id } });
    }
  });

  it("should record shipment logistics, save tracking number, and auto-advance status to SHIPPED", async () => {
    const tracking = `DHL-EXPRESS-${Date.now()}`;
    const shipment = await updateOrderShipment(testOrderId, {
      carrier: "DHL Express",
      trackingNumber: tracking,
      notes: "High value security pouch with diplomatic wax seal",
    });

    expect(shipment).toBeDefined();
    expect(shipment.carrier).toBe("DHL Express");
    expect(shipment.trackingNumber).toBe(tracking);

    // Order status should have transitioned to SHIPPED
    const refreshed = await getAdminOrderById(testOrderId);
    expect(refreshed?.status).toBe("SHIPPED");
    expect(refreshed?.shipments.length).toBeGreaterThan(0);
  });

  it("should compute accurate high-level administrative order metrics", async () => {
    const metrics = await getAdminOrderMetrics();

    expect(metrics.totalOrders).toBeGreaterThan(0);
    expect(metrics.paidOrders).toBeGreaterThan(0);
    expect(metrics.totalRevenueInCents).toBeGreaterThan(0);
    expect(typeof metrics.pendingFulfillment).toBe("number");
    expect(typeof metrics.shippedOrders).toBe("number");
  });
});
