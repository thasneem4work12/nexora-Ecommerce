import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  SaaSSubscriptionStatus,
  SaaSInvoiceStatus,
  SaaSPaymentStatus,
  SaaSBillingInterval,
} from "@prisma/client";
import { generateInvoiceNumber, generatePaymentNumber } from "@/services/saas/invoice.service";

/**
 * POST /api/admin/billing/simulate-payment
 * Dev simulator: simulates a billing renewal, invoice payment, or payment failure.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_BILLING");
    const { businessId, user } = adminContext;

    const body = await request.json().catch(() => ({}));
    const { action = "renew", invoiceId } = body;

    const sub = await prisma.saaSSubscription.findUnique({
      where: { businessId },
      include: { plan: true, price: true, business: true },
    });

    if (!sub) {
      return NextResponse.json({ success: false, error: "No subscription found." }, { status: 404 });
    }

    const now = new Date();

    if (action === "renew") {
      // Advance billing cycle by interval duration
      const durationMs =
        sub.price.interval === SaaSBillingInterval.YEARLY
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      const newPeriodStart = now;
      const newPeriodEnd = new Date(now.getTime() + durationMs);

      // Create new invoice and payment
      const invoiceNumber = generateInvoiceNumber(sub.business.slug);
      const invoice = await prisma.saaSInvoice.create({
        data: {
          invoiceNumber,
          businessId,
          subscriptionId: sub.id,
          status: SaaSInvoiceStatus.PAID,
          billingPeriodStartsAt: newPeriodStart,
          billingPeriodEndsAt: newPeriodEnd,
          subtotalInCents: sub.price.amountInCents,
          totalInCents: sub.price.amountInCents,
          currency: sub.price.currency,
          paidAt: now,
          dueDate: now,
          notes: `Simulated renewal: ${sub.plan.name} (${sub.price.interval})`,
          lines: {
            create: {
              description: `NEXORA Subscription Renewal — ${sub.plan.name} (${sub.price.interval})`,
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
      await prisma.saaSPayment.create({
        data: {
          paymentNumber,
          subscriptionId: sub.id,
          invoiceId: invoice.id,
          businessId,
          provider: "SIMULATED",
          providerPaymentId: `sim_${paymentNumber}`,
          amountInCents: sub.price.amountInCents,
          currency: sub.price.currency,
          status: SaaSPaymentStatus.SUCCEEDED,
          paidAt: now,
        },
      });

      const updatedSub = await prisma.saaSSubscription.update({
        where: { id: sub.id },
        data: {
          status: SaaSSubscriptionStatus.ACTIVE,
          currentPeriodStartsAt: newPeriodStart,
          currentPeriodEndsAt: newPeriodEnd,
        },
        include: { plan: true, price: true },
      });

      await prisma.saaSBillingAuditLog.create({
        data: {
          businessId,
          userId: user.id,
          action: "SIMULATED_RENEWAL_SUCCEEDED",
          details: { invoiceNumber, paymentNumber, amountInCents: sub.price.amountInCents },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Simulated renewal payment processed successfully.",
        subscription: updatedSub,
        invoice,
      });
    }

    if (action === "fail") {
      // Simulate failed payment -> sets subscription to PAST_DUE
      const updatedSub = await prisma.saaSSubscription.update({
        where: { id: sub.id },
        data: {
          status: SaaSSubscriptionStatus.PAST_DUE,
        },
        include: { plan: true, price: true },
      });

      await prisma.saaSBillingAuditLog.create({
        data: {
          businessId,
          userId: user.id,
          action: "SIMULATED_PAYMENT_FAILED",
          details: { reason: "Simulated card decline for past due testing" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Simulated payment failure triggered. Subscription set to PAST_DUE.",
        subscription: updatedSub,
      });
    }

    if (action === "pay_invoice" && invoiceId) {
      const invoice = await prisma.saaSInvoice.findUnique({
        where: { id: invoiceId, businessId },
      });

      if (!invoice) {
        return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
      }

      const paymentNumber = generatePaymentNumber();
      await prisma.saaSPayment.create({
        data: {
          paymentNumber,
          subscriptionId: sub.id,
          invoiceId: invoice.id,
          businessId,
          provider: "SIMULATED",
          providerPaymentId: `sim_${paymentNumber}`,
          amountInCents: invoice.totalInCents,
          currency: invoice.currency,
          status: SaaSPaymentStatus.SUCCEEDED,
          paidAt: now,
        },
      });

      const updatedInvoice = await prisma.saaSInvoice.update({
        where: { id: invoice.id },
        data: {
          status: SaaSInvoiceStatus.PAID,
          paidAt: now,
        },
      });

      // Restore active status if subscription was PAST_DUE
      if (sub.status === SaaSSubscriptionStatus.PAST_DUE) {
        await prisma.saaSSubscription.update({
          where: { id: sub.id },
          data: { status: SaaSSubscriptionStatus.ACTIVE },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Invoice paid successfully.",
        invoice: updatedInvoice,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid simulation action." }, { status: 400 });
  } catch (error) {
    console.error("[API Admin Simulate Billing POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to simulate payment.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
