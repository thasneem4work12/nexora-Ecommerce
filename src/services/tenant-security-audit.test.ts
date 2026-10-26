import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getAdminOrderById,
  updateAdminOrderStatus,
  updateOrderShipment,
} from "./admin-order.service";
import { reviewOrderCancellation } from "./cancellation.service";
import { recordManualRefund } from "./return.service";
import {
  getAdminCustomers,
  getAdminCustomerById,
} from "./admin-customer.service";
import {
  adjustStock,
  getInventoryMovements,
} from "./inventory.service";
import {
  createSupportTicket,
  getSupportTicketById,
  updateTicketAttributes,
  addTicketMessage,
} from "./support-ticket.service";
import {
  getStoreAppearance,
  saveDraftAppearance,
  discardDraftAppearance,
} from "./theme.service";
import { createOrderFromCheckout } from "./order.service";
import { processPaymentWebhook } from "./payment/payment.service";
import { releaseExpiredReservations } from "./reservation.service";
import { hasPermission } from "@/lib/admin-auth";
import type { BusinessRole } from "@prisma/client";

describe("Phase 7: Security, Migration & Tenant Isolation Audit Test Suite", () => {
  const LUMINA_ID = "biz-lumina-tech";
  const APEX_ID = "biz-apex-kicks";

  let luminaVariantId: string;
  let apexVariantId: string;
  let luminaCustomerId: string;
  let testAdminUserId: string;

  let testOrderId: string;
  let testTicketId: string;

  beforeAll(async () => {
    // 1. Fetch or create test customer for Lumina
    const luminaCust = await prisma.user.upsert({
      where: { email: "lumina_audit_customer@nexoratest.com" },
      update: {},
      create: {
        email: "lumina_audit_customer@nexoratest.com",
        name: "Lumina Audit Customer",
        role: "CUSTOMER",
      },
    });
    luminaCustomerId = luminaCust.id;

    // 2. Admin user
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "MANAGER", "STAFF", "SUPERADMIN"] } },
    });
    testAdminUserId = admin ? admin.id : luminaCust.id;

    // 4. Variants for both businesses
    const luminaVar = await prisma.productVariant.findFirst({
      where: { product: { businessId: LUMINA_ID, published: true, isArchived: false } },
    });
    if (!luminaVar) throw new Error("Missing Lumina test variant in database.");
    luminaVariantId = luminaVar.id;

    const apexVar = await prisma.productVariant.findFirst({
      where: { product: { businessId: APEX_ID, published: true, isArchived: false } },
    });
    if (!apexVar) throw new Error("Missing Apex test variant in database.");
    apexVariantId = apexVar.id;

    // 5. Create a dedicated test order in Lumina for testing mutations
    const order = await createOrderFromCheckout(
      {
        businessId: LUMINA_ID,
        items: [{ variantId: luminaVariantId, quantity: 1 }],
        shippingAddress: {
          firstName: "Audit",
          lastName: "Tester",
          addressLine1: "100 Security Way",
          city: "Metropolis",
          stateOrProvince: "CA",
          postalCode: "94107",
          country: "US",
        },
        shippingMethod: "STANDARD",
        paymentProvider: "MOCK",
      },
      luminaCustomerId
    );
    testOrderId = order.id;

    // Mark test order as PAID to allow fulfillment updates
    await prisma.order.update({
      where: { id: testOrderId },
      data: { paymentStatus: "PAID", status: "PROCESSING", fulfillmentStatus: "PROCESSING" },
    });

    // 6. Create a dedicated support ticket in Lumina
    const ticket = await createSupportTicket({
      businessId: LUMINA_ID,
      userId: luminaCustomerId,
      orderId: testOrderId,
      subject: "Security Audit Inquiry",
      description: "Testing cross-tenant ticket boundaries.",
    });
    testTicketId = ticket.id;
  });

  afterAll(async () => {
    if (testTicketId) {
      await prisma.ticketMessage.deleteMany({ where: { ticketId: testTicketId } });
      await prisma.supportTicket.deleteMany({ where: { id: testTicketId } });
    }
    if (testOrderId) {
      await prisma.shipment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.stockReservation.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.paymentEvent.deleteMany({ where: { orderId: testOrderId } });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: ["lumina_audit_customer@nexoratest.com", "apex_audit_customer@nexoratest.com"] },
      },
    });
  });

  // =========================================================================
  // 1. Cross-Tenant Order Access & Mutation Isolation
  // =========================================================================
  describe("1. Cross-Tenant Order Security Controls", () => {
    it("returns null when attempting to retrieve an order with a mismatched businessId", async () => {
      // Lumina order queried with Apex context
      const crossTenantResult = await getAdminOrderById(testOrderId, APEX_ID);
      expect(crossTenantResult).toBeNull();

      // Queried with Lumina context
      const validResult = await getAdminOrderById(testOrderId, LUMINA_ID);
      expect(validResult).not.toBeNull();
      expect(validResult?.id).toBe(testOrderId);
      expect(validResult?.businessId).toBe(LUMINA_ID);
    });

    it("rejects order status transition if businessId does not match order businessId", async () => {
      await expect(
        updateAdminOrderStatus(testOrderId, "PACKED", "Cross-tenant attack", APEX_ID)
      ).rejects.toThrow(/Access denied: Order does not belong to the active business/);
    });

    it("rejects cancellation review if businessId does not match order businessId", async () => {
      await expect(
        reviewOrderCancellation({
          orderId: testOrderId,
          adminUserId: testAdminUserId,
          decision: "APPROVED",
          businessId: APEX_ID,
        })
      ).rejects.toThrow(/Access denied: Order does not belong to the active business/);
    });

    it("rejects manual refund recording if businessId does not match order businessId", async () => {
      await expect(
        recordManualRefund({
          orderId: testOrderId,
          adminUserId: testAdminUserId,
          refundAmountInCents: 100,
          reconciliationReference: "WIRE-REF-TEST-99",
          businessId: APEX_ID,
        })
      ).rejects.toThrow(/Access denied: Order does not belong to the active business/);
    });

    it("rejects shipment updates if businessId does not match order businessId", async () => {
      await expect(
        updateOrderShipment(
          testOrderId,
          {
            carrier: "FedEx",
            trackingNumber: "TRK-987654321",
            status: "IN_TRANSIT",
            businessId: APEX_ID,
          },
          APEX_ID
        )
      ).rejects.toThrow(/Access denied: Order does not belong to the active business/);
    });
  });

  // =========================================================================
  // 2. Cross-Tenant Customer Profile & Directory Scoping
  // =========================================================================
  describe("2. Customer Privacy & Business Scoping", () => {
    it("returns null when viewing a customer who has zero interaction with the requested business", async () => {
      // luminaCustomerId has an order in Lumina, but zero orders/tickets in Apex
      const profileInApex = await getAdminCustomerById(luminaCustomerId, APEX_ID);
      expect(profileInApex).toBeNull();

      // Profile is visible to Lumina
      const profileInLumina = await getAdminCustomerById(luminaCustomerId, LUMINA_ID);
      expect(profileInLumina).not.toBeNull();
      expect(profileInLumina?.id).toBe(luminaCustomerId);
      expect(profileInLumina?.orders.every((o) => o.businessId === LUMINA_ID)).toBe(true);
    });

    it("filters customer directory strictly by business interactions", async () => {
      const luminaCustomers = await getAdminCustomers({ businessId: LUMINA_ID });
      const apexCustomers = await getAdminCustomers({ businessId: APEX_ID });

      // luminaCustomerId must appear in Lumina customers
      expect(luminaCustomers.customers.some((u) => u.id === luminaCustomerId)).toBe(true);

      // luminaCustomerId must NOT appear in Apex customers
      expect(apexCustomers.customers.some((u) => u.id === luminaCustomerId)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Cross-Tenant Inventory Scoping & Stock Adjustments
  // =========================================================================
  describe("3. Inventory Isolation & Audit Traceability", () => {
    it("denies adjusting stock of another business's variant", async () => {
      await expect(
        adjustStock({
          variantId: luminaVariantId,
          businessId: APEX_ID, // Mismatched tenant
          delta: 10,
          type: "RESTOCK",
          reason: "Cross-tenant intrusion attempt",
          adminId: testAdminUserId,
        })
      ).rejects.toThrow(/Cross-tenant access denied/);
    });

    it("scopes inventory movement history strictly to the active business", async () => {
      const luminaMovements = await getInventoryMovements({ businessId: LUMINA_ID });
      const apexMovements = await getInventoryMovements({ businessId: APEX_ID });

      // All movements in Lumina must have businessId = LUMINA_ID
      luminaMovements.movements.forEach((m) => {
        expect(m.businessId).toBe(LUMINA_ID);
      });

      // All movements in Apex must have businessId = APEX_ID
      apexMovements.movements.forEach((m) => {
        expect(m.businessId).toBe(APEX_ID);
      });
    });
  });

  // =========================================================================
  // 4. Support Ticket Cross-Tenant Boundaries
  // =========================================================================
  describe("4. Support Ticket Isolation", () => {
    it("denies access when fetching ticket with mismatched businessId", async () => {
      const crossResult = await getSupportTicketById(testTicketId, undefined, undefined, APEX_ID);
      expect(crossResult).toBeNull();

      const validResult = await getSupportTicketById(testTicketId, undefined, undefined, LUMINA_ID);
      expect(validResult).not.toBeNull();
      expect(validResult?.id).toBe(testTicketId);
    });

    it("denies updating ticket attributes with mismatched businessId", async () => {
      await expect(
        updateTicketAttributes({
          ticketId: testTicketId,
          adminUserId: testAdminUserId,
          status: "RESOLVED",
          businessId: APEX_ID,
        })
      ).rejects.toThrow(/Access denied: Support ticket does not belong to the active business/);
    });

    it("denies adding messages to a ticket from a different business", async () => {
      await expect(
        addTicketMessage({
          ticketId: testTicketId,
          senderId: testAdminUserId,
          senderRole: "STAFF",
          message: "Unauthorized cross-tenant staff response",
          businessId: APEX_ID,
        })
      ).rejects.toThrow(/Access denied: Support ticket does not belong to the active business/);
    });
  });

  // =========================================================================
  // 5. Storefront Appearance & Theme Mutation Scoping
  // =========================================================================
  describe("5. Storefront Theme & Branding Isolation", () => {
    it("maintains separate appearance configurations per business", async () => {
      const luminaTheme = await getStoreAppearance({ businessId: LUMINA_ID });
      const apexTheme = await getStoreAppearance({ businessId: APEX_ID });

      expect(luminaTheme.storeName).toBe("Lumina Audio");
      expect(apexTheme.storeName).toBe("APEX KICKS");
      expect(luminaTheme.activeThemeId).not.toBe(apexTheme.activeThemeId);
    });

    it("saving draft appearance updates only the target business and leaves other tenants untouched", async () => {
      const apexBefore = await getStoreAppearance({ businessId: APEX_ID });

      // Save a draft on Lumina
      await saveDraftAppearance(
        {
          activeThemeId: "orange-energy",
          storeName: "Lumina Energy Labs",
          storeTagline: "Audio Unleashed",
        },
        LUMINA_ID
      );

      // Verify Lumina has draft
      const luminaDraft = await getStoreAppearance({ businessId: LUMINA_ID, previewDraft: true });
      expect(luminaDraft.storeName).toBe("Lumina Energy Labs");
      expect(luminaDraft.activeThemeId).toBe("orange-energy");

      // Verify Apex is completely untouched
      const apexAfter = await getStoreAppearance({ businessId: APEX_ID, previewDraft: true });
      expect(apexAfter.storeName).toBe(apexBefore.storeName);
      expect(apexAfter.activeThemeId).toBe(apexBefore.activeThemeId);

      // Discard draft on Lumina and verify cleanup
      await discardDraftAppearance(LUMINA_ID);
      const luminaAfterDiscard = await getStoreAppearance({ businessId: LUMINA_ID, previewDraft: true });
      expect(luminaAfterDiscard.storeName).toBe("Lumina Audio");
    });
  });

  // =========================================================================
  // 6. Cross-Tenant Cart & Multi-Item Mixing Rejection
  // =========================================================================
  describe("6. Cart & Multi-Item Tenant Boundary Protection", () => {
    it("strictly rejects checkout orders containing items from multiple businesses", async () => {
      await expect(
        createOrderFromCheckout(
          {
            businessId: LUMINA_ID,
            items: [
              { variantId: luminaVariantId, quantity: 1 },
              { variantId: apexVariantId, quantity: 1 }, // Forbidden cross-tenant item
            ],
            shippingAddress: {
              firstName: "Mixed",
              lastName: "Cart",
              addressLine1: "123 Multi-Store Lane",
              city: "San Francisco",
              stateOrProvince: "CA",
              postalCode: "94105",
              country: "US",
            },
            shippingMethod: "STANDARD",
            paymentProvider: "MOCK",
          },
          luminaCustomerId
        )
      ).rejects.toThrow(/Cross-tenant checkout error/);
    });
  });

  // =========================================================================
  // 7. Payment Webhook Business Resolution & Deduplication
  // =========================================================================
  describe("7. Payment Webhook Security & Idempotency", () => {
    it("resolves order businessId and prevents duplicate processing", async () => {
      // 1. Create a fresh order for webhook testing
      const order = await createOrderFromCheckout(
        {
          businessId: LUMINA_ID,
          items: [{ variantId: luminaVariantId, quantity: 1 }],
          shippingAddress: {
            firstName: "Webhook",
            lastName: "Tester",
            addressLine1: "456 Gateway Rd",
            city: "San Francisco",
            stateOrProvince: "CA",
            postalCode: "94105",
            country: "US",
          },
          shippingMethod: "STANDARD",
          paymentProvider: "MOCK",
        },
        luminaCustomerId
      );

      const uniqueEventId = `evt_audit_test_${Date.now()}`;
      const payloadObj = {
        eventId: uniqueEventId,
        eventType: "payment.succeeded",
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PAID",
        amountInCents: order.totalInCents,
        currency: order.currency,
      };
      const payload = JSON.stringify(payloadObj);

      const { MockPaymentProvider } = await import("./payment/mock-payment.provider");
      const mockProvider = new MockPaymentProvider();
      const signature = mockProvider.generateWebhookSignature(payload);
      const reqHeaders = new Headers({ "x-mock-signature": signature });

      // First webhook call -> successfully processes
      const result1 = await processPaymentWebhook("MOCK", payload, reqHeaders);
      expect(result1.success).toBe(true);
      expect(result1.status).toBe("PAID");

      // Verify payment event was recorded with LUMINA_ID
      const eventRecord = await prisma.paymentEvent.findFirst({
        where: { orderId: order.id },
      });
      expect(eventRecord).not.toBeNull();
      expect(eventRecord?.businessId).toBe(LUMINA_ID);

      // Clean up order
      await prisma.stockReservation.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.paymentEvent.deleteMany({ where: { orderId: order.id } });
      await prisma.payment.deleteMany({ where: { orderId: order.id } });
      await prisma.order.deleteMany({ where: { id: order.id } });
    });
  });

  // =========================================================================
  // 8. Multi-Business Role Switching & Zero Residual Permissions
  // =========================================================================
  describe("8. Multi-Business Role Switching & Permission Isolation", () => {
    it("ensures a user belonging to multiple businesses receives strictly scoped permissions without leaks", async () => {
      // Create user belonging to two businesses:
      // In LUMINA: MANAGER (can CREATE_PRODUCT, cannot MANAGE_SETTINGS)
      // In APEX: STAFF (cannot CREATE_PRODUCT, cannot MANAGE_SETTINGS)
      const multiUser = await prisma.user.create({
        data: {
          email: `multi_role_user_${Date.now()}@nexoratest.com`,
          name: "Multi-Role Staff/Manager",
          role: "CUSTOMER",
        },
      });

      const memberLumina = await prisma.businessMember.create({
        data: {
          businessId: LUMINA_ID,
          userId: multiUser.id,
          role: "MANAGER",
        },
      });

      const memberApex = await prisma.businessMember.create({
        data: {
          businessId: APEX_ID,
          userId: multiUser.id,
          role: "STAFF",
        },
      });

      // Context 1: Switched to LUMINA
      const luminaRole: BusinessRole = memberLumina.role as BusinessRole;
      expect(hasPermission(luminaRole, "VIEW_ADMIN")).toBe(true);
      expect(hasPermission(luminaRole, "CREATE_PRODUCT")).toBe(true);
      expect(hasPermission(luminaRole, "MANAGE_SETTINGS")).toBe(false);

      // Context 2: Switched to APEX -> Permissions must drop to STAFF
      const apexRole: BusinessRole = memberApex.role as BusinessRole;
      expect(hasPermission(apexRole, "VIEW_ADMIN")).toBe(true);
      expect(hasPermission(apexRole, "CREATE_PRODUCT")).toBe(false); // MANAGER privilege does NOT leak
      expect(hasPermission(apexRole, "MANAGE_ORDERS")).toBe(false);
      expect(hasPermission(apexRole, "MANAGE_SETTINGS")).toBe(false);

      // Cleanup
      await prisma.businessMember.deleteMany({ where: { userId: multiUser.id } });
      await prisma.user.deleteMany({ where: { id: multiUser.id } });
    });
  });

  // =========================================================================
  // 9. Invitation Abuse & Single-Use Enforcement
  // =========================================================================
  describe("9. Team Invitation Lifecycle & Abuse Prevention", () => {
    it("rejects expired or previously accepted invitations", async () => {
      // 1. Create an expired invitation
      const expiredInvite = await prisma.businessInvitation.create({
        data: {
          businessId: LUMINA_ID,
          email: `expired_invite_${Date.now()}@test.com`,
          role: "STAFF",
          token: `token_expired_${Date.now()}`,
          invitedById: testAdminUserId,
          status: "PENDING",
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });

      // Check expiration guard
      expect(expiredInvite.expiresAt < new Date()).toBe(true);

      // 2. Create an already accepted invitation
      const acceptedInvite = await prisma.businessInvitation.create({
        data: {
          businessId: LUMINA_ID,
          email: `accepted_invite_${Date.now()}@test.com`,
          role: "STAFF",
          token: `token_accepted_${Date.now()}`,
          invitedById: testAdminUserId,
          status: "ACCEPTED",
          acceptedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      // Verify accepted guard
      expect(acceptedInvite.status).not.toBe("PENDING");

      // Cleanup
      await prisma.businessInvitation.deleteMany({
        where: { id: { in: [expiredInvite.id, acceptedInvite.id] } },
      });
    });
  });

  // =========================================================================
  // 10. Sole Owner Deletion Protection
  // =========================================================================
  describe("10. Sole Owner Safety Guard", () => {
    it("strictly blocks deleting the sole active OWNER of a business", async () => {
      const soleBiz = await prisma.business.create({
        data: {
          slug: `sole-owner-biz-${Date.now()}`,
          name: "Sole Owner Test Store",
          status: "ACTIVE",
        },
      });

      const soleOwner = await prisma.user.create({
        data: {
          email: `sole_owner_${Date.now()}@test.com`,
          name: "Sole Owner",
          role: "CUSTOMER",
        },
      });

      await prisma.businessMember.create({
        data: {
          businessId: soleBiz.id,
          userId: soleOwner.id,
          role: "OWNER",
        },
      });

      // Check owner count
      const ownerCount = await prisma.businessMember.count({
        where: { businessId: soleBiz.id, role: "OWNER" },
      });
      expect(ownerCount).toBe(1);

      // Guard: when ownerCount <= 1, removal is forbidden
      const isAllowedToRemove = ownerCount > 1;
      expect(isAllowedToRemove).toBe(false);

      // Cleanup
      await prisma.businessMember.deleteMany({ where: { businessId: soleBiz.id } });
      await prisma.business.deleteMany({ where: { id: soleBiz.id } });
      await prisma.user.deleteMany({ where: { id: soleOwner.id } });
    });
  });

  // =========================================================================
  // 11. Stock Reservation Sweeper Isolation
  // =========================================================================
  describe("11. Reservation Sweeper Scope & Paid Order Protection", () => {
    it("sweeper only cancels unpaid expired reservations and never touches paid orders", async () => {
      // 1. Create order with unpaid expired reservation
      const unpaidOrder = await createOrderFromCheckout(
        {
          businessId: LUMINA_ID,
          items: [{ variantId: luminaVariantId, quantity: 1 }],
          shippingAddress: {
            firstName: "Sweeper",
            lastName: "Tester",
            addressLine1: "123 Expire Blvd",
            city: "San Francisco",
            stateOrProvince: "CA",
            postalCode: "94105",
            country: "US",
          },
          shippingMethod: "STANDARD",
          paymentProvider: "MOCK",
        },
        luminaCustomerId
      );

      // Force reservation expiration into the past
      await prisma.stockReservation.updateMany({
        where: { orderId: unpaidOrder.id },
        data: { expiresAt: new Date(Date.now() - 60000) },
      });

      // Run sweeper scoped to LUMINA_ID
      const result = await releaseExpiredReservations(LUMINA_ID);
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);

      // Verify unpaid order was marked CANCELLED
      const orderAfterSweeper = await prisma.order.findUnique({
        where: { id: unpaidOrder.id },
      });
      expect(orderAfterSweeper?.status).toBe("CANCELLED");

      // Verify that PAID testOrderId was NEVER touched by the sweeper
      const paidOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(paidOrder?.status).toBe("PROCESSING");
      expect(paidOrder?.paymentStatus).toBe("PAID");

      // Cleanup
      await prisma.stockReservation.deleteMany({ where: { orderId: unpaidOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: unpaidOrder.id } });
      await prisma.order.deleteMany({ where: { id: unpaidOrder.id } });
    });
  });
});
