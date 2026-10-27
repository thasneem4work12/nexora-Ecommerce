import { prisma } from "@/lib/prisma";
import {
  SaaSSubscriptionStatus,
  SaaSBillingInterval,
  SaaSInvoiceStatus,
  SaaSPaymentStatus,
} from "@prisma/client";

export interface ChangePlanInput {
  businessId: string;
  targetPlanId: string;
  targetPriceId: string;
  userId?: string;
  ipAddress?: string;
}

export interface CancelSubscriptionInput {
  businessId: string;
  cancelAtPeriodEnd?: boolean;
  reason?: string;
  userId?: string;
  ipAddress?: string;
}

export async function changeBusinessPlan(input: ChangePlanInput) {
  return prisma.$transaction(async (tx) => {
    // Concurrency safety: acquire exclusive row-level lock on the business's subscription
    await tx.$queryRaw`SELECT id FROM "saas_subscriptions" WHERE "businessId" = ${input.businessId} FOR UPDATE`;

    // 1. Fetch current subscription and target plan
    const sub = await tx.saaSSubscription.findUnique({
      where: { businessId: input.businessId },
      include: {
        plan: true,
        price: true,
        business: true,
      },
    });

    if (!sub) {
      throw new Error("No existing subscription found for this business.");
    }

    const targetPlan = await tx.saaSPlan.findUnique({
      where: { id: input.targetPlanId },
    });
    if (!targetPlan || !targetPlan.isActive) {
      throw new Error("Target plan does not exist or is inactive.");
    }

    const targetPrice = await tx.saaSPlanPrice.findUnique({
      where: { id: input.targetPriceId },
    });
    if (!targetPrice || targetPrice.planId !== targetPlan.id || !targetPrice.isActive) {
      throw new Error("Target plan price is invalid or inactive.");
    }

    // 2. Check if this is a downgrade
    const isDowngrade = targetPrice.amountInCents < sub.price.amountInCents;
    if (isDowngrade) {
      // Safety check: Does the business currently exceed target plan limits?
      const productCount = await tx.product.count({
        where: { businessId: input.businessId, isArchived: false },
      });
      const staffCount = await tx.businessMember.count({
        where: { businessId: input.businessId },
      });

      if (productCount > targetPlan.maxProducts) {
        throw new Error(
          `Cannot downgrade to ${targetPlan.name}: Business currently has ${productCount} active products, but ${targetPlan.name} allows a maximum of ${targetPlan.maxProducts}. Please archive excess products first.`
        );
      }

      if (staffCount > targetPlan.maxStaff) {
        throw new Error(
          `Cannot downgrade to ${targetPlan.name}: Business currently has ${staffCount} staff members, but ${targetPlan.name} allows a maximum of ${targetPlan.maxStaff}. Please adjust team members first.`
        );
      }
    }

    // 3. Record plan change log
    await tx.saaSPlanChange.create({
      data: {
        subscriptionId: sub.id,
        businessId: input.businessId,
        fromPlanId: sub.planId,
        toPlanId: targetPlan.id,
        changeType: isDowngrade ? "DOWNGRADE" : "UPGRADE",
        effectiveDate: new Date(),
        prorationAmountInCents: 0,
        reason: isDowngrade ? "Plan Downgrade" : "Plan Upgrade",
        requestedByUserId: input.userId,
      },
    });

    // 4. Update subscription
    const now = new Date();
    let newPeriodEnd = new Date(sub.currentPeriodEndsAt);
    if (targetPrice.amountInCents > 0) {
      const durationMs =
        targetPrice.interval === SaaSBillingInterval.YEARLY
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
      newPeriodEnd = new Date(now.getTime() + durationMs);
    }

    const updatedSub = await tx.saaSSubscription.update({
      where: { id: sub.id },
      data: {
        planId: targetPlan.id,
        priceId: targetPrice.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: newPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
      },
      include: {
        plan: true,
        price: true,
      },
    });

    // 5. Generate Invoice & Payment if price > 0
    if (targetPrice.amountInCents > 0) {
      const invoiceNumber = `INV-SAAS-${Date.now().toString().slice(-6)}-${sub.business.slug.slice(0, 4).toUpperCase()}`;
      const invoice = await tx.saaSInvoice.create({
        data: {
          invoiceNumber,
          businessId: input.businessId,
          subscriptionId: sub.id,
          status: SaaSInvoiceStatus.PAID,
          billingPeriodStartsAt: now,
          billingPeriodEndsAt: newPeriodEnd,
          subtotalInCents: targetPrice.amountInCents,
          totalInCents: targetPrice.amountInCents,
          currency: targetPrice.currency,
          paidAt: now,
          dueDate: now,
          notes: `Plan change to ${targetPlan.name} (${targetPrice.interval})`,
          lines: {
            create: {
              description: `NEXORA SaaS Subscription — ${targetPlan.name} (${targetPrice.interval})`,
              quantity: 1,
              unitAmountInCents: targetPrice.amountInCents,
              totalAmountInCents: targetPrice.amountInCents,
              currency: targetPrice.currency,
              priceId: targetPrice.id,
            },
          },
        },
      });

      const paymentNumber = `PAY-SAAS-${Date.now().toString().slice(-6)}`;
      await tx.saaSPayment.create({
        data: {
          paymentNumber,
          subscriptionId: sub.id,
          invoiceId: invoice.id,
          businessId: input.businessId,
          provider: "SIMULATED",
          providerPaymentId: `sim_${paymentNumber}`,
          amountInCents: targetPrice.amountInCents,
          currency: targetPrice.currency,
          status: SaaSPaymentStatus.SUCCEEDED,
          paidAt: now,
        },
      });
    }

    // 6. Audit log
    await tx.saaSBillingAuditLog.create({
      data: {
        businessId: input.businessId,
        userId: input.userId,
        action: isDowngrade ? "PLAN_DOWNGRADE" : "PLAN_UPGRADE",
        ipAddress: input.ipAddress,
        details: {
          fromPlan: sub.plan.code,
          toPlan: targetPlan.code,
          priceInCents: targetPrice.amountInCents,
          interval: targetPrice.interval,
        },
      },
    });

    return updatedSub;
  });
}

export async function cancelSubscription(input: CancelSubscriptionInput) {
  const sub = await prisma.saaSSubscription.findUnique({
    where: { businessId: input.businessId },
    include: { plan: true },
  });

  if (!sub) {
    throw new Error("No subscription found for this business.");
  }

  const cancelAtPeriodEnd = input.cancelAtPeriodEnd ?? true;
  const now = new Date();

  const updated = await prisma.saaSSubscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd,
      canceledAt: now,
      cancelReason: input.reason,
      status: cancelAtPeriodEnd ? sub.status : SaaSSubscriptionStatus.CANCELLED,
      endedAt: cancelAtPeriodEnd ? null : now,
    },
  });

  await prisma.saaSBillingAuditLog.create({
    data: {
      businessId: input.businessId,
      userId: input.userId,
      action: cancelAtPeriodEnd ? "SUBSCRIPTION_CANCEL_SCHEDULED" : "SUBSCRIPTION_CANCEL_IMMEDIATE",
      ipAddress: input.ipAddress,
      details: {
        reason: input.reason,
        effectiveDate: cancelAtPeriodEnd ? sub.currentPeriodEndsAt : now,
      },
    },
  });

  return updated;
}

export async function resumeSubscription(businessId: string, userId?: string, ipAddress?: string) {
  const sub = await prisma.saaSSubscription.findUnique({
    where: { businessId },
  });

  if (!sub) {
    throw new Error("No subscription found for this business.");
  }

  const updated = await prisma.saaSSubscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      status: SaaSSubscriptionStatus.ACTIVE,
    },
  });

  await prisma.saaSBillingAuditLog.create({
    data: {
      businessId,
      userId,
      action: "SUBSCRIPTION_RESUMED",
      ipAddress,
      details: {
        resumedAt: new Date().toISOString(),
      },
    },
  });

  return updated;
}

export async function transitionSubscriptionStatus(
  subscriptionId: string,
  newStatus: SaaSSubscriptionStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason?: string
) {
  const sub = await prisma.saaSSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!sub) {
    throw new Error(`Subscription with ID ${subscriptionId} not found.`);
  }

  // State machine transition validation
  const allowedTransitions: Record<SaaSSubscriptionStatus, SaaSSubscriptionStatus[]> = {
    [SaaSSubscriptionStatus.TRIALING]: [
      SaaSSubscriptionStatus.ACTIVE,
      SaaSSubscriptionStatus.PAST_DUE,
      SaaSSubscriptionStatus.EXPIRED,
      SaaSSubscriptionStatus.CANCELLED,
    ],
    [SaaSSubscriptionStatus.ACTIVE]: [
      SaaSSubscriptionStatus.PAST_DUE,
      SaaSSubscriptionStatus.CANCELLED,
      SaaSSubscriptionStatus.SUSPENDED,
      SaaSSubscriptionStatus.EXPIRED,
    ],
    [SaaSSubscriptionStatus.PAST_DUE]: [
      SaaSSubscriptionStatus.ACTIVE,
      SaaSSubscriptionStatus.SUSPENDED,
      SaaSSubscriptionStatus.CANCELLED,
      SaaSSubscriptionStatus.EXPIRED,
    ],
    [SaaSSubscriptionStatus.CANCELLED]: [
      SaaSSubscriptionStatus.ACTIVE,
    ],
    [SaaSSubscriptionStatus.EXPIRED]: [
      SaaSSubscriptionStatus.ACTIVE,
    ],
    [SaaSSubscriptionStatus.SUSPENDED]: [
      SaaSSubscriptionStatus.ACTIVE,
      SaaSSubscriptionStatus.CANCELLED,
    ],
  };

  if (!allowedTransitions[sub.status]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${sub.status} to ${newStatus}.`);
  }

  return prisma.saaSSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: newStatus,
      updatedAt: new Date(),
    },
  });
}
