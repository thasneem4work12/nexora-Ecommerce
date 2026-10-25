import { prisma } from "@/lib/prisma";
import { confirmReservations, releaseReservations } from "@/services/reservation.service";
import type { PaymentProvider, PaymentSessionResult } from "./payment-provider.interface";
import { MockPaymentProvider } from "./mock-payment.provider";
import { PayHerePaymentProvider } from "./payhere-payment.provider";

// Payment providers registry
const providers: Record<string, PaymentProvider> = {
  MOCK: new MockPaymentProvider(),
  PAYHERE: new PayHerePaymentProvider(),
};

/**
 * Returns available payment providers for client selection.
 */
export function getAvailablePaymentProviders(): Array<{
  id: string;
  name: string;
  isSandbox: boolean;
}> {
  return Object.values(providers)
    .filter((p) => p.isAvailable())
    .map((p) => ({
      id: p.id,
      name: p.name,
      isSandbox: p.id === "MOCK" || process.env.PAYHERE_SANDBOX !== "false",
    }));
}

/**
 * Resolves payment provider by ID.
 */
export function getPaymentProvider(providerId: string): PaymentProvider {
  const normalizedId = providerId.toUpperCase().trim();
  const provider = providers[normalizedId];

  if (!provider) {
    throw new Error(`Unsupported payment provider: ${providerId}`);
  }

  if (!provider.isAvailable()) {
    throw new Error(`Payment provider "${provider.name}" is not currently available.`);
  }

  return provider;
}

/**
 * Initiates payment session for an order.
 * Records a PENDING payment record and delegates session generation to the provider.
 */
export async function initiateOrderPayment(
  orderId: string,
  providerId: string,
  originUrl: string
): Promise<PaymentSessionResult> {
  const provider = getPaymentProvider(providerId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.paymentStatus === "PAID") {
    throw new Error(`Order ${order.orderNumber} is already paid.`);
  }

  if (order.status === "CANCELLED") {
    throw new Error(`Order ${order.orderNumber} is cancelled.`);
  }

  // 1. Create or retrieve pending Payment record
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: provider.id,
      status: "PENDING",
      amountInCents: order.totalInCents,
      currency: order.currency,
    },
  });

  // 2. Build return, cancel, and webhook URLs
  const returnUrl = `${originUrl}/checkout/success?order_id=${order.id}&payment_id=${payment.id}`;
  const cancelUrl = `${originUrl}/checkout?order_id=${order.id}&cancelled=true`;
  const notifyUrl = `${originUrl}/api/webhooks/payment/${provider.id.toLowerCase()}`;

  const customerEmail = order.user?.email || order.guestEmail || "client@nexoracommerce.com";
  const customerName = order.user?.name || order.guestName || "Atelier Patron";

  // 3. Delegate to provider
  const sessionResult = await provider.createPaymentSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountInCents: order.totalInCents,
    currency: order.currency,
    customerEmail,
    customerName,
    returnUrl,
    cancelUrl,
    notifyUrl,
  });

  // 4. Update payment record with providerPaymentId
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: sessionResult.sessionId,
    },
  });

  return sessionResult;
}

export interface WebhookProcessingResult {
  success: boolean;
  duplicate: boolean;
  orderId?: string;
  orderNumber?: string;
  status: "PAID" | "FAILED" | "PENDING" | "IGNORED";
  message: string;
}

/**
 * Authoritative, idempotent payment webhook processor.
 * Verifies provider signatures, guards against duplicate events,
 * and executes transactional order confirmation and stock allocation.
 */
export async function processPaymentWebhook(
  providerId: string,
  rawPayload: string,
  headers: Headers
): Promise<WebhookProcessingResult> {
  const provider = getPaymentProvider(providerId);

  // 1. Authoritative signature verification
  const isValidSignature = await provider.verifyWebhookSignature(rawPayload, headers);
  if (!isValidSignature) {
    console.error(`[Webhook Security] Invalid signature from provider: ${providerId}`);
    throw new Error("Webhook signature verification failed.");
  }

  // 2. Parse provider event
  const event = await provider.parseWebhookEvent(rawPayload, headers);

  // 3. Idempotency check: event deduplication
  if (event.eventId) {
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId: event.eventId },
    });

    if (existingEvent) {
      console.log(`[Webhook Idempotency] Duplicate event received: ${event.eventId}. Skipping re-processing.`);
      return {
        success: true,
        duplicate: true,
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        status: "IGNORED",
        message: "Duplicate webhook event already processed.",
      };
    }
  }

  // 4. Transactional order and payment update
  return await prisma.$transaction(async (tx) => {
    // Lock order row
    await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${event.orderId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: event.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new Error(`Order not found for webhook: ${event.orderId}`);
    }

    // 5. Create PaymentEvent record for immutable audit
    const paymentRecord = order.payments.find(
      (p) => p.provider === provider.id && p.status === "PENDING"
    ) || order.payments[0];

    await tx.paymentEvent.create({
      data: {
        paymentId: paymentRecord?.id || null,
        orderId: order.id,
        provider: provider.id,
        eventType: event.eventType,
        eventId: event.eventId,
        payload: rawPayload,
        status: "PROCESSED",
      },
    });

    // 6. Security Check: Order ID matching
    if (order.id !== event.orderId) {
      throw new Error(
        `Payment Security Violation: Order ID mismatch (expected ${order.id}, got ${event.orderId})`
      );
    }

    // 7. Security Check: Amount matching (minor units)
    if (typeof event.amountInCents === "number" && event.amountInCents > 0) {
      if (event.amountInCents !== order.totalInCents) {
        console.error(
          `[Payment Security Alert] Amount mismatch on order ${order.orderNumber}: expected ${order.totalInCents} cents, received ${event.amountInCents} cents`
        );
        throw new Error(
          `Payment amount mismatch: expected ${order.totalInCents} minor units, received ${event.amountInCents}.`
        );
      }
    }

    // 8. Security Check: Currency matching
    if (event.currency) {
      if (event.currency.trim().toUpperCase() !== order.currency.trim().toUpperCase()) {
        console.error(
          `[Payment Security Alert] Currency mismatch on order ${order.orderNumber}: expected ${order.currency}, received ${event.currency}`
        );
        throw new Error(
          `Payment currency mismatch: expected ${order.currency}, received ${event.currency}.`
        );
      }
    }

    if (event.status === "PAID") {
      // If already paid, preserve idempotency without modifying stock
      if (order.paymentStatus === "PAID") {
        return {
          success: true,
          duplicate: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "PAID",
          message: "Order already marked as paid.",
        };
      }

      // Handle late payment arriving after reservation expiration or order cancellation
      if (order.status === "CANCELLED") {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: order.id },
        });

        let allStockAvailable = true;
        for (const item of orderItems) {
          if (!item.variantId) continue;
          await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${item.variantId} FOR UPDATE`;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || variant.stock < item.quantity) {
            allStockAvailable = false;
            break;
          }
        }

        if (!allStockAvailable) {
          // Stock was already claimed during the expired window. Do NOT oversell!
          if (paymentRecord) {
            await tx.payment.update({
              where: { id: paymentRecord.id },
              data: {
                status: "PAID",
                paidAt: new Date(),
                paymentMethod: event.paymentMethod || "CARD",
                cardBrand: event.cardBrand || null,
                cardLast4: event.cardLast4 || null,
                errorMessage: "Late payment arrived after reservation expired and variant stock was sold out. Refund required.",
              },
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "PAID",
              notes: `${order.notes ? `${order.notes}\n` : ""}[Payment Alert ${new Date().toISOString()}]: Payment of ${event.amountInCents} cents received after reservation expired, but piece is OUT OF STOCK. Order remains CANCELLED. Manual refund required.`,
            },
          });

          return {
            success: true,
            duplicate: false,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: "FAILED",
            message: "Payment received after reservation expired, but inventory is out of stock. Order remains cancelled pending refund.",
          };
        }

        // Stock IS still available: Re-allocate inventory and confirm order
        for (const item of orderItems) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            const previousStock = variant.stock;
            const newStock = previousStock - item.quantity;
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: newStock },
            });
            await tx.inventoryMovement.create({
              data: {
                variantId: variant.id,
                quantityChange: -item.quantity,
                previousStock,
                newStock,
                type: "RESERVATION",
                reason: `Late payment inventory re-allocation for Order ${order.orderNumber}`,
                reference: order.id,
              },
            });
          }
        }

        await tx.stockReservation.updateMany({
          where: { orderId: order.id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });

        if (paymentRecord) {
          await tx.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              paymentMethod: event.paymentMethod || "CARD",
              cardBrand: event.cardBrand || null,
              cardLast4: event.cardLast4 || null,
            },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            status: "PAID",
            paidAt: new Date(),
            cancelReason: null,
            cancelledAt: null,
            notes: `${order.notes ? `${order.notes}\n` : ""}[Audit Notice ${new Date().toISOString()}]: Order was previously cancelled/expired, but payment settled and stock was safely re-allocated.`,
          },
        });

        return {
          success: true,
          duplicate: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "PAID",
          message: `Order ${order.orderNumber} recovered and stock re-allocated.`,
        };
      }

      // Standard checkout payment confirmation
      if (paymentRecord) {
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: event.paymentMethod || "CARD",
            cardBrand: event.cardBrand || null,
            cardLast4: event.cardLast4 || null,
          },
        });
      }

      // Update order to PAID and transition status to PAID
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Confirm stock allocation permanently (no duplicate deduction)
      await confirmReservations(order.id, tx);

      return {
        success: true,
        duplicate: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PAID",
        message: `Order ${order.orderNumber} successfully paid and stock allocated.`,
      };
    } else if (event.status === "FAILED") {
      if (paymentRecord) {
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: "FAILED",
            errorMessage: event.errorMessage || "Payment declined by provider.",
          },
        });
      }

      // Release reserved stock immediately so inventory is not locked up
      await releaseReservations(order.id, "Payment declined via provider webhook", tx);

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelReason: event.errorMessage || "Payment declined by provider.",
          cancelledAt: new Date(),
        },
      });

      return {
        success: true,
        duplicate: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "FAILED",
        message: `Payment failed for order ${order.orderNumber}. Stock reservation released.`,
      };
    }

    return {
      success: true,
      duplicate: false,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "PENDING",
      message: `Payment status updated to PENDING for order ${order.orderNumber}.`,
    };
  });
}
