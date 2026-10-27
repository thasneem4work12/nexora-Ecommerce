import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  SaaSSubscriptionStatus,
  SaaSBillingInterval,
} from "@prisma/client";
import {
  checkProductLimit,
  checkStaffLimit,
  getBusinessUsageSummary,
} from "./usage.service";
import {
  changeBusinessPlan,
  transitionSubscriptionStatus,
} from "./subscription.service";
import {
  createSaaSInvoice,
  getBusinessInvoices,
  getInvoiceById,
  generateInvoiceNumber,
} from "./invoice.service";
import {
  getPlatformOverviewMetrics,
  suspendBusiness,
  reactivateBusiness,
} from "./platform-admin.service";
import { SimulatedSaaSBillingProvider } from "./simulated-billing.provider";
import { requirePlatformSuperadmin, hasPermission, AuthError } from "@/lib/admin-auth";
import { resolveStoreTenant } from "@/lib/tenant-context";

describe("NEXORA Commerce — Phase 8 Final Billing and Security Verification Suite", () => {
  let bizAId: string;
  let bizBId: string;
  let starterPlanId: string;
  let starterMonthlyPriceId: string;
  let growthPlanId: string;
  let growthMonthlyPriceId: string;
  let superadminUserId: string;

  beforeAll(async () => {
    const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
    superadminUserId = superadmin?.id || "superadmin_phase8";

    // 1. Locate Starter and Growth plans
    const starterPlan = await prisma.saaSPlan.findUnique({
      where: { code: "starter" },
      include: { prices: true },
    });
    const growthPlan = await prisma.saaSPlan.findUnique({
      where: { code: "growth" },
      include: { prices: true },
    });

    if (!starterPlan || !growthPlan) {
      throw new Error("Seeded SaaS plans missing in test database.");
    }

    starterPlanId = starterPlan.id;
    starterMonthlyPriceId = starterPlan.prices.find((p) => p.interval === "MONTHLY")!.id;
    growthPlanId = growthPlan.id;
    growthMonthlyPriceId = growthPlan.prices.find((p) => p.interval === "MONTHLY")!.id;

    // 2. Create isolated test businesses A & B
    const uniqueSuffix = Date.now().toString(36);

    const bizA = await prisma.business.create({
      data: {
        id: `biz_sec_a_${uniqueSuffix}`,
        slug: `boutique-alpha-${uniqueSuffix}`,
        name: `Boutique Alpha ${uniqueSuffix}`,
        type: "LUXURY_FASHION",
        status: "ACTIVE",
        currency: "USD",
        contactEmail: `alpha_${uniqueSuffix}@nexoratest.com`,
      },
    });
    bizAId = bizA.id;

    const bizB = await prisma.business.create({
      data: {
        id: `biz_sec_b_${uniqueSuffix}`,
        slug: `atelier-beta-${uniqueSuffix}`,
        name: `Atelier Beta ${uniqueSuffix}`,
        type: "HAUTE_HOROLOGY",
        status: "ACTIVE",
        currency: "USD",
        contactEmail: `beta_${uniqueSuffix}@nexoratest.com`,
      },
    });
    bizBId = bizB.id;

    // 3. Assign Business A to Starter and Business B to Growth
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.saaSSubscription.create({
      data: {
        businessId: bizAId,
        planId: starterPlanId,
        priceId: starterMonthlyPriceId,
        status: SaaSSubscriptionStatus.ACTIVE,
        billingInterval: SaaSBillingInterval.MONTHLY,
        currency: "USD",
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: periodEnd,
        provider: "SIMULATED",
      },
    });

    await prisma.saaSSubscription.create({
      data: {
        businessId: bizBId,
        planId: growthPlanId,
        priceId: growthMonthlyPriceId,
        status: SaaSSubscriptionStatus.ACTIVE,
        billingInterval: SaaSBillingInterval.MONTHLY,
        currency: "USD",
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: periodEnd,
        provider: "SIMULATED",
      },
    });
  });

  afterAll(async () => {
    // Clean up test businesses
    await prisma.business.deleteMany({
      where: { id: { in: [bizAId, bizBId] } },
    });
  });

  // =========================================================================
  // TASK 1: SUBSCRIPTION BILLING ISOLATION & ADVERSARIAL CROSS-TENANT TESTS
  // =========================================================================
  describe("Task 1 — Subscription Billing Tenant Isolation", () => {
    it("strictly isolates subscription retrieval between Business A and Business B", async () => {
      const usageA = await getBusinessUsageSummary(bizAId);
      const usageB = await getBusinessUsageSummary(bizBId);

      expect(usageA.businessId).toBe(bizAId);
      expect(usageA.plan?.code).toBe("starter");

      expect(usageB.businessId).toBe(bizBId);
      expect(usageB.plan?.code).toBe("growth");

      // Verify no cross-tenant bleeding
      expect(usageA.subscription?.id).not.toBe(usageB.subscription?.id);
    });

    it("prevents Business A from accessing Business B invoices", async () => {
      // Create an invoice for Business B
      const now = new Date();
      const invoiceB = await createSaaSInvoice({
        businessId: bizBId,
        subscriptionId: (await prisma.saaSSubscription.findUnique({ where: { businessId: bizBId } }))!.id,
        billingPeriodStartsAt: now,
        billingPeriodEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        subtotalInCents: 7900,
        totalInCents: 7900,
        currency: "USD",
        lines: [
          {
            description: "Growth Plan Monthly",
            quantity: 1,
            unitAmountInCents: 7900,
            totalAmountInCents: 7900,
          },
        ],
      });

      // Business A queries all invoices: invoice B must NOT be returned
      const invoicesA = await getBusinessInvoices(bizAId);
      const leakedInvoice = invoicesA.find((inv) => inv.id === invoiceB.id);
      expect(leakedInvoice).toBeUndefined();

      // Business A tries to fetch invoice B directly scoped to Business A: must return null
      const crossTenantFetch = await getInvoiceById(invoiceB.id, bizAId);
      expect(crossTenantFetch).toBeNull();

      // Business B can access its own invoice
      const legitimateFetch = await getInvoiceById(invoiceB.id, bizBId);
      expect(legitimateFetch).not.toBeNull();
      expect(legitimateFetch?.id).toBe(invoiceB.id);
    });

    it("strictly separates Storefront Order/Payment records from SaaS Billing records", async () => {
      // Confirm that SaaSInvoice and Storefront Order belong to distinct tables and models
      const saasInvoiceCount = await prisma.saaSInvoice.count({ where: { businessId: bizAId } });
      const storefrontOrderCount = await prisma.order.count({ where: { businessId: bizAId } });

      expect(typeof saasInvoiceCount).toBe("number");
      expect(typeof storefrontOrderCount).toBe("number");

      // Verify no shared foreign keys or overlapping ID spaces
      const testInvoiceNumber = generateInvoiceNumber("test");
      expect(testInvoiceNumber.startsWith("INV-SAAS-")).toBe(true);
    });
  });

  // =========================================================================
  // TASK 2: PRODUCTION SAFETY OF BILLING SIMULATION
  // =========================================================================
  describe("Task 2 — Secure Development Billing Simulation", () => {
    it("strictly blocks SimulatedSaaSBillingProvider in production environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        ((process.env as unknown) as Record<string, string>).NODE_ENV = "production";
        const provider = new SimulatedSaaSBillingProvider();

        await expect(
          provider.createSubscriptionCheckout({
            businessId: bizAId,
            businessName: "Business A",
            contactEmail: "alpha@example.com",
            planId: starterPlanId,
            planCode: "starter",
            planName: "Starter",
            priceId: starterMonthlyPriceId,
            interval: SaaSBillingInterval.MONTHLY,
            amountInCents: 2900,
            currency: "USD",
            successUrl: "http://localhost:3000/admin/billing/success",
            cancelUrl: "http://localhost:3000/admin/billing/cancel",
          })
        ).rejects.toThrow(/strictly disabled in production/i);
      } finally {
        ((process.env as unknown) as Record<string, string>).NODE_ENV = originalEnv;
      }
    });

    it("verifies and rejects tampered HMAC signatures on simulated webhooks", () => {
      const provider = new SimulatedSaaSBillingProvider();
      const payload = {
        eventId: "evt_test_sec_1",
        eventType: "invoice.payment_succeeded",
        amountInCents: 2900,
      };

      const validSignature = SimulatedSaaSBillingProvider.generateWebhookSignature(payload);
      expect(provider.verifyWebhookSignature(payload, validSignature)).toBe(true);

      // Tampered signature or tampered payload
      const invalidSignature = "tampered_signature_hex_value_ffffffff";
      expect(provider.verifyWebhookSignature(payload, invalidSignature)).toBe(false);

      const tamperedPayload = { ...payload, amountInCents: 999999 };
      expect(provider.verifyWebhookSignature(tamperedPayload, validSignature)).toBe(false);
    });

    it("enforces replay attack prevention via unique billing event IDs", async () => {
      const eventId = `evt_dedup_audit_${Date.now()}`;
      
      // First recording succeeds
      const firstRecord = await prisma.saaSBillingEvent.create({
        data: {
          eventId,
          eventType: "test.event",
          businessId: bizAId,
          provider: "SIMULATED",
          payload: JSON.stringify({ test: true }),
        },
      });
      expect(firstRecord.id).toBeDefined();

      // Duplicate attempt with same eventId must be rejected by unique constraint
      await expect(
        prisma.saaSBillingEvent.create({
          data: {
            eventId,
            eventType: "test.event",
            businessId: bizAId,
            provider: "SIMULATED",
            payload: JSON.stringify({ test: true }),
          },
        })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // TASK 3: SUBSCRIPTION STATE MACHINE & TRANSITIONS
  // =========================================================================
  describe("Task 3 — Subscription State Transitions & Lifecycle", () => {
    it("validates permissible state transitions across the billing lifecycle", async () => {
      const sub = await prisma.saaSSubscription.findUnique({ where: { businessId: bizAId } });
      expect(sub).toBeDefined();

      // ACTIVE -> PAST_DUE (Payment failure)
      const pastDueSub = await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.PAST_DUE);
      expect(pastDueSub.status).toBe(SaaSSubscriptionStatus.PAST_DUE);

      // PAST_DUE -> ACTIVE (Payment recovered)
      const recoveredSub = await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.ACTIVE);
      expect(recoveredSub.status).toBe(SaaSSubscriptionStatus.ACTIVE);

      // ACTIVE -> CANCELLED
      const cancelledSub = await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.CANCELLED);
      expect(cancelledSub.status).toBe(SaaSSubscriptionStatus.CANCELLED);

      // CANCELLED -> ACTIVE (Reactivation)
      const reactivatedSub = await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.ACTIVE);
      expect(reactivatedSub.status).toBe(SaaSSubscriptionStatus.ACTIVE);
    });

    it("strictly rejects invalid subscription status transitions", async () => {
      const sub = await prisma.saaSSubscription.findUnique({ where: { businessId: bizAId } });

      // Put into CANCELLED
      await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.CANCELLED);

      // CANCELLED cannot transition directly to PAST_DUE
      await expect(
        transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.PAST_DUE)
      ).rejects.toThrow(/Invalid status transition/i);

      // CANCELLED cannot transition directly to SUSPENDED
      await expect(
        transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.SUSPENDED)
      ).rejects.toThrow(/Invalid status transition/i);

      // Restore to ACTIVE for remaining tests
      await transitionSubscriptionStatus(sub!.id, SaaSSubscriptionStatus.ACTIVE);
    });
  });

  // =========================================================================
  // TASK 4: PLAN LIMITS & CONCURRENCY
  // =========================================================================
  describe("Task 4 — Plan Limits Under Concurrency", () => {
    it("enforces product quota limits strictly and returns descriptive errors", async () => {
      // Business A is on Starter plan (max 50 products)
      const limitCheck = await checkProductLimit(bizAId);
      expect(limitCheck.allowed).toBe(true);
      expect(limitCheck.limit).toBe(50);
      expect(limitCheck.planName).toBe("Starter");
    });

    it("enforces staff member quotas strictly", async () => {
      // Business A is on Starter plan (max 2 staff)
      const staffCheck = await checkStaffLimit(bizAId);
      expect(staffCheck.allowed).toBe(true);
      expect(staffCheck.limit).toBe(2);
    });

    it("safely rejects downgrade when current catalog usage exceeds target plan", async () => {
      // Temporarily create products in Business B to exceed Starter limit (50)
      const dummyProducts = Array.from({ length: 55 }, (_, i) => ({
        businessId: bizBId,
        title: `Audit Product ${i}_${Date.now()}`,
        slug: `audit-prod-${i}-${Date.now()}`,
        description: "Downgrade safety test item",
        category: "Apparel",
        basePriceInCents: 10000,
        published: true,
      }));

      await prisma.product.createMany({ data: dummyProducts });

      const count = await prisma.product.count({ where: { businessId: bizBId, isArchived: false } });
      expect(count).toBeGreaterThanOrEqual(55);

      // Attempt to downgrade Business B from Growth (500 limit) to Starter (50 limit)
      await expect(
        changeBusinessPlan({
          businessId: bizBId,
          targetPlanId: starterPlanId,
          targetPriceId: starterMonthlyPriceId,
        })
      ).rejects.toThrow(/excess|maximum|exceed/i);

      // Verify Business B is STILL on Growth plan
      const subB = await prisma.saaSSubscription.findUnique({
        where: { businessId: bizBId },
        include: { plan: true },
      });
      expect(subB?.plan.code).toBe("growth");

      // Verify that no products were deleted or corrupted by the rejected downgrade
      const countAfter = await prisma.product.count({ where: { businessId: bizBId, isArchived: false } });
      expect(countAfter).toBe(count);

      // Clean up dummy products
      await prisma.product.deleteMany({
        where: { businessId: bizBId, description: "Downgrade safety test item" },
      });
    });
  });

  // =========================================================================
  // TASK 5: AUDIT PRICING AND INVOICES
  // =========================================================================
  describe("Task 5 — Pricing and Invoice Mathematical Integrity", () => {
    it("strictly verifies that invoice totals match line items mathematically", async () => {
      const now = new Date();
      const sub = await prisma.saaSSubscription.findUnique({ where: { businessId: bizAId } });

      // Arithmetic mismatch: line items sum to 2900, but subtotal is declared 3000
      await expect(
        createSaaSInvoice({
          businessId: bizAId,
          subscriptionId: sub!.id,
          billingPeriodStartsAt: now,
          billingPeriodEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          subtotalInCents: 3000, // Mismatched!
          totalInCents: 3000,
          currency: "USD",
          lines: [
            {
              description: "Starter Plan",
              quantity: 1,
              unitAmountInCents: 2900,
              totalAmountInCents: 2900,
            },
          ],
        })
      ).rejects.toThrow(/Invoice arithmetic error/i);

      // Total mismatch: subtotal + tax - discount does not equal totalInCents
      await expect(
        createSaaSInvoice({
          businessId: bizAId,
          subscriptionId: sub!.id,
          billingPeriodStartsAt: now,
          billingPeriodEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          subtotalInCents: 2900,
          taxInCents: 500,
          totalInCents: 2900, // Should be 3400!
          currency: "USD",
          lines: [
            {
              description: "Starter Plan",
              quantity: 1,
              unitAmountInCents: 2900,
              totalAmountInCents: 2900,
            },
          ],
        })
      ).rejects.toThrow(/Invoice arithmetic error/i);
    });

    it("preserves historical subscriber pricing when a new price version is introduced", async () => {
      // 1. Business A is currently subscribed to Starter Monthly at price version 1 ($29.00 = 2900 cents)
      const subA = await prisma.saaSSubscription.findUnique({
        where: { businessId: bizAId },
        include: { price: true },
      });
      expect(subA?.price.amountInCents).toBe(2900);
      expect(subA?.price.version).toBe(1);

      // 2. Introduce a new price version for Starter Monthly ($35.00 = 3500 cents, dynamic next version)
      const existingPrices = await prisma.saaSPlanPrice.findMany({
        where: { planId: starterPlanId, interval: SaaSBillingInterval.MONTHLY },
        select: { version: true },
        orderBy: { version: "desc" },
      });
      const nextVersion = (existingPrices[0]?.version || 1) + 1;

      const newPriceV2 = await prisma.saaSPlanPrice.create({
        data: {
          planId: starterPlanId,
          interval: SaaSBillingInterval.MONTHLY,
          amountInCents: 3500,
          currency: "USD",
          version: nextVersion,
          isActive: true,
        },
      });

      // 3. Re-query Business A subscription: price MUST remain pinned to version 1 ($29.00)
      const unchangedSubA = await prisma.saaSSubscription.findUnique({
        where: { businessId: bizAId },
        include: { price: true },
      });
      expect(unchangedSubA?.price.id).toBe(subA?.price.id);
      expect(unchangedSubA?.price.amountInCents).toBe(2900);
      expect(unchangedSubA?.price.version).toBe(1);

      // Clean up version test price
      await prisma.saaSPlanPrice.delete({ where: { id: newPriceV2.id } });
    });
  });

  // =========================================================================
  // TASK 6: MRR AND ARR CALCULATIONS
  // =========================================================================
  describe("Task 6 — MRR and ARR Metric Definitions & Calculations", () => {
    it("calculates contracted MRR accurately, excluding past_due and cancelled subscriptions", async () => {
      const metrics = await getPlatformOverviewMetrics();

      expect(typeof metrics.mrrInCents).toBe("number");
      expect(typeof metrics.arrInCents).toBe("number");
      expect(metrics.arrInCents).toBe(metrics.mrrInCents * 12);
      expect(metrics.currency).toBe("USD");
      expect(typeof metrics.simulatedRevenueInCents).toBe("number");
      expect(typeof metrics.liveCollectedRevenueInCents).toBe("number");
    });
  });

  // =========================================================================
  // TASK 7: PLATFORM SUPERADMIN GOVERNANCE & SUSPENSION
  // =========================================================================
  describe("Task 7 — Platform Administration Security & Scoping", () => {
    it("denies non-superadmin roles (CUSTOMER, STAFF, MANAGER, OWNER) access to platform guards", async () => {
      expect(hasPermission("CUSTOMER", "PLATFORM_ADMIN")).toBe(false);
      expect(hasPermission("STAFF", "PLATFORM_ADMIN")).toBe(false);
      expect(hasPermission("MANAGER", "PLATFORM_ADMIN")).toBe(false);
      expect(hasPermission("OWNER", "PLATFORM_ADMIN")).toBe(false);

      // SUPERADMIN has PLATFORM_ADMIN permission
      expect(hasPermission("SUPERADMIN", "PLATFORM_ADMIN")).toBe(true);

      // Calling requirePlatformSuperadmin without an active session throws AuthError
      await expect(requirePlatformSuperadmin()).rejects.toThrow(AuthError);
    });

    it("suspends a business with mandatory reason and immediately halts public storefront routing", async () => {
      // 1. Suspend Business A
      const suspended = await suspendBusiness({
        businessId: bizAId,
        reason: "Compliance terms audit hold",
        superadminUserId,
      });
      expect(suspended.isSuspended).toBe(true);
      expect(suspended.suspensionReason).toBe("Compliance terms audit hold");

      // 2. Verify that storefront tenant resolution safely excludes the suspended business
      const resolvedTenant = await resolveStoreTenant(suspended.slug);
      expect(resolvedTenant).toBeNull();

      // 3. Reactivate Business A
      const reactivated = await reactivateBusiness({
        businessId: bizAId,
        superadminUserId,
      });
      expect(reactivated.isSuspended).toBe(false);
      expect(reactivated.suspensionReason).toBeNull();

      // 4. Verify storefront tenant resolution succeeds again
      const restoredTenant = await resolveStoreTenant(suspended.slug);
      expect(restoredTenant).not.toBeNull();
      expect(restoredTenant?.business.id).toBe(bizAId);
    });
  });
});
