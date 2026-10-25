import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createStockReservations,
  confirmReservations,
  releaseReservations,
  releaseExpiredReservations,
} from "./reservation.service";

describe("Stock Reservation Lifecycle Service", () => {
  let testProductId: string;
  let testVariantId: string;
  let testOrderId: string;
  const initialStock = 10;

  beforeAll(async () => {
    // 1. Create dedicated test product and variant
    const product = await prisma.product.create({
      data: {
        title: `Reservation Test Watch ${Date.now()}`,
        slug: `reservation-test-watch-${Date.now()}`,
        description: "Testing stock reservation lifecycle",
        category: "Watches",
        basePriceInCents: 150000,
        published: true,
        variants: {
          create: {
            sku: `RES-TEST-${Date.now()}`,
            title: "Rose Gold",
            priceInCents: 150000,
            stock: initialStock,
          },
        },
      },
      include: { variants: true },
    });

    testProductId = product.id;
    testVariantId = product.variants[0].id;

    // 2. Create test order
    const order = await prisma.order.create({
      data: {
        orderNumber: `NXR-TEST-${Date.now()}`,
        status: "PENDING",
        subtotalInCents: 150000,
        totalInCents: 150000,
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.stockReservation.deleteMany({ where: { orderId: testOrderId } });
    await prisma.inventoryMovement.deleteMany({ where: { variantId: testVariantId } });
    await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
    await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
    await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
  });

  it("should successfully reserve stock, decrement variant stock, and log an auditable RESERVATION movement", async () => {
    const reserveQty = 3;
    const reservations = await createStockReservations(
      testOrderId,
      [{ variantId: testVariantId, quantity: reserveQty }],
      20
    );

    expect(reservations.length).toBe(1);
    expect(reservations[0].quantity).toBe(reserveQty);
    expect(reservations[0].status).toBe("PENDING");

    // Verify database stock decremented
    const variant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variant?.stock).toBe(initialStock - reserveQty);

    // Verify inventory movement
    const movement = await prisma.inventoryMovement.findFirst({
      where: { variantId: testVariantId, type: "RESERVATION" },
      orderBy: { createdAt: "desc" },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityChange).toBe(-reserveQty);
    expect(movement?.previousStock).toBe(initialStock);
    expect(movement?.newStock).toBe(initialStock - reserveQty);
  });

  it("should reject reservation requests that exceed remaining available stock", async () => {
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    const currentStock = currentVariant!.stock;

    await expect(
      createStockReservations(
        testOrderId,
        [{ variantId: testVariantId, quantity: currentStock + 5 }],
        20
      )
    ).rejects.toThrow(/Insufficient stock/);

    // Verify stock remains untouched
    const afterAttempt = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(afterAttempt?.stock).toBe(currentStock);
  });

  it("should confirm reservations upon verified payment without double-deduction", async () => {
    const preConfirm = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });

    const result = await confirmReservations(testOrderId);
    expect(result.count).toBeGreaterThan(0);

    // Verify reservation marked CONFIRMED
    const updatedRes = await prisma.stockReservation.findFirst({
      where: { orderId: testOrderId },
    });
    expect(updatedRes?.status).toBe("CONFIRMED");
    expect(updatedRes?.confirmedAt).toBeInstanceOf(Date);

    // Stock must remain unchanged (no double deduction)
    const postConfirm = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(postConfirm?.stock).toBe(preConfirm?.stock);
  });

  it("should release reservations upon cancellation, restore stock, and prevent duplicate releases", async () => {
    const preRelease = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });

    // 1. Release reservations
    const releaseResult = await releaseReservations(testOrderId, "Client cancellation test");
    expect(releaseResult.releasedCount).toBe(1);

    // Stock should be restored
    const postRelease = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(postRelease?.stock).toBe(preRelease!.stock + 3);

    // Audit movement with type RELEASE logged
    const movement = await prisma.inventoryMovement.findFirst({
      where: { variantId: testVariantId, type: "RELEASE" },
      orderBy: { createdAt: "desc" },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityChange).toBe(3);

    // 2. Idempotency test: Re-releasing must NOT duplicate stock restoration
    const duplicateRelease = await releaseReservations(testOrderId, "Second release attempt");
    expect(duplicateRelease.releasedCount).toBe(0);

    const postDuplicateStock = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(postDuplicateStock?.stock).toBe(postRelease?.stock);
  });

  it("should automatically recover expired reservations, restore stock, and cancel abandoned orders", async () => {
    // 1. Create a dummy order and an already expired reservation
    const expiredOrder = await prisma.order.create({
      data: {
        orderNumber: `NXR-EXPIRED-${Date.now()}`,
        status: "PENDING",
        subtotalInCents: 50000,
        totalInCents: 50000,
      },
    });

    const qtyToReserve = 2;
    // Decrement stock as reservation creation does
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stock: { decrement: qtyToReserve } },
    });

    const stockBeforeSweeper = (await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    }))!.stock;

    // Create a reservation with expiresAt in the past
    await prisma.stockReservation.create({
      data: {
        orderId: expiredOrder.id,
        variantId: testVariantId,
        quantity: qtyToReserve,
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
      },
    });

    // 2. Run the sweeper
    const sweeperResult = await releaseExpiredReservations();
    expect(sweeperResult.expiredCount).toBeGreaterThanOrEqual(1);

    // 3. Stock must be restored
    const stockAfterSweeper = (await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    }))!.stock;
    expect(stockAfterSweeper).toBe(stockBeforeSweeper + qtyToReserve);

    // 4. Order status must transition to CANCELLED
    const cancelledOrder = await prisma.order.findUnique({
      where: { id: expiredOrder.id },
    });
    expect(cancelledOrder?.status).toBe("CANCELLED");
    expect(cancelledOrder?.cancelReason).toContain("Stock reservation expired");

    // Cleanup
    await prisma.stockReservation.deleteMany({ where: { orderId: expiredOrder.id } });
    await prisma.order.delete({ where: { id: expiredOrder.id } });
  });
});
