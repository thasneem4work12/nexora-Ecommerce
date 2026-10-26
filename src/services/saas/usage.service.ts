import { prisma } from "@/lib/prisma";
import { SaaSSubscriptionStatus } from "@prisma/client";

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reason?: string;
  planName?: string;
}

export interface BusinessUsageSummary {
  businessId: string;
  subscription: {
    id: string;
    status: SaaSSubscriptionStatus;
    currentPeriodStartsAt: Date;
    currentPeriodEndsAt: Date;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    maxProducts: number;
    maxStaff: number;
    maxStorageMb: number;
    allowCustomThemes: boolean;
    allowAdvancedAnalytics: boolean;
    allowPrioritySupport: boolean;
  } | null;
  metrics: {
    products: {
      current: number;
      limit: number;
      percentage: number;
      isExceeded: boolean;
    };
    staff: {
      current: number;
      limit: number;
      percentage: number;
      isExceeded: boolean;
    };
    storageMb: {
      current: number;
      limit: number;
      percentage: number;
      isExceeded: boolean;
    };
  };
  features: {
    allowCustomThemes: boolean;
    allowAdvancedAnalytics: boolean;
    allowPrioritySupport: boolean;
  };
}

export async function getBusinessActiveSubscription(businessId: string) {
  return prisma.saaSSubscription.findUnique({
    where: { businessId },
    include: {
      plan: true,
      price: true,
    },
  });
}

export async function checkProductLimit(businessId: string): Promise<LimitCheckResult> {
  const sub = await getBusinessActiveSubscription(businessId);
  const current = await prisma.product.count({
    where: { businessId, isArchived: false },
  });

  if (!sub) {
    return {
      allowed: false,
      current,
      limit: 0,
      reason: "No active SaaS subscription found for this business.",
    };
  }

  if (sub.status === SaaSSubscriptionStatus.SUSPENDED) {
    return {
      allowed: false,
      current,
      limit: sub.plan.maxProducts,
      planName: sub.plan.name,
      reason: "Business subscription is currently suspended. Action not permitted.",
    };
  }

  if (sub.status === SaaSSubscriptionStatus.EXPIRED || sub.status === SaaSSubscriptionStatus.CANCELLED) {
    return {
      allowed: false,
      current,
      limit: sub.plan.maxProducts,
      planName: sub.plan.name,
      reason: "Business subscription has ended. Upgrade or renewal is required.",
    };
  }

  const limit = sub.plan.maxProducts;
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      planName: sub.plan.name,
      reason: `Plan product limit reached (${current}/${limit}). Please upgrade your plan to add more products.`,
    };
  }

  return {
    allowed: true,
    current,
    limit,
    planName: sub.plan.name,
  };
}

export async function checkStaffLimit(businessId: string): Promise<LimitCheckResult> {
  const sub = await getBusinessActiveSubscription(businessId);
  const current = await prisma.businessMember.count({
    where: { businessId },
  });

  if (!sub) {
    return {
      allowed: false,
      current,
      limit: 0,
      reason: "No active SaaS subscription found for this business.",
    };
  }

  if (sub.status === SaaSSubscriptionStatus.SUSPENDED) {
    return {
      allowed: false,
      current,
      limit: sub.plan.maxStaff,
      planName: sub.plan.name,
      reason: "Business subscription is currently suspended. Action not permitted.",
    };
  }

  const limit = sub.plan.maxStaff;
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      planName: sub.plan.name,
      reason: `Plan team limit reached (${current}/${limit}). Please upgrade your plan to invite more staff.`,
    };
  }

  return {
    allowed: true,
    current,
    limit,
    planName: sub.plan.name,
  };
}

export async function checkFeatureEntitlement(
  businessId: string,
  feature: "allowCustomThemes" | "allowAdvancedAnalytics" | "allowPrioritySupport"
): Promise<boolean> {
  const sub = await getBusinessActiveSubscription(businessId);
  if (!sub || sub.status === SaaSSubscriptionStatus.SUSPENDED || sub.status === SaaSSubscriptionStatus.EXPIRED) {
    return false;
  }
  return Boolean(sub.plan[feature]);
}

export async function getBusinessUsageSummary(businessId: string): Promise<BusinessUsageSummary> {
  const [sub, productCount, staffCount, imageCount] = await Promise.all([
    getBusinessActiveSubscription(businessId),
    prisma.product.count({ where: { businessId, isArchived: false } }),
    prisma.businessMember.count({ where: { businessId } }),
    prisma.productImage.count({ where: { product: { businessId } } }),
  ]);

  // Estimate storage: ~2.5MB per image + base store overhead
  const estimatedStorageMb = Math.round(imageCount * 2.5 + 5);

  const plan = sub?.plan ?? null;
  const maxProducts = plan?.maxProducts ?? 0;
  const maxStaff = plan?.maxStaff ?? 0;
  const maxStorageMb = plan?.maxStorageMb ?? 1000;

  const productPercentage = maxProducts > 0 ? Math.min(100, Math.round((productCount / maxProducts) * 100)) : 100;
  const staffPercentage = maxStaff > 0 ? Math.min(100, Math.round((staffCount / maxStaff) * 100)) : 100;
  const storagePercentage = maxStorageMb > 0 ? Math.min(100, Math.round((estimatedStorageMb / maxStorageMb) * 100)) : 100;

  return {
    businessId,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          currentPeriodStartsAt: sub.currentPeriodStartsAt,
          currentPeriodEndsAt: sub.currentPeriodEndsAt,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    plan: plan
      ? {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          maxProducts: plan.maxProducts,
          maxStaff: plan.maxStaff,
          maxStorageMb: plan.maxStorageMb,
          allowCustomThemes: plan.allowCustomThemes,
          allowAdvancedAnalytics: plan.allowAdvancedAnalytics,
          allowPrioritySupport: plan.allowPrioritySupport,
        }
      : null,
    metrics: {
      products: {
        current: productCount,
        limit: maxProducts,
        percentage: productPercentage,
        isExceeded: maxProducts > 0 && productCount > maxProducts,
      },
      staff: {
        current: staffCount,
        limit: maxStaff,
        percentage: staffPercentage,
        isExceeded: maxStaff > 0 && staffCount > maxStaff,
      },
      storageMb: {
        current: estimatedStorageMb,
        limit: maxStorageMb,
        percentage: storagePercentage,
        isExceeded: estimatedStorageMb > maxStorageMb,
      },
    },
    features: {
      allowCustomThemes: plan?.allowCustomThemes ?? false,
      allowAdvancedAnalytics: plan?.allowAdvancedAnalytics ?? false,
      allowPrioritySupport: plan?.allowPrioritySupport ?? false,
    },
  };
}

export async function recordUsageSnapshot(businessId: string): Promise<void> {
  const summary = await getBusinessUsageSummary(businessId);
  if (!summary.subscription) return;

  const now = new Date();
  await prisma.$transaction([
    prisma.saaSUsageRecord.create({
      data: {
        businessId,
        subscriptionId: summary.subscription.id,
        metric: "PRODUCTS",
        currentValue: summary.metrics.products.current,
        limitValue: summary.metrics.products.limit,
        recordedAt: now,
      },
    }),
    prisma.saaSUsageRecord.create({
      data: {
        businessId,
        subscriptionId: summary.subscription.id,
        metric: "STAFF",
        currentValue: summary.metrics.staff.current,
        limitValue: summary.metrics.staff.limit,
        recordedAt: now,
      },
    }),
    prisma.saaSUsageRecord.create({
      data: {
        businessId,
        subscriptionId: summary.subscription.id,
        metric: "STORAGE_MB",
        currentValue: summary.metrics.storageMb.current,
        limitValue: summary.metrics.storageMb.limit,
        recordedAt: now,
      },
    }),
  ]);
}
