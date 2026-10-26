import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { processPaymentWebhook } from "./payment.service";
import { MockPaymentProvider } from "./mock-payment.provider";

describe("Payment & Checkout Security Engine (Idempotency, Mismatches & Concurrency Safety)", () => {
  let testProductId: string;
  let testVariantId: string;
  let testOrderId: string;
  let testOrderNumber: string;
  const mockProvider = new MockPaymentProvider();

  beforeAll(async () => {
    // 1. Retrieve existing apparel category
    const category = (await prisma.category.findFirst({
      where: { slug: "apparel" },
    })) || (await prisma.category.findFirst());

    if (!category) {
      throw new Error("No category found in database for test.");
    }

    const product = await prisma.product.create({
      data: {
        title: "Security Masterpiece Gown",
        slug: `security-gown-${Date.now()}`,
        description: "Audited luxury gown for transaction verification",
        category: "Apparel",
        basePriceInCents: 500000,
        categoryId: category.id,
        published: true,
        variants: {
          create: {
            sku: `SEC-SKU-${Date.now()}`,
            title: "Obsidian / Size 38",
            priceInCents: 500000, // $5,000.00
            stock: 10,
          },
        },
      },
      include: { variants: true },
    });

    testProductId = product.id;
    testVariantId = product.variants[0].id;
    testOrderNumber = `NXR-SEC-${Date.now()}`;

    // 2. Create an order with initial stock reservation
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        subtotalInCents: 500000,
        shippingInCents: 0,
        taxInCents: 0,
        totalInCents: 500000,
        currency: "USD",
        guestEmail: "security-client@nexora.com",
        guestName: "Lord Sterling",
        items: {
          create: {
            variantId: testVariantId,
            productTitle: "Security Masterpiece Gown",
            variantTitle: "Obsidian / Size 38",
            sku: product.variants[0].sku,
            priceInCents: 500000,
            quantity: 1,
            subtotalInCents: 500000,
          },
        },
        stockReservations: {
          create: {
            variantId: testVariantId,
            quantity: 1,
            status: "PENDING",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        },
        payments: {
          create: {
            provider: "MOCK",
            status: "PENDING",
            amountInCents: 500000,
            currency: "USD",
          },
        },
      },
    });

    testOrderId = order.id;

    // Adjust variant stock down by 1 for initial reservation
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stock: 9 },
    });
  });

  afterAll(async () => {
    if (testOrderId) {
      await prisma.paymentEvent.deleteMany({ where: { orderId: testOrderId } });
      await prisma.stockReservation.deleteMany({ where: { orderId: testOrderId } });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
    }
    if (testVariantId) {
      await prisma.productVariant.deleteMany({ where: { id: testVariantId } }).catch(() => {});
    }
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
  });

  it("should reject webhook when payload amount does not match the order authoritative total", async () => {
    const tamperedPayload = JSON.stringify({
      orderId: testOrderId,
      status: "PAID",
      amountInCents: 100, // Attacker sends $1.00 instead of $5,000.00
      currency: "USD",
      eventId: `tamper_amt_${Date.now()}`,
    });

    const signature = mockProvider.generateWebhookSignature(tamperedPayload);
    const headers = new Headers({ "x-mock-signature": signature });

    await expect(
      processPaymentWebhook("MOCK", tamperedPayload, headers)
    ).rejects.toThrow(/Payment amount mismatch/);

    // Verify order was NOT marked as paid
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.paymentStatus).toBe("PENDING");
  });

  it("should reject webhook when payload currency does not match the order currency", async () => {
    const tamperedPayload = JSON.stringify({
      orderId: testOrderId,
      status: "PAID",
      amountInCents: 500000,
      currency: "EUR", // Order is in USD, attacker sends EUR
      eventId: `tamper_curr_${Date.now()}`,
    });

    const signature = mockProvider.generateWebhookSignature(tamperedPayload);
    const headers = new Headers({ "x-mock-signature": signature });

    await expect(
      processPaymentWebhook("MOCK", tamperedPayload, headers)
    ).rejects.toThrow(/Payment currency mismatch/);

    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.paymentStatus).toBe("PENDING");
  });

  it("should successfully process authentic webhook and transition order to PAID", async () => {
    const validPayload = JSON.stringify({
      orderId: testOrderId,
      status: "PAID",
      amountInCents: 500000,
      currency: "USD",
      eventId: `valid_event_${Date.now()}`,
    });

    const signature = mockProvider.generateWebhookSignature(validPayload);
    const headers = new Headers({ "x-mock-signature": signature });

    const result = await processPaymentWebhook("MOCK", validPayload, headers);
    expect(result.success).toBe(true);
    expect(result.status).toBe("PAID");
    expect(result.duplicate).toBe(false);

    // Verify database state
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.paymentStatus).toBe("PAID");
    expect(order?.status).toBe("PAID");

    const reservation = await prisma.stockReservation.findFirst({
      where: { orderId: testOrderId },
    });
    expect(reservation?.status).toBe("CONFIRMED");
  });

  it("should strictly enforce idempotency on duplicate webhook deliveries and not double-decrement stock", async () => {
    const initialVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    const stockBefore = initialVariant?.stock;

    // Send identical payload again
    const eventId = `dedup_evt_${Date.now()}`;
    const payload = JSON.stringify({
      orderId: testOrderId,
      status: "PAID",
      amountInCents: 500000,
      currency: "USD",
      eventId,
    });

    const signature = mockProvider.generateWebhookSignature(payload);
    const headers = new Headers({ "x-mock-signature": signature });

    // First arrival
    const firstResult = await processPaymentWebhook("MOCK", payload, headers);
    expect(firstResult.success).toBe(true);

    // Second arrival (exact same eventId)
    const secondResult = await processPaymentWebhook("MOCK", payload, headers);
    expect(secondResult.success).toBe(true);
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.status).toBe("IGNORED");

    // Stock must remain strictly identical
    const finalVariant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(finalVariant?.stock).toBe(stockBefore);
  });

  it("should safely handle late payments arriving after reservation expiration when stock is available", async () => {
    // Create an expired order
    const lateOrder = await prisma.order.create({
      data: {
        orderNumber: `NXR-LATE-${Date.now()}`,
        status: "CANCELLED",
        paymentStatus: "PENDING",
        cancelReason: "Stock reservation expired before payment completion.",
        subtotalInCents: 500000,
        totalInCents: 500000,
        currency: "USD",
        items: {
          create: {
            variantId: testVariantId,
            productTitle: "Security Masterpiece Gown",
            variantTitle: "Obsidian / Size 38",
            sku: "SKU-LATE",
            priceInCents: 500000,
            quantity: 1,
            subtotalInCents: 500000,
          },
        },
        stockReservations: {
          create: {
            variantId: testVariantId,
            quantity: 1,
            status: "EXPIRED",
            expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
          },
        },
        payments: {
          create: {
            provider: "MOCK",
            status: "PENDING",
            amountInCents: 500000,
            currency: "USD",
          },
        },
      },
    });

    try {
      const stockBefore = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))?.stock || 0;

      const payload = JSON.stringify({
        orderId: lateOrder.id,
        status: "PAID",
        amountInCents: 500000,
        currency: "USD",
        eventId: `late_pay_evt_${Date.now()}`,
      });

      const signature = mockProvider.generateWebhookSignature(payload);
      const headers = new Headers({ "x-mock-signature": signature });

      const result = await processPaymentWebhook("MOCK", payload, headers);
      expect(result.success).toBe(true);
      expect(result.status).toBe("PAID");

      // Verify order was safely reopened and stock re-allocated
      const updatedOrder = await prisma.order.findUnique({ where: { id: lateOrder.id } });
      expect(updatedOrder?.status).toBe("PAID");
      expect(updatedOrder?.paymentStatus).toBe("PAID");

      // Stock should have been decremented by 1 for the re-allocation
      const stockAfter = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))?.stock || 0;
      expect(stockAfter).toBe(stockBefore - 1);
    } finally {
      await prisma.paymentEvent.deleteMany({ where: { orderId: lateOrder.id } });
      await prisma.stockReservation.deleteMany({ where: { orderId: lateOrder.id } });
      await prisma.payment.deleteMany({ where: { orderId: lateOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: lateOrder.id } });
      await prisma.order.delete({ where: { id: lateOrder.id } }).catch(() => {});
    }
  });

  it("should prevent overselling if payment arrives after expiration but variant is OUT OF STOCK", async () => {
    // Create variant with ZERO stock
    const outOfStockVariant = await prisma.productVariant.create({
      data: {
        productId: (await prisma.product.findFirst())!.id,
        sku: `OOS-${Date.now()}`,
        title: "Rare Couture / Size 34",
        priceInCents: 100000,
        stock: 0, // SOLD OUT!
      },
    });

    const oosOrder = await prisma.order.create({
      data: {
        orderNumber: `NXR-OOS-${Date.now()}`,
        status: "CANCELLED",
        paymentStatus: "PENDING",
        cancelReason: "Stock reservation expired before payment completion.",
        subtotalInCents: 100000,
        totalInCents: 100000,
        currency: "USD",
        items: {
          create: {
            variantId: outOfStockVariant.id,
            productTitle: "Rare Couture",
            variantTitle: "Rare Couture / Size 34",
            sku: outOfStockVariant.sku,
            priceInCents: 100000,
            quantity: 1,
            subtotalInCents: 100000,
          },
        },
        stockReservations: {
          create: {
            variantId: outOfStockVariant.id,
            quantity: 1,
            status: "EXPIRED",
            expiresAt: new Date(Date.now() - 60000),
          },
        },
        payments: {
          create: {
            provider: "MOCK",
            status: "PENDING",
            amountInCents: 100000,
            currency: "USD",
          },
        },
      },
    });

    try {
      const payload = JSON.stringify({
        orderId: oosOrder.id,
        status: "PAID",
        amountInCents: 100000,
        currency: "USD",
        eventId: `oos_pay_evt_${Date.now()}`,
      });

      const signature = mockProvider.generateWebhookSignature(payload);
      const headers = new Headers({ "x-mock-signature": signature });

      const result = await processPaymentWebhook("MOCK", payload, headers);
      // Fails fulfillment safely because stock is out of stock!
      expect(result.status).toBe("FAILED");
      expect(result.message).toContain("out of stock");

      // Verify order remains CANCELLED and stock remains 0 (never negative)
      const checkedOrder = await prisma.order.findUnique({ where: { id: oosOrder.id } });
      expect(checkedOrder?.status).toBe("CANCELLED");
      expect(checkedOrder?.notes).toContain("OUT OF STOCK");

      const checkedVariant = await prisma.productVariant.findUnique({
        where: { id: outOfStockVariant.id },
      });
      expect(checkedVariant?.stock).toBe(0);
    } finally {
      await prisma.paymentEvent.deleteMany({ where: { orderId: oosOrder.id } });
      await prisma.stockReservation.deleteMany({ where: { orderId: oosOrder.id } });
      await prisma.payment.deleteMany({ where: { orderId: oosOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: oosOrder.id } });
      await prisma.order.delete({ where: { id: oosOrder.id } }).catch(() => {});
      await prisma.productVariant.delete({ where: { id: outOfStockVariant.id } }).catch(() => {});
    }
  });

  it("should release reserved stock immediately when receiving a payment failure webhook", async () => {
    const failOrder = await prisma.order.create({
      data: {
        orderNumber: `NXR-FAIL-${Date.now()}`,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        subtotalInCents: 500000,
        totalInCents: 500000,
        currency: "USD",
        items: {
          create: {
            variantId: testVariantId,
            productTitle: "Security Masterpiece Gown",
            variantTitle: "Obsidian / Size 38",
            sku: "SKU-FAIL",
            priceInCents: 500000,
            quantity: 1,
            subtotalInCents: 500000,
          },
        },
        stockReservations: {
          create: {
            variantId: testVariantId,
            quantity: 1,
            status: "PENDING",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        },
        payments: {
          create: {
            provider: "MOCK",
            status: "PENDING",
            amountInCents: 500000,
            currency: "USD",
          },
        },
      },
    });

    try {
      const stockBefore = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))?.stock || 0;

      const payload = JSON.stringify({
        orderId: failOrder.id,
        status: "FAILED",
        amountInCents: 500000,
        currency: "USD",
        errorMessage: "Insufficient funds on credit card",
        eventId: `fail_pay_evt_${Date.now()}`,
      });

      const signature = mockProvider.generateWebhookSignature(payload);
      const headers = new Headers({ "x-mock-signature": signature });

      const result = await processPaymentWebhook("MOCK", payload, headers);
      expect(result.status).toBe("FAILED");

      // Verify order cancelled
      const checkedOrder = await prisma.order.findUnique({ where: { id: failOrder.id } });
      expect(checkedOrder?.status).toBe("CANCELLED");
      expect(checkedOrder?.paymentStatus).toBe("FAILED");

      // Stock was restored by 1
      const stockAfter = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))?.stock || 0;
      expect(stockAfter).toBe(stockBefore + 1);
    } finally {
      await prisma.paymentEvent.deleteMany({ where: { orderId: failOrder.id } });
      await prisma.stockReservation.deleteMany({ where: { orderId: failOrder.id } });
      await prisma.payment.deleteMany({ where: { orderId: failOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: failOrder.id } });
      await prisma.order.delete({ where: { id: failOrder.id } }).catch(() => {});
    }
  });

  it("should strictly disallow mock payment provider in production unless ALLOW_MOCK_PAYMENT is true", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_MOCK_PAYMENT;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.ALLOW_MOCK_PAYMENT;

      const prodProvider = new MockPaymentProvider();
      expect(prodProvider.isAvailable()).toBe(false);

      await expect(
        prodProvider.createPaymentSession({
          orderId: "test",
          orderNumber: "test",
          amountInCents: 100,
          currency: "USD",
          customerEmail: "test@domain.com",
          customerName: "Test",
          returnUrl: "http://localhost",
          cancelUrl: "http://localhost",
          notifyUrl: "http://localhost",
        })
      ).rejects.toThrow(/Security violation/);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      if (originalAllow) {
        process.env.ALLOW_MOCK_PAYMENT = originalAllow;
      } else {
        delete process.env.ALLOW_MOCK_PAYMENT;
      }
    }
  });
});
