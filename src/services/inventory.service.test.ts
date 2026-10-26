import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
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

    // 2. Locate an active variant in default business
    const variant = await prisma.productVariant.findFirst({
      where: { product: { businessId: DEFAULT_BUSINESS_ID, isArchived: false } },
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

  it("should safely handle concurrent simultaneous stock reductions with row-level locking without going negative or corrupting the audit ledger", async () => {
    // Setup isolated test product and variant with exactly 1 unit of stock
    const uniqueId = Date.now();
    const isolatedProduct = await prisma.product.create({
      data: {
        title: `Concurrency Test Product ${uniqueId}`,
        slug: `concurrency-test-${uniqueId}`,
        description: "PostgreSQL row locking verification under high contention",
        category: "Test",
        basePriceInCents: 50000,
        published: true,
        variants: {
          create: {
            sku: `CONCURRENCY-SKU-${uniqueId}`,
            title: "Limited Edition - Single Item",
            priceInCents: 50000,
            stock: 1, // Only 1 item in stock
          },
        },
      },
      include: { variants: true },
    });

    const isolatedVariant = isolatedProduct.variants[0];

    try {
      // Fire two simultaneous stock reductions of -1 at the exact same instant
      const [res1, res2] = await Promise.allSettled([
        adjustStock({
          variantId: isolatedVariant.id,
          delta: -1,
          type: "ADJUSTMENT",
          reason: "Simultaneous Checkout Order Alpha",
          reference: "ORD-ALPHA",
          adminId: adminUserId,
        }),
        adjustStock({
          variantId: isolatedVariant.id,
          delta: -1,
          type: "ADJUSTMENT",
          reason: "Simultaneous Checkout Order Beta",
          reference: "ORD-BETA",
          adminId: adminUserId,
        }),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
      const rejected = [res1, res2].filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      // Exactly ONE request must succeed, and exactly ONE must fail
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // The rejected request must be blocked by the concurrency guard with clear error
      expect(rejected[0].reason.message).toMatch(
        /Insufficient inventory.*Stock cannot be negative/
      );

      // Verify that database stock is exactly 0 and NEVER dropped into negative values
      const updatedVariant = await prisma.productVariant.findUnique({
        where: { id: isolatedVariant.id },
      });
      expect(updatedVariant?.stock).toBe(0);

      // Verify that the audit ledger contains exactly 1 entry for this stock reduction
      const movements = await prisma.inventoryMovement.findMany({
        where: { variantId: isolatedVariant.id },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].quantityChange).toBe(-1);
      expect(movements[0].previousStock).toBe(1);
      expect(movements[0].newStock).toBe(0);
      expect(movements[0].type).toBe("ADJUSTMENT");
    } finally {
      // Clean up test records
      await prisma.inventoryMovement.deleteMany({
        where: { variantId: isolatedVariant.id },
      });
      await prisma.productVariant.deleteMany({
        where: { productId: isolatedProduct.id },
      });
      await prisma.product.delete({
        where: { id: isolatedProduct.id },
      });
    }
  });

  it("should ensure inventory movements are append-only through application interfaces", async () => {
    // 1. Verify that inventory service exports only create and read operations
    const inventoryServiceModule = await import("./inventory.service");
    expect("adjustStock" in inventoryServiceModule).toBe(true);
    expect("getInventoryItems" in inventoryServiceModule).toBe(true);
    expect("getInventoryMovements" in inventoryServiceModule).toBe(true);

    // Verify there are no update or delete functions for movements in the service interface
    expect("updateInventoryMovement" in inventoryServiceModule).toBe(false);
    expect("deleteInventoryMovement" in inventoryServiceModule).toBe(false);
    expect("modifyMovement" in inventoryServiceModule).toBe(false);
    expect("purgeMovements" in inventoryServiceModule).toBe(false);

    // 2. Verify that existing movements maintain historical integrity
    const history = await getInventoryMovements({ limit: 5 });
    if (history.movements.length > 0) {
      const movement = history.movements[0];
      expect(movement.id).toBeDefined();
      expect(movement.createdAt).toBeInstanceOf(Date);
      expect(typeof movement.quantityChange).toBe("number");
      expect(typeof movement.previousStock).toBe("number");
      expect(typeof movement.newStock).toBe("number");
      expect(movement.newStock - movement.previousStock).toBe(movement.quantityChange);
    }
  });
});

