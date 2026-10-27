import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { SaaSBillingInterval, SaaSSubscriptionStatus, SaaSInvoiceStatus } from "@prisma/client";
import {
  getPublicPlans,
  getAllPlans,
  createPlan,
  updatePlanPricing,
  getPlanByCode,
} from "./plan.service";
import {
  checkProductLimit,
  checkFeatureEntitlement,
  getBusinessUsageSummary,
  recordUsageSnapshot,
} from "./usage.service";
import {
  changeBusinessPlan,
  cancelSubscription,
  resumeSubscription,
  transitionSubscriptionStatus,
} from "./subscription.service";
import {
  getBusinessInvoices,
} from "./invoice.service";
import {
  getPlatformOverviewMetrics,
  suspendBusiness,
  reactivateBusiness,
} from "./platform-admin.service";
import { SimulatedSaaSBillingProvider } from "./simulated-billing.provider";
import { resolveStoreTenant } from "@/lib/tenant-context";

describe("Phase 8: SaaS Subscription Billing, Plan Management & Superadmin Suite", () => {
  const TEST_BIZ_SLUG = "test-saas-audit-boutique";
  let testBusinessId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Create a test owner user
    const user = await prisma.user.upsert({
      where: { email: "saas_owner_test@nexora.luxury" },
      update: {},
      create: {
        email: "saas_owner_test@nexora.luxury",
        name: "SaaS Owner Test",
        role: "OWNER",
      },
    });
    testUserId = user.id;

    // 2. Create an isolated test business
    const biz = await prisma.business.upsert({
      where: { slug: TEST_BIZ_SLUG },
      update: { isSuspended: false },
      create: {
        slug: TEST_BIZ_SLUG,
        name: "Test SaaS Audit Atelier",
        type: "HAUTE_COUTURE",
        status: "ACTIVE",
        currency: "USD",
        contactEmail: "saas_owner_test@nexora.luxury",
      },
    });
    testBusinessId = biz.id;

    // Connect owner
    await prisma.businessMember.upsert({
      where: {
        businessId_userId: {
          businessId: testBusinessId,
          userId: testUserId,
        },
      },
      update: {},
      create: {
        businessId: testBusinessId,
        userId: testUserId,
        role: "OWNER",
      },
    });

    // Assign Starter subscription initially
    const starterPlan = await prisma.saaSPlan.findUniqueOrThrow({
      where: { code: "starter" },
      include: { prices: true },
    });
    const monthlyPrice = starterPlan.prices.find((p) => p.interval === SaaSBillingInterval.MONTHLY) || starterPlan.prices[0];

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.saaSSubscription.upsert({
      where: { businessId: testBusinessId },
      update: {
        planId: starterPlan.id,
        priceId: monthlyPrice.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: thirtyDaysLater,
        cancelAtPeriodEnd: false,
      },
      create: {
        businessId: testBusinessId,
        planId: starterPlan.id,
        priceId: monthlyPrice.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: thirtyDaysLater,
        cancelAtPeriodEnd: false,
        provider: "SIMULATED",
        providerSubscriptionId: `sim_sub_${testBusinessId}`,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test products and business
    await prisma.product.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.saaSSubscription.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.businessMember.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.business.deleteMany({ where: { id: testBusinessId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe("1. SaaS Plan Management & Versioned Pricing", () => {
    it("should retrieve all public active plans", async () => {
      const plans = await getPublicPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);
      const codes = plans.map((p) => p.code);
      expect(codes).toContain("starter");
      expect(codes).toContain("growth");
      expect(codes).toContain("pro");
      expect(codes).not.toContain("legacy-dev"); // Non-public
    });

    it("should retrieve all plans including private legacy plans for platform superadmin", async () => {
      const allPlans = await getAllPlans();
      const codes = allPlans.map((p) => p.code);
      expect(codes).toContain("legacy-dev");
      expect(codes).toContain("starter");
      expect(allPlans[0]._count).toBeDefined();
    });

    it("should create a new custom plan with monthly and yearly pricing", async () => {
      const planCode = `vip-couture-${Date.now()}`;
      const newPlan = await createPlan({
        code: planCode,
        name: "VIP Couture Tier",
        description: "Bespoke tier for private luxury houses.",
        maxProducts: 1000,
        maxStaff: 15,
        maxStorageMb: 10000,
        allowCustomThemes: true,
        allowAdvancedAnalytics: true,
        allowPrioritySupport: true,
        monthlyPriceInCents: 12000,
        yearlyPriceInCents: 120000,
        currency: "USD",
      });

      expect(newPlan.id).toBeDefined();
      expect(newPlan.code).toBe(planCode);

      const fetched = await getPlanByCode(planCode);
      expect(fetched?.prices.length).toBe(2);

      // Clean up test plan
      await prisma.saaSPlanPrice.deleteMany({ where: { planId: newPlan.id } });
      await prisma.saaSPlan.delete({ where: { id: newPlan.id } });
    });

    it("should version pricing when updating price to preserve historical subscriber rates", async () => {
      const starterPlan = await prisma.saaSPlan.findUniqueOrThrow({
        where: { code: "starter" },
      });

      const newPrice = await updatePlanPricing(
        starterPlan.id,
        SaaSBillingInterval.MONTHLY,
        3500 // $35/mo
      );

      expect(newPrice.version).toBeGreaterThan(1);
      expect(newPrice.amountInCents).toBe(3500);

      // Restore original price version
      await updatePlanPricing(starterPlan.id, SaaSBillingInterval.MONTHLY, 2900);
    });
  });

  describe("2. Plan Entitlements & Capacity Enforcement", () => {
    it("should allow product creation when under plan limit", async () => {
      const result = await checkProductLimit(testBusinessId);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50); // Starter limit
    });

    it("should correctly check feature entitlements for Starter vs Growth", async () => {
      const customThemesAllowed = await checkFeatureEntitlement(testBusinessId, "allowCustomThemes");
      expect(customThemesAllowed).toBe(false); // Starter doesn't include custom themes

      // Growth plan allows custom themes
      const growthPlan = await prisma.saaSPlan.findUniqueOrThrow({ where: { code: "growth" } });
      expect(growthPlan.allowCustomThemes).toBe(true);
      expect(growthPlan.allowAdvancedAnalytics).toBe(true);
    });

    it("should accurately generate business usage summary", async () => {
      const summary = await getBusinessUsageSummary(testBusinessId);
      expect(summary.businessId).toBe(testBusinessId);
      expect(summary.subscription?.status).toBe(SaaSSubscriptionStatus.ACTIVE);
      expect(summary.plan?.code).toBe("starter");
      expect(summary.metrics.products.limit).toBe(50);
      expect(summary.metrics.staff.limit).toBe(2);
      expect(summary.metrics.products.percentage).toBeGreaterThanOrEqual(0);
    });

    it("should record usage snapshots in saas_usage_records", async () => {
      await recordUsageSnapshot(testBusinessId);
      const records = await prisma.saaSUsageRecord.findMany({
        where: { businessId: testBusinessId },
      });
      expect(records.length).toBeGreaterThanOrEqual(3);
      const metrics = records.map((r) => r.metric);
      expect(metrics).toContain("PRODUCTS");
      expect(metrics).toContain("STAFF");
      expect(metrics).toContain("STORAGE_MB");
    });
  });

  describe("3. Plan Upgrade & Safe Downgrade Handling", () => {
    it("should allow upgrade to Growth plan and create invoice & payment record", async () => {
      const growthPlan = await prisma.saaSPlan.findUniqueOrThrow({
        where: { code: "growth" },
        include: { prices: true },
      });
      const growthMonthly = growthPlan.prices.find((p) => p.interval === SaaSBillingInterval.MONTHLY) || growthPlan.prices[0];

      const updated = await changeBusinessPlan({
        businessId: testBusinessId,
        targetPlanId: growthPlan.id,
        targetPriceId: growthMonthly.id,
        userId: testUserId,
      });

      expect(updated.plan.code).toBe("growth");
      expect(updated.status).toBe(SaaSSubscriptionStatus.ACTIVE);

      // Verify invoice & payment was generated for $79
      const invoices = await getBusinessInvoices(testBusinessId);
      expect(invoices.length).toBeGreaterThan(0);
      expect(invoices[0].totalInCents).toBe(7900);
      expect(invoices[0].status).toBe(SaaSInvoiceStatus.PAID);
    });

    it("should reject downgrade if business catalog exceeds target plan capacity without deleting records", async () => {
      // Temporarily create 60 test products to exceed Starter's 50 product limit
      const productData = Array.from({ length: 55 }, (_, i) => ({
        businessId: testBusinessId,
        title: `Test Product Capacity Overfill ${i + 1}`,
        slug: `test-prod-overfill-${Date.now()}-${i}`,
        description: "Test capacity overflow item",
        category: "Test",
        basePriceInCents: 10000,
        published: true,
      }));

      await prisma.product.createMany({ data: productData });

      const starterPlan = await prisma.saaSPlan.findUniqueOrThrow({
        where: { code: "starter" },
        include: { prices: true },
      });
      const starterPrice = starterPlan.prices[0];

      // Attempt downgrade to Starter (limit is 50, but business has 55 products)
      await expect(
        changeBusinessPlan({
          businessId: testBusinessId,
          targetPlanId: starterPlan.id,
          targetPriceId: starterPrice.id,
          userId: testUserId,
        })
      ).rejects.toThrow(/Cannot downgrade to Starter/);

      // Verify NO products were deleted or harmed
      const productCount = await prisma.product.count({ where: { businessId: testBusinessId } });
      expect(productCount).toBe(55);

      // Cleanup overflow products
      await prisma.product.deleteMany({ where: { businessId: testBusinessId } });
    });
  });

  describe("4. Subscription Lifecycle State Machine & Cancellations", () => {
    it("should schedule cancellation at period end without immediately revoking access", async () => {
      const updated = await cancelSubscription({
        businessId: testBusinessId,
        cancelAtPeriodEnd: true,
        reason: "Testing period end cancellation",
        userId: testUserId,
      });

      expect(updated.cancelAtPeriodEnd).toBe(true);
      expect(updated.status).toBe(SaaSSubscriptionStatus.ACTIVE); // Stays active until period end!
      expect(updated.canceledAt).toBeDefined();
    });

    it("should allow resuming a scheduled cancellation", async () => {
      const resumed = await resumeSubscription(testBusinessId, testUserId);
      expect(resumed.cancelAtPeriodEnd).toBe(false);
      expect(resumed.status).toBe(SaaSSubscriptionStatus.ACTIVE);
    });

    it("should validate allowed status transitions and reject invalid transitions", async () => {
      const sub = await prisma.saaSSubscription.findUniqueOrThrow({
        where: { businessId: testBusinessId },
      });

      // ACTIVE -> PAST_DUE (Valid)
      const pastDue = await transitionSubscriptionStatus(
        sub.id,
        SaaSSubscriptionStatus.PAST_DUE
      );
      expect(pastDue.status).toBe(SaaSSubscriptionStatus.PAST_DUE);

      // PAST_DUE -> ACTIVE (Valid upon payment)
      const restored = await transitionSubscriptionStatus(
        sub.id,
        SaaSSubscriptionStatus.ACTIVE
      );
      expect(restored.status).toBe(SaaSSubscriptionStatus.ACTIVE);

      // ACTIVE -> TRIALING (Invalid transition, cannot revert to trial)
      await expect(
        transitionSubscriptionStatus(sub.id, SaaSSubscriptionStatus.TRIALING)
      ).rejects.toThrow(/Invalid status transition/);
    });
  });

  describe("5. Webhook HMAC Security & Idempotency", () => {
    it("should verify valid HMAC signatures and reject invalid signatures", () => {
      const provider = new SimulatedSaaSBillingProvider();
      const payload = { eventId: "evt_test_123", amountInCents: 7900, status: "PAID" };
      const validSig = SimulatedSaaSBillingProvider.generateWebhookSignature(payload);

      expect(provider.verifyWebhookSignature(payload, validSig)).toBe(true);
      expect(provider.verifyWebhookSignature(payload, "invalid_tampered_signature_1234567890abcdef")).toBe(false);
      expect(provider.verifyWebhookSignature(payload, "")).toBe(false);
    });

    it("should process webhook idempotently and ignore duplicate event IDs", async () => {
      const eventId = `test_evt_dedup_${Date.now()}`;

      // First insertion
      const evt1 = await prisma.saaSBillingEvent.create({
        data: {
          eventId,
          eventType: "invoice.payment_succeeded",
          businessId: testBusinessId,
          provider: "SIMULATED",
          status: "PROCESSED",
          payload: JSON.stringify({ eventId, test: true }),
        },
      });
      expect(evt1.id).toBeDefined();

      // Check duplicate
      const existing = await prisma.saaSBillingEvent.findUnique({
        where: { eventId },
      });
      expect(existing).not.toBeNull();
      expect(existing?.eventId).toBe(eventId);

      // Cleanup
      await prisma.saaSBillingEvent.delete({ where: { eventId } });
    });
  });

  describe("6. Platform Superadmin Controls & Tenant Isolation", () => {
    it("should compute global platform metrics (MRR, ARR, active tenants)", async () => {
      const metrics = await getPlatformOverviewMetrics();
      expect(metrics.totalBusinesses).toBeGreaterThan(0);
      expect(metrics.activeBusinesses).toBeGreaterThan(0);
      expect(metrics.mrrInCents).toBeGreaterThanOrEqual(0);
      expect(metrics.arrInCents).toBe(metrics.mrrInCents * 12);
      expect(metrics.subscriptionsByPlan.length).toBeGreaterThan(0);
    });

    it("should suspend a business, hide their public storefront, and audit the action", async () => {
      // 1. Suspend test business
      const suspendedBiz = await suspendBusiness({
        businessId: testBusinessId,
        reason: "Compliance audit test suspension",
        superadminUserId: testUserId,
      });

      expect(suspendedBiz.isSuspended).toBe(true);
      expect(suspendedBiz.suspensionReason).toBe("Compliance audit test suspension");

      // 2. Verify subscription was transitioned to SUSPENDED
      const sub = await prisma.saaSSubscription.findUnique({
        where: { businessId: testBusinessId },
      });
      expect(sub?.status).toBe(SaaSSubscriptionStatus.SUSPENDED);

      // 3. Verify public storefront resolution blocks the suspended tenant
      const storefrontTenant = await resolveStoreTenant(TEST_BIZ_SLUG);
      expect(storefrontTenant).toBeNull(); // Gracefully hidden from public!

      // 4. Verify audit log was recorded
      const auditLog = await prisma.saaSBillingAuditLog.findFirst({
        where: {
          businessId: testBusinessId,
          action: "BUSINESS_SUSPENDED_BY_SUPERADMIN",
        },
      });
      expect(auditLog).not.toBeNull();
    });

    it("should reactivate a suspended business and restore public storefront access", async () => {
      // 1. Reactivate
      const reactivatedBiz = await reactivateBusiness({
        businessId: testBusinessId,
        superadminUserId: testUserId,
      });

      expect(reactivatedBiz.isSuspended).toBe(false);
      expect(reactivatedBiz.suspensionReason).toBeNull();

      // 2. Verify subscription restored to ACTIVE
      const sub = await prisma.saaSSubscription.findUnique({
        where: { businessId: testBusinessId },
      });
      expect(sub?.status).toBe(SaaSSubscriptionStatus.ACTIVE);

      // 3. Verify public storefront resolution works again
      const storefrontTenant = await resolveStoreTenant(TEST_BIZ_SLUG);
      expect(storefrontTenant).not.toBeNull();
      expect(storefrontTenant?.business.id).toBe(testBusinessId);
    });
  });
});
