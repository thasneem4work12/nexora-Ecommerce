import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulatedSaaSBillingProvider } from "@/services/saas/simulated-billing.provider";
import {
  SaaSSubscriptionStatus,
  SaaSInvoiceStatus,
  SaaSPaymentStatus,
  SaaSBillingInterval,
} from "@prisma/client";
import { generateInvoiceNumber, generatePaymentNumber } from "@/services/saas/invoice.service";

/**
 * POST /api/webhooks/saas/simulated
 * Webhook endpoint for Simulated SaaS billing provider events.
 * Implements HMAC signature verification, idempotency checking, and billing lifecycle state transitions.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-saas-signature") || "";

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
    }

    // Verify HMAC signature
    const isValid = simulatedSaaSBillingProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[SaaS Simulated Webhook] Invalid HMAC signature received.");
      return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
    }

    const eventId = String(payload.eventId || payload.id || "");
    if (!eventId) {
      return NextResponse.json({ success: false, error: "Missing eventId." }, { status: 400 });
    }

    // Idempotency check: check if event has already been recorded
    const existingEvent = await prisma.saaSBillingEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log(`[SaaS Simulated Webhook] Duplicate event ${eventId} ignored.`);
      return NextResponse.json({ success: true, duplicate: true, message: "Event already processed." });
    }

    const eventType = String(payload.eventType || "");
    const businessId = String(payload.businessId || "");
    const subscriptionId = payload.subscriptionId ? String(payload.subscriptionId) : undefined;
    const now = new Date();

    // Process event inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record event for audit and idempotency
      const billingEvent = await tx.saaSBillingEvent.create({
        data: {
          eventId,
          eventType,
          businessId,
          subscriptionId,
          provider: "SIMULATED",
          status: "PROCESSED",
          payload: typeof payload === "string" ? payload : JSON.stringify(payload),
        },
      });

      // 2. Dispatch event type
      if (eventType === "invoice.payment_succeeded" && subscriptionId) {
        const sub = await tx.saaSSubscription.findUnique({
          where: { id: subscriptionId },
          include: { price: true, business: true, plan: true },
        });

        if (sub) {
          const durationMs =
            sub.price.interval === SaaSBillingInterval.YEARLY
              ? 365 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000;

          const newStart = now;
          const newEnd = new Date(now.getTime() + durationMs);

          const invoiceNumber = generateInvoiceNumber(sub.business.slug);
          const invoice = await tx.saaSInvoice.create({
            data: {
              invoiceNumber,
              businessId: sub.businessId,
              subscriptionId: sub.id,
              status: SaaSInvoiceStatus.PAID,
              billingPeriodStartsAt: newStart,
              billingPeriodEndsAt: newEnd,
              subtotalInCents: sub.price.amountInCents,
              totalInCents: sub.price.amountInCents,
              currency: sub.price.currency,
              paidAt: now,
              dueDate: now,
              notes: `Automated webhook renewal: ${sub.plan.name}`,
              lines: {
                create: {
                  description: `NEXORA SaaS Renewal — ${sub.plan.name} (${sub.price.interval})`,
                  quantity: 1,
                  unitAmountInCents: sub.price.amountInCents,
                  totalAmountInCents: sub.price.amountInCents,
                  currency: sub.price.currency,
                  priceId: sub.price.id,
                },
              },
            },
          });

          const paymentNumber = generatePaymentNumber();
          const payment = await tx.saaSPayment.create({
            data: {
              paymentNumber,
              subscriptionId: sub.id,
              invoiceId: invoice.id,
              businessId: sub.businessId,
              provider: "SIMULATED",
              providerPaymentId: `sim_${paymentNumber}`,
              amountInCents: sub.price.amountInCents,
              currency: sub.price.currency,
              status: SaaSPaymentStatus.SUCCEEDED,
              paidAt: now,
            },
          });

          await tx.saaSSubscription.update({
            where: { id: sub.id },
            data: {
              status: SaaSSubscriptionStatus.ACTIVE,
              currentPeriodStartsAt: newStart,
              currentPeriodEndsAt: newEnd,
            },
          });

          // Link payment to event
          await tx.saaSBillingEvent.update({
            where: { id: billingEvent.id },
            data: { paymentId: payment.id },
          });
        }
      } else if (eventType === "invoice.payment_failed" && subscriptionId) {
        await tx.saaSSubscription.update({
          where: { id: subscriptionId },
          data: { status: SaaSSubscriptionStatus.PAST_DUE },
        });
      } else if (eventType === "subscription.cancelled" && subscriptionId) {
        await tx.saaSSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: SaaSSubscriptionStatus.CANCELLED,
            endedAt: now,
          },
        });
      }

      return billingEvent;
    });

    return NextResponse.json({
      success: true,
      processed: true,
      eventId: result.eventId,
    });
  } catch (error) {
    console.error("[SaaS Simulated Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Internal webhook processing error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
