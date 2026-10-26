import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
import type { Prisma } from "@prisma/client";

export const DEFAULT_RESERVATION_DURATION_MINUTES = 20;

export interface ReservationItemInput {
  variantId: string;
  quantity: number;
}

/**
 * Transactional stock reservation during checkout.
 * Acquires PostgreSQL row-level locks on variants, decrements available stock,
 * and records auditable RESERVATION inventory movements.
 */
export async function createStockReservations(
  orderId: string,
  items: ReservationItemInput[],
  durationMinutes: number = DEFAULT_RESERVATION_DURATION_MINUTES,
  externalTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const createdReservations = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid reservation quantity: ${item.quantity}`);
      }

      // Concurrency safety: acquire exclusive PostgreSQL row lock on the variant
      await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${item.variantId} FOR UPDATE`;

      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new Error(`Variant not found for reservation: ${item.variantId}`);
      }

      if (variant.product.isArchived || !variant.product.published) {
        throw new Error(`Product "${variant.product.title}" is archived or unpublished.`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${variant.product.title} (${variant.title})". Requested: ${item.quantity}, Available: ${variant.stock}.`
        );
      }

      const previousStock = variant.stock;
      const newStock = previousStock - item.quantity;

      // 1. Decrement available stock
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock },
      });

      // 2. Audit inventory movement with type RESERVATION
      await tx.inventoryMovement.create({
        data: {
          businessId: variant.product.businessId || DEFAULT_BUSINESS_ID,
          variantId: variant.id,
          quantityChange: -item.quantity,
          previousStock,
          newStock,
          type: "RESERVATION",
          reason: `Stock reserved for checkout (Order ID: ${orderId})`,
          reference: orderId,
        },
      });

      // 3. Create StockReservation record
      const reservation = await tx.stockReservation.create({
        data: {
          businessId: variant.product.businessId || DEFAULT_BUSINESS_ID,
          orderId,
          variantId: variant.id,
          quantity: item.quantity,
          status: "PENDING",
          expiresAt,
        },
      });

      createdReservations.push(reservation);
    }

    return createdReservations;
  };

  if (externalTx) {
    return await execute(externalTx);
  }
  return await prisma.$transaction(execute);
}

/**
 * Confirms stock reservations upon verified payment.
 * Prevents double-deduction since stock was already reserved.
 */
export async function confirmReservations(
  orderId: string,
  externalTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    const reservations = await tx.stockReservation.findMany({
      where: {
        orderId,
        status: "PENDING",
      },
    });

    if (reservations.length === 0) {
      return { count: 0 };
    }

    const updated = await tx.stockReservation.updateMany({
      where: {
        orderId,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    return { count: updated.count };
  };

  if (externalTx) {
    return await execute(externalTx);
  }
  return await prisma.$transaction(execute);
}

/**
 * Releases stock reservations back to available inventory.
 * Idempotent: checks status so duplicate releases never happen.
 */
export async function releaseReservations(
  orderId: string,
  reason: string = "Order cancelled or payment failed",
  externalTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    // Only release reservations that are PENDING or CONFIRMED (if cancelled)
    const reservations = await tx.stockReservation.findMany({
      where: {
        orderId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        variant: {
          include: { product: true },
        },
      },
    });

    if (reservations.length === 0) {
      return { releasedCount: 0 };
    }

    let actuallyReleased = 0;

    for (const res of reservations) {
      // Atomically claim and mark RELEASED
      const claim = await tx.stockReservation.updateMany({
        where: {
          id: res.id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        continue; // Already released or expired concurrently
      }

      // Row lock the variant
      await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${res.variantId} FOR UPDATE`;

      const variant = await tx.productVariant.findUnique({
        where: { id: res.variantId },
      });

      if (!variant) continue;

      const previousStock = variant.stock;
      const newStock = previousStock + res.quantity;

      // 1. Restore stock
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock },
      });

      // 2. Audit ledger entry with type RELEASE
      await tx.inventoryMovement.create({
        data: {
          businessId: res.businessId || res.variant.product.businessId || DEFAULT_BUSINESS_ID,
          variantId: variant.id,
          quantityChange: res.quantity,
          previousStock,
          newStock,
          type: "RELEASE",
          reason: `Stock reservation released for Order ${orderId}: ${reason}`,
          reference: orderId,
        },
      });

      actuallyReleased++;
    }

    return { releasedCount: actuallyReleased };
  };

  if (externalTx) {
    return await execute(externalTx);
  }
  return await prisma.$transaction(execute);
}

/**
 * Sweeper function to recover expired reservations.
 * Designed to run on system bootstrap, before inventory queries, or on schedule.
 * Returns the number of recovered reservations and affected orders.
 */
export async function releaseExpiredReservations(businessId?: string): Promise<{
  expiredCount: number;
  ordersCancelled: number;
}> {
  const now = new Date();

  // Find all PENDING reservations past their expiration timestamp
  const expiredReservations = await prisma.stockReservation.findMany({
    where: {
      ...(businessId ? { businessId } : {}),
      status: "PENDING",
      expiresAt: { lt: now },
    },
    include: {
      order: true,
      variant: {
        include: { product: true },
      },
    },
  });

  if (expiredReservations.length === 0) {
    return { expiredCount: 0, ordersCancelled: 0 };
  }

  const affectedOrderIds = new Set<string>();

  let recoveredCount = 0;

  for (const res of expiredReservations) {
    await prisma.$transaction(async (tx) => {
      // Atomically claim the reservation by setting status: EXPIRED.
      // updateMany with status: "PENDING" guarantees that only one transaction/worker
      // can ever transition this reservation and restore its stock.
      const claim = await tx.stockReservation.updateMany({
        where: {
          id: res.id,
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
          releasedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        return; // Already processed concurrently
      }

      // Lock variant
      await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${res.variantId} FOR UPDATE`;

      const variant = await tx.productVariant.findUnique({
        where: { id: res.variantId },
      });

      if (variant) {
        const previousStock = variant.stock;
        const newStock = previousStock + res.quantity;

        // Restore stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        // Audit movement
        await tx.inventoryMovement.create({
          data: {
            businessId: res.businessId || res.variant.product.businessId || DEFAULT_BUSINESS_ID,
            variantId: variant.id,
            quantityChange: res.quantity,
            previousStock,
            newStock,
            type: "RELEASE",
            reason: `Expired reservation auto-recovered (Order ID: ${res.orderId})`,
            reference: res.orderId,
          },
        });
      }

      recoveredCount++;
      affectedOrderIds.add(res.orderId);
    });
  }

  // Cancel orders that expired without payment
  let ordersCancelled = 0;
  for (const orderId of affectedOrderIds) {
    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
        paymentStatus: { in: ["UNPAID", "PENDING", "FAILED"] },
      },
      data: {
        status: "CANCELLED",
        cancelReason: "Stock reservation expired before payment completion.",
        cancelledAt: new Date(),
      },
    });
    ordersCancelled += updated.count;
  }

  return {
    expiredCount: recoveredCount,
    ordersCancelled,
  };
}
