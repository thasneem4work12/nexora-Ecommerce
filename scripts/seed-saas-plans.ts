import { PrismaClient, SaaSBillingInterval, SaaSSubscriptionStatus, SaaSInvoiceStatus, SaaSPaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const SEED_PLANS = [
  {
    code: "starter",
    name: "Starter",
    description: "Essential commerce tools for boutique brands launching their online presence.",
    isActive: true,
    isPublic: true,
    maxProducts: 50,
    maxStaff: 2,
    maxStorageMb: 1000,
    allowCustomThemes: false,
    allowAdvancedAnalytics: false,
    allowPrioritySupport: false,
    trialDays: 14,
    sortOrder: 1,
    features: [
      "Up to 50 active products",
      "2 staff member accounts",
      "1 GB media & asset storage",
      "Editorial Luxury & Minimal themes",
      "Standard analytics & reporting",
      "Standard email support",
    ],
    prices: [
      { interval: SaaSBillingInterval.MONTHLY, amountInCents: 2900, currency: "USD" },
      { interval: SaaSBillingInterval.YEARLY, amountInCents: 29000, currency: "USD" }, // 2 months free equivalent
    ],
  },
  {
    code: "growth",
    name: "Growth",
    description: "Scale your business with high-volume capacity, team collaboration, and advanced insights.",
    isActive: true,
    isPublic: true,
    maxProducts: 500,
    maxStaff: 10,
    maxStorageMb: 5000,
    allowCustomThemes: true,
    allowAdvancedAnalytics: true,
    allowPrioritySupport: false,
    trialDays: 14,
    sortOrder: 2,
    features: [
      "Up to 500 active products",
      "10 staff member accounts",
      "5 GB media & asset storage",
      "All 4 built-in luxury themes",
      "Advanced sales & customer analytics",
      "Staff role-based access control",
      "Priority email support",
    ],
    prices: [
      { interval: SaaSBillingInterval.MONTHLY, amountInCents: 7900, currency: "USD" },
      { interval: SaaSBillingInterval.YEARLY, amountInCents: 79000, currency: "USD" },
    ],
  },
  {
    code: "pro",
    name: "Pro",
    description: "Unrestricted enterprise capacity, custom branding engine, and dedicated platform support.",
    isActive: true,
    isPublic: true,
    maxProducts: 2500,
    maxStaff: 25,
    maxStorageMb: 25000,
    allowCustomThemes: true,
    allowAdvancedAnalytics: true,
    allowPrioritySupport: true,
    trialDays: 14,
    sortOrder: 3,
    features: [
      "Up to 2,500 active products",
      "25 staff member accounts",
      "25 GB high-performance media storage",
      "Custom branding engine & theme overrides",
      "Real-time analytics, export & auditing",
      "Dedicated 24/7 priority support",
      "Unlimited storefront page views",
    ],
    prices: [
      { interval: SaaSBillingInterval.MONTHLY, amountInCents: 19900, currency: "USD" },
      { interval: SaaSBillingInterval.YEARLY, amountInCents: 199000, currency: "USD" },
    ],
  },
  {
    code: "legacy-dev",
    name: "Developer / Legacy",
    description: "Complimentary full-capacity tier for early adopter businesses and sandbox development.",
    isActive: true,
    isPublic: false,
    maxProducts: 10000,
    maxStaff: 50,
    maxStorageMb: 50000,
    allowCustomThemes: true,
    allowAdvancedAnalytics: true,
    allowPrioritySupport: true,
    trialDays: 0,
    sortOrder: 99,
    features: [
      "Unlimited platform sandbox capabilities",
      "Grandfathered lifetime development status",
      "Full access to all themes and analytics",
      "Internal testing quota",
    ],
    prices: [
      { interval: SaaSBillingInterval.MONTHLY, amountInCents: 0, currency: "USD" },
      { interval: SaaSBillingInterval.YEARLY, amountInCents: 0, currency: "USD" },
    ],
  },
];

export async function seedSaaSPlans() {
  console.log("--- Seeding SaaS Plans & Prices ---");

  for (const planData of SEED_PLANS) {
    const { prices, ...planFields } = planData;
    const plan = await prisma.saaSPlan.upsert({
      where: { code: planFields.code },
      update: {
        name: planFields.name,
        description: planFields.description,
        isActive: planFields.isActive,
        isPublic: planFields.isPublic,
        maxProducts: planFields.maxProducts,
        maxStaff: planFields.maxStaff,
        maxStorageMb: planFields.maxStorageMb,
        allowCustomThemes: planFields.allowCustomThemes,
        allowAdvancedAnalytics: planFields.allowAdvancedAnalytics,
        allowPrioritySupport: planFields.allowPrioritySupport,
        trialDays: planFields.trialDays,
        sortOrder: planFields.sortOrder,
        features: planFields.features,
      },
      create: {
        ...planFields,
      },
    });

    console.log(`Plan upserted: ${plan.name} (${plan.code}) [ID: ${plan.id}]`);

    for (const price of prices) {
      await prisma.saaSPlanPrice.upsert({
        where: {
          planId_interval_version: {
            planId: plan.id,
            interval: price.interval,
            version: 1,
          },
        },
        update: {
          amountInCents: price.amountInCents,
          currency: price.currency,
          isActive: true,
        },
        create: {
          planId: plan.id,
          interval: price.interval,
          amountInCents: price.amountInCents,
          currency: price.currency,
          version: 1,
          isActive: true,
        },
      });
      console.log(`  Price upserted: ${price.interval} - $${(price.amountInCents / 100).toFixed(2)} ${price.currency}`);
    }
  }

  console.log("\n--- Migrating Existing Businesses to Safe Subscriptions ---");

  // Get the default legacy-dev plan and price
  const legacyPlan = await prisma.saaSPlan.findUniqueOrThrow({
    where: { code: "legacy-dev" },
    include: { prices: true },
  });
  const legacyMonthlyPrice = legacyPlan.prices.find((p) => p.interval === SaaSBillingInterval.MONTHLY) || legacyPlan.prices[0];

  const businesses = await prisma.business.findMany({
    include: { subscription: true },
  });

  const now = new Date();
  const tenYearsLater = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  for (const biz of businesses) {
    if (!biz.subscription) {
      console.log(`Migrating business [${biz.slug}] "${biz.name}" to Legacy Developer Plan...`);

      const sub = await prisma.saaSSubscription.create({
        data: {
          businessId: biz.id,
          planId: legacyPlan.id,
          priceId: legacyMonthlyPrice.id,
          status: SaaSSubscriptionStatus.ACTIVE,
          currentPeriodStartsAt: now,
          currentPeriodEndsAt: tenYearsLater,
          cancelAtPeriodEnd: false,
          provider: "SIMULATED",
          providerSubscriptionId: `sim_sub_legacy_${biz.id}`,
        },
      });

      // Create initial $0 invoice for records
      const invoiceNumber = `INV-SAAS-${Date.now().toString().slice(-6)}-${biz.slug.slice(0, 4).toUpperCase()}`;
      const invoice = await prisma.saaSInvoice.create({
        data: {
          invoiceNumber,
          businessId: biz.id,
          subscriptionId: sub.id,
          status: SaaSInvoiceStatus.PAID,
          currency: "USD",
          subtotalInCents: 0,
          taxInCents: 0,
          discountInCents: 0,
          totalInCents: 0,
          billingPeriodStartsAt: now,
          billingPeriodEndsAt: tenYearsLater,
          dueDate: now,
          paidAt: now,
          notes: "Initial migration to Phase 8 multi-tenant SaaS plan",
          lines: {
            create: {
              description: `Grandfathered Developer Plan Subscription (Lifetime) - ${biz.name}`,
              quantity: 1,
              unitAmountInCents: 0,
              totalAmountInCents: 0,
              currency: "USD",
              priceId: legacyMonthlyPrice.id,
            },
          },
        },
      });

      await prisma.saaSBillingAuditLog.create({
        data: {
          businessId: biz.id,
          action: "BUSINESS_LEGACY_MIGRATION",
          details: {
            planCode: legacyPlan.code,
            subscriptionId: sub.id,
            invoiceNumber: invoice.invoiceNumber,
            timestamp: now.toISOString(),
          },
        },
      });

      console.log(`  -> Created subscription ${sub.id} with invoice ${invoice.invoiceNumber}`);
    } else {
      console.log(`Business [${biz.slug}] already has subscription ${biz.subscription.id} (Status: ${biz.subscription.status})`);
    }
  }

  console.log("\nSaaS Plan seeding and business migration completed successfully!");
}

async function main() {
  try {
    await seedSaaSPlans();
  } catch (err) {
    console.error("Error seeding SaaS plans:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes("seed-saas-plans")) {
  main();
}
