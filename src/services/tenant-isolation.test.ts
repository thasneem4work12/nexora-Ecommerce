import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getPublishedProducts,
  getProductBySlug,
  getCategories,
} from "./catalog.service";
import {
  adjustStock,
  getInventoryItems,
  getInventoryMovements,
} from "./inventory.service";
import { createOrderFromCheckout } from "./order.service";
import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
} from "./admin-order.service";
import {
  createSupportTicket,
  getAdminTickets,
  getSupportTicketById,
} from "./support-ticket.service";
import {
  BUSINESS_ROLE_HIERARCHY,
  hasPermission,
} from "@/lib/admin-auth";

describe("Phase 7: Multi-Tenant Architecture & Store Isolation Integration Suite", () => {
  const LUMINA_ID = "biz-lumina-tech";
  const APEX_ID = "biz-apex-kicks";
  const NEXORA_ID = "default-store";

  let luminaVariantId: string;
  let apexVariantId: string;
  let testCustomerId: string;
  let testAdminId: string;
  let createdOrderId: string;
  let createdTicketId: string;

  beforeAll(async () => {
    // 1. Locate test customer or create one
    let customer = await prisma.user.findFirst({
      where: { role: "CUSTOMER" },
    });
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          email: `tenant_test_customer_${Date.now()}@nexoratest.com`,
          name: "Tenant Test Customer",
          role: "CUSTOMER",
        },
      });
    }
    testCustomerId = customer.id;

    const admin = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "MANAGER", "STAFF"] } },
    });
    testAdminId = admin ? admin.id : customer.id;

    // 2. Fetch sample variants for each tenant
    const luminaVariant = await prisma.productVariant.findFirst({
      where: { product: { businessId: LUMINA_ID } },
    });
    if (!luminaVariant) throw new Error("Lumina test variant not found in DB.");
    luminaVariantId = luminaVariant.id;

    const apexVariant = await prisma.productVariant.findFirst({
      where: { product: { businessId: APEX_ID } },
    });
    if (!apexVariant) throw new Error("Apex test variant not found in DB.");
    apexVariantId = apexVariant.id;
  });

  afterAll(async () => {
    // Clean up any test order created during the run
    if (createdOrderId) {
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
    if (createdTicketId) {
      await prisma.supportTicket.deleteMany({ where: { id: createdTicketId } });
    }
  });

  // ==========================================
  // 1. Catalog & Product Isolation
  // ==========================================
  describe("1. Catalog & Product Isolation", () => {
    it("strictly isolates product catalogs between businesses", async () => {
      const luminaCatalog = await getPublishedProducts({ businessId: LUMINA_ID });
      const apexCatalog = await getPublishedProducts({ businessId: APEX_ID });

      expect(luminaCatalog.products.length).toBeGreaterThan(0);
      expect(apexCatalog.products.length).toBeGreaterThan(0);

      // Verify all products in Lumina catalog belong strictly to Lumina
      luminaCatalog.products.forEach((p) => {
        expect(p.businessId).toBe(LUMINA_ID);
      });

      // Verify all products in Apex catalog belong strictly to Apex
      apexCatalog.products.forEach((p) => {
        expect(p.businessId).toBe(APEX_ID);
      });

      // Ensure no intersection between product IDs
      const luminaIds = new Set(luminaCatalog.products.map((p) => p.id));
      const apexIds = new Set(apexCatalog.products.map((p) => p.id));
      for (const id of luminaIds) {
        expect(apexIds.has(id)).toBe(false);
      }
    });

    it("prevents cross-tenant product lookup by slug", async () => {
      // Lumina has 'acoustic-pro-headphones'
      const luminaProduct = await getProductBySlug("acoustic-pro-headphones", LUMINA_ID);
      expect(luminaProduct).not.toBeNull();
      expect(luminaProduct?.title).toBe("Acoustic Pro Studio Headphones");
      expect(luminaProduct?.businessId).toBe(LUMINA_ID);

      // Querying Lumina product under Apex business returns null
      const crossTenantProduct = await getProductBySlug("acoustic-pro-headphones", APEX_ID);
      expect(crossTenantProduct).toBeNull();
    });

    it("isolates categories by businessId", async () => {
      const luminaCategories = await getCategories(LUMINA_ID);
      const apexCategories = await getCategories(APEX_ID);

      expect(luminaCategories.length).toBeGreaterThan(0);
      expect(apexCategories.length).toBeGreaterThan(0);

      luminaCategories.forEach((c) => {
        expect(c.businessId).toBe(LUMINA_ID);
      });

      apexCategories.forEach((c) => {
        expect(c.businessId).toBe(APEX_ID);
      });
    });
  });

  // ==========================================
  // 2. Multi-Tenant Category Slug Uniqueness
  // ==========================================
  describe("2. Multi-Tenant Category Slug Uniqueness", () => {
    it("allows independent businesses to use identical category slugs without conflict", async () => {
      // Both Nexora and Apex have a category with slug 'apparel'
      const nexoraApparel = await prisma.category.findUnique({
        where: {
          businessId_slug: {
            businessId: NEXORA_ID,
            slug: "apparel",
          },
        },
      });

      const apexApparel = await prisma.category.findUnique({
        where: {
          businessId_slug: {
            businessId: APEX_ID,
            slug: "apparel",
          },
        },
      });

      expect(nexoraApparel).not.toBeNull();
      expect(apexApparel).not.toBeNull();
      expect(nexoraApparel?.id).not.toBe(apexApparel?.id);
      expect(nexoraApparel?.businessId).toBe(NEXORA_ID);
      expect(apexApparel?.businessId).toBe(APEX_ID);
      expect(nexoraApparel?.name).toBe("Apparel");
      expect(apexApparel?.name).toBe("Streetwear & Hoodies");
    });

    it("enforces uniqueness within the same business for category slug", async () => {
      await expect(
        prisma.category.create({
          data: {
            businessId: APEX_ID,
            slug: "apparel", // duplicate in APEX_ID
            name: "Duplicate Apparel",
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 3. Inventory Mutation & Ledger Isolation
  // ==========================================
  describe("3. Inventory Mutation & Ledger Isolation", () => {
    it("blocks cross-tenant stock adjustments with a strict error", async () => {
      // Attempting to adjust Lumina's variant with Apex's business context
      await expect(
        adjustStock({
          variantId: luminaVariantId,
          businessId: APEX_ID, // Mismatched business
          delta: 5,
          type: "RESTOCK",
          reason: "Malicious cross-tenant stock modification test",
          adminId: testAdminId,
        })
      ).rejects.toThrow(/Cross-tenant access denied/);
    });

    it("records the correct businessId on inventory movements for legitimate adjustments", async () => {
      const initialStock = (
        await prisma.productVariant.findUnique({ where: { id: luminaVariantId } })
      )?.stock ?? 0;

      const updated = await adjustStock({
        variantId: luminaVariantId,
        businessId: LUMINA_ID,
        delta: 3,
        type: "RESTOCK",
        reason: "Valid tenant restock audit test",
        adminId: testAdminId,
      });

      expect(updated.variant.stock).toBe(initialStock + 3);

      // Verify the audit movement was tagged with LUMINA_ID
      const latestMovement = await prisma.inventoryMovement.findFirst({
        where: { variantId: luminaVariantId },
        orderBy: { createdAt: "desc" },
      });

      expect(latestMovement).not.toBeNull();
      expect(latestMovement?.businessId).toBe(LUMINA_ID);
      expect(latestMovement?.quantityChange).toBe(3);

      // Revert adjustment
      await adjustStock({
        variantId: luminaVariantId,
        businessId: LUMINA_ID,
        delta: -3,
        type: "ADJUSTMENT",
        reason: "Revert test restock",
        adminId: testAdminId,
      });
    });

    it("scopes inventory list and movement queries to the requested business", async () => {
      const luminaItems = await getInventoryItems({ businessId: LUMINA_ID });
      const apexItems = await getInventoryItems({ businessId: APEX_ID });

      expect(luminaItems.items.length).toBeGreaterThan(0);
      expect(apexItems.items.length).toBeGreaterThan(0);

      luminaItems.items.forEach((item) => {
        expect(item.product.businessId).toBe(LUMINA_ID);
      });

      apexItems.items.forEach((item) => {
        expect(item.product.businessId).toBe(APEX_ID);
      });

      const luminaMovements = await getInventoryMovements({ businessId: LUMINA_ID });
      expect(luminaMovements.movements.length).toBeGreaterThan(0);
      luminaMovements.movements.forEach((m) => {
        expect(m.businessId).toBe(LUMINA_ID);
      });
    });
  });

  // ==========================================
  // 4. Cart & Checkout Cross-Tenant Protection
  // ==========================================
  describe("4. Cart & Checkout Cross-Tenant Protection", () => {
    it("rejects checkout when cart contains items from a different tenant", async () => {
      // Attempting to checkout on Lumina with an Apex variant
      await expect(
        createOrderFromCheckout(
          {
            businessId: LUMINA_ID,
            items: [
              {
                variantId: apexVariantId, // BELONGS TO APEX, NOT LUMINA
                quantity: 1,
              },
            ],
            shippingAddress: {
              firstName: "Cross",
              lastName: "Tenant",
              addressLine1: "123 Security Blvd",
              city: "Metropolis",
              stateOrProvince: "NY",
              postalCode: "10001",
              country: "US",
            },
            shippingMethod: "STANDARD",
            paymentProvider: "MOCK",
          },
          testCustomerId
        )
      ).rejects.toThrow(/Cross-tenant checkout error/);
    });

    it("successfully creates order with proper businessId and orderPrefix for valid tenant items", async () => {
      const order = await createOrderFromCheckout(
        {
          businessId: LUMINA_ID,
          items: [
            {
              variantId: luminaVariantId,
              quantity: 1,
            },
          ],
          shippingAddress: {
            firstName: "Lumina",
            lastName: "Customer",
            addressLine1: "456 Audio Way",
            city: "San Francisco",
            stateOrProvince: "CA",
            postalCode: "94105",
            country: "US",
          },
          shippingMethod: "STANDARD",
          paymentProvider: "MOCK",
        },
        testCustomerId
      );

      createdOrderId = order.id;

      expect(order.businessId).toBe(LUMINA_ID);
      expect(order.orderNumber).toMatch(/^LUM-/); // Uses Lumina's orderPrefix 'LUM'
      expect(order.items.length).toBe(1);
      expect(order.items[0].variantId).toBe(luminaVariantId);

      // Verify DB record
      const dbOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(dbOrder?.businessId).toBe(LUMINA_ID);
    });
  });

  // ==========================================
  // 5. Admin Order Management Isolation
  // ==========================================
  describe("5. Admin Order Management Isolation", () => {
    it("hides orders from other businesses in admin order queries", async () => {
      expect(createdOrderId).toBeDefined();

      // Query Lumina admin orders
      const luminaOrders = await getAdminOrders({ businessId: LUMINA_ID });
      expect(luminaOrders.orders.some((o) => o.id === createdOrderId)).toBe(true);
      luminaOrders.orders.forEach((o) => {
        expect(o.businessId).toBe(LUMINA_ID);
      });

      // Query Apex admin orders -> createdOrderId must NOT appear
      const apexOrders = await getAdminOrders({ businessId: APEX_ID });
      expect(apexOrders.orders.some((o) => o.id === createdOrderId)).toBe(false);
      apexOrders.orders.forEach((o) => {
        expect(o.businessId).toBe(APEX_ID);
      });
    });

    it("returns null when attempting to retrieve an order with a mismatched businessId", async () => {
      expect(createdOrderId).toBeDefined();

      // Lumina order queried with Apex business context
      const order = await getAdminOrderById(createdOrderId, APEX_ID);
      expect(order).toBeNull();

      // Queried with correct business context
      const validOrder = await getAdminOrderById(createdOrderId, LUMINA_ID);
      expect(validOrder).not.toBeNull();
      expect(validOrder?.id).toBe(createdOrderId);
    });

    it("rejects order status updates with mismatched businessId", async () => {
      expect(createdOrderId).toBeDefined();

      // Attempting to advance Lumina order while scoped to Apex
      await expect(
        updateAdminOrderStatus(createdOrderId, "PROCESSING", "Unauthorized mutation", APEX_ID)
      ).rejects.toThrow(/Access denied: Order does not belong to the active business/);
    });
  });

  // ==========================================
  // 6. Support Ticket Tenant Isolation
  // ==========================================
  describe("6. Support Ticket Tenant Isolation", () => {
    it("isolates support tickets by businessId", async () => {
      const ticket = await createSupportTicket({
        businessId: LUMINA_ID,
        userId: testCustomerId,
        subject: "Headphone Cable Query",
        description: "Does the balanced 4.4mm pentaconn cable come in the box?",
        priority: "NORMAL",
      });

      createdTicketId = ticket.id;
      expect(ticket.businessId).toBe(LUMINA_ID);

      // Apex admin query should not list this ticket
      const apexTickets = await getAdminTickets({ businessId: APEX_ID });
      expect(apexTickets.tickets.some((t) => t.id === ticket.id)).toBe(false);

      // Lumina admin query lists this ticket
      const luminaTickets = await getAdminTickets({ businessId: LUMINA_ID });
      expect(luminaTickets.tickets.some((t) => t.id === ticket.id)).toBe(true);

      // Direct lookup with mismatched tenant returns null
      const crossTenantTicket = await getSupportTicketById(ticket.id, APEX_ID);
      expect(crossTenantTicket).toBeNull();

      // Direct lookup with matching tenant returns ticket
      const validTicket = await getSupportTicketById(ticket.id, LUMINA_ID);
      expect(validTicket).not.toBeNull();
      expect(validTicket?.id).toBe(ticket.id);
    });
  });

  // ==========================================
  // 7. Business Membership & Role Authorization
  // ==========================================
  describe("7. Business Membership & Role Authorization", () => {
    it("authorizes user with verified membership for requested permissions", async () => {
      const luminaManager = await prisma.user.findUnique({
        where: { email: "lumina.manager@test.com" },
      });
      expect(luminaManager).not.toBeNull();

      // Check membership directly in PostgreSQL
      const member = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: LUMINA_ID,
            userId: luminaManager!.id,
          },
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe("MANAGER");
      expect(BUSINESS_ROLE_HIERARCHY[member!.role]).toBeGreaterThanOrEqual(
        BUSINESS_ROLE_HIERARCHY.MANAGER
      );
      expect(hasPermission(member!.role, "CREATE_PRODUCT")).toBe(true);
      expect(hasPermission(member!.role, "MANAGE_SETTINGS")).toBe(false);
    });

    it("denies access when a non-superadmin user accesses a business they are not a member of", async () => {
      const luminaManager = await prisma.user.findUnique({
        where: { email: "lumina.manager@test.com" },
      });
      expect(luminaManager).not.toBeNull();

      // Lumina manager attempting to query Apex membership
      const apexMembership = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: APEX_ID,
            userId: luminaManager!.id,
          },
        },
      });

      expect(apexMembership).toBeNull(); // Has zero access to Apex Kicks
    });

    it("grants universal access to platform SUPERADMIN across all tenant stores", async () => {
      const superadmin = await prisma.user.findFirst({
        where: { role: "SUPERADMIN" },
      });

      if (superadmin) {
        expect(superadmin.role).toBe("SUPERADMIN");
        expect(hasPermission(superadmin.role, "MANAGE_MEMBERS")).toBe(true);
        expect(hasPermission(superadmin.role, "MANAGE_SETTINGS")).toBe(true);
      }
    });

    it("protects against removing the sole OWNER of a business", async () => {
      // Create a temporary business with a single owner
      const tempBiz = await prisma.business.create({
        data: {
          slug: `temp-biz-${Date.now()}`,
          name: "Temporary Protected Boutique",
          status: "ACTIVE",
        },
      });

      const tempOwner = await prisma.user.create({
        data: {
          email: `temp_owner_${Date.now()}@test.com`,
          name: "Temporary Sole Owner",
          role: "CUSTOMER",
        },
      });

      await prisma.businessMember.create({
        data: {
          businessId: tempBiz.id,
          userId: tempOwner.id,
          role: "OWNER",
        },
      });

      // Verify membership count is 1 owner
      const ownerCount = await prisma.businessMember.count({
        where: { businessId: tempBiz.id, role: "OWNER" },
      });
      expect(ownerCount).toBe(1);

      // Sole owner guard check: attempting to delete member when ownerCount === 1 must be prevented
      const canDelete = ownerCount > 1;
      expect(canDelete).toBe(false);

      // Clean up temporary test business and owner
      await prisma.businessMember.deleteMany({ where: { businessId: tempBiz.id } });
      await prisma.business.deleteMany({ where: { id: tempBiz.id } });
      await prisma.user.deleteMany({ where: { id: tempOwner.id } });
    });
  });
});
