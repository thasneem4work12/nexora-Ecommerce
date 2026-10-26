import { prisma } from "@/lib/prisma";
import { SaaSBillingInterval } from "@prisma/client";

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  maxProducts: number;
  maxStaff: number;
  maxStorageMb?: number;
  allowCustomThemes?: boolean;
  allowAdvancedAnalytics?: boolean;
  allowPrioritySupport?: boolean;
  trialDays?: number;
  sortOrder?: number;
  features?: string[];
  monthlyPriceInCents: number;
  yearlyPriceInCents: number;
  currency?: string;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  maxProducts?: number;
  maxStaff?: number;
  maxStorageMb?: number;
  allowCustomThemes?: boolean;
  allowAdvancedAnalytics?: boolean;
  allowPrioritySupport?: boolean;
  trialDays?: number;
  sortOrder?: number;
  features?: string[];
}

export async function getPublicPlans() {
  return prisma.saaSPlan.findMany({
    where: {
      isActive: true,
      isPublic: true,
    },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { version: "desc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllPlans() {
  const plans = await prisma.saaSPlan.findMany({
    include: {
      prices: {
        orderBy: [{ interval: "asc" }, { version: "desc" }],
      },
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return plans;
}

export async function getPlanByCode(code: string) {
  return prisma.saaSPlan.findUnique({
    where: { code },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { version: "desc" },
      },
    },
  });
}

export async function getPlanById(id: string) {
  return prisma.saaSPlan.findUnique({
    where: { id },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { version: "desc" },
      },
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });
}

export async function createPlan(data: CreatePlanInput) {
  const currency = data.currency || "USD";

  return prisma.$transaction(async (tx) => {
    const existing = await tx.saaSPlan.findUnique({
      where: { code: data.code.trim().toLowerCase() },
    });
    if (existing) {
      throw new Error(`A plan with code '${data.code}' already exists.`);
    }

    const plan = await tx.saaSPlan.create({
      data: {
        code: data.code.trim().toLowerCase(),
        name: data.name,
        description: data.description,
        isPublic: data.isPublic ?? true,
        maxProducts: data.maxProducts,
        maxStaff: data.maxStaff,
        maxStorageMb: data.maxStorageMb ?? 1000,
        allowCustomThemes: data.allowCustomThemes ?? false,
        allowAdvancedAnalytics: data.allowAdvancedAnalytics ?? false,
        allowPrioritySupport: data.allowPrioritySupport ?? false,
        trialDays: data.trialDays ?? 14,
        sortOrder: data.sortOrder ?? 0,
        features: data.features ?? [],
      },
    });

    await tx.saaSPlanPrice.create({
      data: {
        planId: plan.id,
        interval: SaaSBillingInterval.MONTHLY,
        currency,
        amountInCents: data.monthlyPriceInCents,
        version: 1,
        isActive: true,
      },
    });

    await tx.saaSPlanPrice.create({
      data: {
        planId: plan.id,
        interval: SaaSBillingInterval.YEARLY,
        currency,
        amountInCents: data.yearlyPriceInCents,
        version: 1,
        isActive: true,
      },
    });

    return plan;
  });
}

export async function updatePlan(id: string, data: UpdatePlanInput) {
  return prisma.saaSPlan.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      isPublic: data.isPublic,
      maxProducts: data.maxProducts,
      maxStaff: data.maxStaff,
      maxStorageMb: data.maxStorageMb,
      allowCustomThemes: data.allowCustomThemes,
      allowAdvancedAnalytics: data.allowAdvancedAnalytics,
      allowPrioritySupport: data.allowPrioritySupport,
      trialDays: data.trialDays,
      sortOrder: data.sortOrder,
      features: data.features,
    },
    include: {
      prices: true,
    },
  });
}

export async function updatePlanPricing(
  planId: string,
  interval: SaaSBillingInterval,
  newAmountInCents: number,
  currency: string = "USD"
) {
  return prisma.$transaction(async (tx) => {
    // Find latest version of current price
    const latestPrice = await tx.saaSPlanPrice.findFirst({
      where: { planId, interval },
      orderBy: { version: "desc" },
    });

    const nextVersion = (latestPrice?.version ?? 0) + 1;

    // Create a new version of the price so existing subscribers keep historical pricing!
    const newPrice = await tx.saaSPlanPrice.create({
      data: {
        planId,
        interval,
        amountInCents: newAmountInCents,
        currency,
        version: nextVersion,
        isActive: true,
      },
    });

    return newPrice;
  });
}
