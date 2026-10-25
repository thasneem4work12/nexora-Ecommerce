import { prisma } from "@/lib/prisma";
import { confirmReservations } from "@/services/reservation.service";
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

    if (event.status === "PAID") {
      // If already paid, preserve idempotency
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

      // Update payment record
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

      // Update order to PAID and transition status to PAID/PROCESSING
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

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
        },
      });

      return {
        success: true,
        duplicate: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "FAILED",
        message: `Payment failed for order ${order.orderNumber}.`,
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
