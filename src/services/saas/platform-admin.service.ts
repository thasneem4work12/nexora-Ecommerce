import { prisma } from "@/lib/prisma";
import { Prisma, SaaSSubscriptionStatus, SaaSBillingInterval } from "@prisma/client";

export interface PlatformOverviewMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  mrrInCents: number;
  arrInCents: number;
  totalRevenueInCents: number;
  simulatedRevenueInCents: number;
  liveCollectedRevenueInCents: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmountInCents: number;
  currency: string;
  subscriptionsByStatus: Record<string, number>;
  subscriptionsByPlan: {
    planId: string;
    planName: string;
    planCode: string;
    count: number;
  }[];
  recentInvoices: unknown[];
  recentPayments: unknown[];
  recentAuditLogs: unknown[];
}

export async function getPlatformOverviewMetrics(): Promise<PlatformOverviewMetrics> {
  const [
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    subscriptions,
    plans,
    paidInvoices,
    unpaidInvoices,
    simulatedPaymentsSum,
    livePaymentsSum,
    recentInvoices,
    recentPayments,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isSuspended: false } }),
    prisma.business.count({ where: { isSuspended: true } }),
    prisma.saaSSubscription.findMany({
      include: {
        plan: true,
        price: true,
      },
    }),
    prisma.saaSPlan.findMany(),
    prisma.saaSInvoice.aggregate({
      where: { status: "PAID" },
      _sum: { totalInCents: true },
    }),
    prisma.saaSInvoice.aggregate({
      where: { status: { in: ["OPEN"] } },
      _count: true,
      _sum: { totalInCents: true },
    }),
    prisma.saaSPayment.aggregate({
      where: { provider: "SIMULATED", status: "SUCCEEDED" },
      _sum: { amountInCents: true },
    }),
    prisma.saaSPayment.aggregate({
      where: { provider: { not: "SIMULATED" }, status: "SUCCEEDED" },
      _sum: { amountInCents: true },
    }),
    prisma.saaSInvoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        business: { select: { id: true, name: true, slug: true } },
        subscription: { include: { plan: true } },
      },
    }),
    prisma.saaSPayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        business: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.saaSBillingAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        business: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  // Calculate MRR and subscriptions by status
  let mrrInCents = 0;
  const subscriptionsByStatus: Record<string, number> = {};
  const planCounts: Record<string, number> = {};

  for (const sub of subscriptions) {
    subscriptionsByStatus[sub.status] = (subscriptionsByStatus[sub.status] || 0) + 1;
    planCounts[sub.planId] = (planCounts[sub.planId] || 0) + 1;

    if (sub.status === SaaSSubscriptionStatus.ACTIVE) {
      if (sub.price.interval === SaaSBillingInterval.MONTHLY) {
        mrrInCents += sub.price.amountInCents;
      } else if (sub.price.interval === SaaSBillingInterval.YEARLY) {
        mrrInCents += Math.round(sub.price.amountInCents / 12);
      }
    }
  }

  const subscriptionsByPlan = plans.map((p) => ({
    planId: p.id,
    planName: p.name,
    planCode: p.code,
    count: planCounts[p.id] || 0,
  }));

  const arrInCents = mrrInCents * 12;
  const totalRevenueInCents = paidInvoices._sum.totalInCents || 0;
  const simulatedRevenueInCents = simulatedPaymentsSum._sum.amountInCents || 0;
  const liveCollectedRevenueInCents = livePaymentsSum._sum.amountInCents || 0;
  const unpaidInvoicesCount = unpaidInvoices._count || 0;
  const unpaidInvoicesAmountInCents = unpaidInvoices._sum.totalInCents || 0;

  return {
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    mrrInCents,
    arrInCents,
    totalRevenueInCents,
    simulatedRevenueInCents,
    liveCollectedRevenueInCents,
    unpaidInvoicesCount,
    unpaidInvoicesAmountInCents,
    currency: "USD",
    subscriptionsByStatus,
    subscriptionsByPlan,
    recentInvoices,
    recentPayments,
    recentAuditLogs,
  };
}

export async function getPlatformBusinessesList(params?: {
  query?: string;
  status?: string;
  planId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.BusinessWhereInput = {};
  if (params?.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { slug: { contains: params.query, mode: "insensitive" } },
    ];
  }

  if (params?.status === "SUSPENDED") {
    where.isSuspended = true;
  } else if (params?.status === "ACTIVE") {
    where.isSuspended = false;
  }

  if (params?.planId) {
    where.subscription = {
      planId: params.planId,
    };
  }

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: {
            plan: true,
            price: true,
          },
        },
        members: {
          where: { role: "OWNER" },
          include: { user: { select: { id: true, name: true, email: true } } },
          take: 1,
        },
        _count: {
          select: {
            products: true,
            members: true,
            orders: true,
          },
        },
      },
    }),
    prisma.business.count({ where }),
  ]);

  return {
    businesses,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPlatformBusinessDetail(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      subscription: {
        include: {
          plan: true,
          price: true,
          planChanges: {
            include: {
              fromPlan: true,
              toPlan: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      saasInvoices: {
        orderBy: { createdAt: "desc" },
        include: { lines: true, payments: true },
      },
      saasPayments: {
        orderBy: { createdAt: "desc" },
      },
      saasBillingAuditLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          products: true,
          orders: true,
          members: true,
        },
      },
    },
  });

  return business;
}

export async function suspendBusiness(params: {
  businessId: string;
  reason: string;
  superadminUserId: string;
  ipAddress?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id: params.businessId },
      include: { subscription: true },
    });

    if (!business) {
      throw new Error(`Business with ID ${params.businessId} not found.`);
    }

    const now = new Date();

    const updatedBiz = await tx.business.update({
      where: { id: params.businessId },
      data: {
        isSuspended: true,
        suspendedAt: now,
        suspensionReason: params.reason,
      },
    });

    if (business.subscription && business.subscription.status === SaaSSubscriptionStatus.ACTIVE) {
      await tx.saaSSubscription.update({
        where: { id: business.subscription.id },
        data: {
          status: SaaSSubscriptionStatus.SUSPENDED,
        },
      });
    }

    await tx.saaSBillingAuditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.superadminUserId,
        action: "BUSINESS_SUSPENDED_BY_SUPERADMIN",
        ipAddress: params.ipAddress,
        details: {
          reason: params.reason,
          timestamp: now.toISOString(),
        },
      },
    });

    return updatedBiz;
  });
}

export async function reactivateBusiness(params: {
  businessId: string;
  superadminUserId: string;
  ipAddress?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id: params.businessId },
      include: { subscription: true },
    });

    if (!business) {
      throw new Error(`Business with ID ${params.businessId} not found.`);
    }

    const now = new Date();

    const updatedBiz = await tx.business.update({
      where: { id: params.businessId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    if (business.subscription && business.subscription.status === SaaSSubscriptionStatus.SUSPENDED) {
      await tx.saaSSubscription.update({
        where: { id: business.subscription.id },
        data: {
          status: SaaSSubscriptionStatus.ACTIVE,
        },
      });
    }

    await tx.saaSBillingAuditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.superadminUserId,
        action: "BUSINESS_REACTIVATED_BY_SUPERADMIN",
        ipAddress: params.ipAddress,
        details: {
          timestamp: now.toISOString(),
        },
      },
    });

    return updatedBiz;
  });
}
