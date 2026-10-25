import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  adjustStock,
  getInventoryItems,
  getInventoryMovements,
  setLowStockThreshold,
} from "./inventory.service";

describe("Inventory Service (PostgreSQL Audited Stock Operations)", () => {
  let adminUserId: string;
  let testVariantId: string;
  let initialStock: number;

  beforeAll(async () => {
    // 1. Locate the bootstrapped owner or create a test admin user
    let admin = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "MANAGER", "SUPERADMIN"] } },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          id: `test-admin-${Date.now()}`,
          name: "Test Atelier Director",
          email: `director-${Date.now()}@nexoracommerce.com`,
          emailVerified: true,
          role: "OWNER",
        },
      });
    }
    adminUserId = admin.id;

    // 2. Locate an active variant
    const variant = await prisma.productVariant.findFirst({
      where: { product: { isArchived: false } },
    });

    if (!variant) {
      throw new Error("No active product variant found in database for testing.");
    }

    testVariantId = variant.id;
    initialStock = variant.stock;
  });

  it("should successfully adjust stock positively and record an audited movement", async () => {
    const delta = 5;
    const result = await adjustStock({
      variantId: testVariantId,
      delta,
      type: "RESTOCK",
      reason: "Atelier replenishment shipment #IT-9821",
      reference: "PO-9821",
      adminId: adminUserId,
    });

    expect(result.variant.stock).toBe(initialStock + delta);
    expect(result.movement).toBeDefined();
    expect(result.movement.quantityChange).toBe(delta);
    expect(result.movement.previousStock).toBe(initialStock);
    expect(result.movement.newStock).toBe(initialStock + delta);
    expect(result.movement.type).toBe("RESTOCK");
    expect(result.movement.reason).toBe("Atelier replenishment shipment #IT-9821");
    expect(result.movement.userId).toBe(adminUserId);

    // Verify in database
    const dbVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(dbVariant?.stock).toBe(initialStock + delta);

    initialStock = dbVariant!.stock;
  });

  it("should successfully adjust stock negatively and record an audited movement", async () => {
    const delta = -2;
    const result = await adjustStock({
      variantId: testVariantId,
      delta,
      type: "DAMAGED",
      reason: "Minor fabric flaw identified during showroom QC",
      adminId: adminUserId,
    });

    expect(result.variant.stock).toBe(initialStock + delta);
    expect(result.movement.quantityChange).toBe(-2);
    expect(result.movement.previousStock).toBe(initialStock);
    expect(result.movement.newStock).toBe(initialStock + delta);
    expect(result.movement.type).toBe("DAMAGED");

    initialStock = result.variant.stock;
  });

  it("should strictly reject stock reductions that would cause negative inventory", async () => {
    // Attempting to decrement by more than the available stock
    const excessiveDecrement = -(initialStock + 50);

    await expect(
      adjustStock({
        variantId: testVariantId,
        delta: excessiveDecrement,
        type: "MANUAL_CORRECTION",
        reason: "Over-decrement test",
        adminId: adminUserId,
      })
    ).rejects.toThrow(/Insufficient inventory.*Stock cannot be negative/);

    // Verify stock was NOT altered in database
    const dbVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(dbVariant?.stock).toBe(initialStock);
  });

  it("should reject adjustments with delta of zero", async () => {
    await expect(
      adjustStock({
        variantId: testVariantId,
        delta: 0,
        type: "MANUAL_CORRECTION",
        reason: "Zero delta test",
        adminId: adminUserId,
      })
    ).rejects.toThrow("Adjustment delta cannot be zero.");
  });

  it("should reject adjustments without a mandatory audit reason", async () => {
    await expect(
      adjustStock({
        variantId: testVariantId,
        delta: 1,
        type: "RESTOCK",
        reason: "   ",
        adminId: adminUserId,
      })
    ).rejects.toThrow("An audit reason must be provided");
  });

  it("should update low stock threshold correctly", async () => {
    const newThreshold = 8;
    const updated = await setLowStockThreshold(testVariantId, newThreshold);

    expect(updated.lowStockThreshold).toBe(newThreshold);

    const dbVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(dbVariant?.lowStockThreshold).toBe(newThreshold);
  });

  it("should retrieve inventory items with computed low stock and out of stock flags", async () => {
    const inventory = await getInventoryItems({ limit: 50 });

    expect(inventory.items.length).toBeGreaterThan(0);
    expect(inventory.pagination.total).toBeGreaterThan(0);

    const targetItem = inventory.items.find((i) => i.id === testVariantId);
    expect(targetItem).toBeDefined();
    expect(targetItem?.stock).toBe(initialStock);
    expect(typeof targetItem?.isLowStock).toBe("boolean");
    expect(typeof targetItem?.isOutOfStock).toBe("boolean");
  });

  it("should retrieve historical audit movements with user details", async () => {
    const history = await getInventoryMovements({ variantId: testVariantId });

    expect(history.movements.length).toBeGreaterThanOrEqual(2);
    const latest = history.movements[0];
    expect(latest.variantId).toBe(testVariantId);
    expect(latest.user).toBeDefined();
    expect(latest.user?.id).toBe(adminUserId);
  });
});
