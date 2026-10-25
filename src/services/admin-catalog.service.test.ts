import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  generateUniqueSlug,
  createProduct,
  updateProduct,
  getAdminProductById,
  getAdminProducts,
  setProductPublishStatus,
  archiveProduct,
  restoreProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminCategories,
  getDashboardMetrics,
} from "./admin-catalog.service";
import { getPublishedProducts } from "./catalog.service";

describe("Admin Catalog Service (Product & Category Management)", () => {
  let adminUserId: string;
  let testCategoryId: string;
  let testProductId: string;
  const uniquePrefix = `test-${Date.now()}`;

  beforeAll(async () => {
    let admin = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "MANAGER", "SUPERADMIN"] } },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          id: `test-admin-${Date.now()}`,
          name: "Test Curator",
          email: `curator-${Date.now()}@nexoracommerce.com`,
          emailVerified: true,
          role: "OWNER",
        },
      });
    }
    adminUserId = admin.id;
  });

  afterAll(async () => {
    // Clean up created test resources
    if (testProductId) {
      // Delete movements, variants, images, then product
      await prisma.inventoryMovement.deleteMany({
        where: { variant: { productId: testProductId } },
      });
      await prisma.productVariant.deleteMany({
        where: { productId: testProductId },
      });
      await prisma.productImage.deleteMany({
        where: { productId: testProductId },
      });
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }

    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
  });

  describe("Slug Generation", () => {
    it("should generate a clean url-friendly slug", async () => {
      const slug = await generateUniqueSlug("The Cashmere & Silk Safari Jacket!");
      expect(slug).toBe("the-cashmere-silk-safari-jacket");
    });

    it("should handle collision by appending counter", async () => {
      const slug1 = await generateUniqueSlug("Unique Silk Scarf");
      // Seed a temporary product with this slug
      const tempProd = await prisma.product.create({
        data: {
          title: "Unique Silk Scarf",
          slug: slug1,
          description: "Temporary product for slug collision test",
          category: "Accessories",
          basePriceInCents: 10000,
          published: false,
        },
      });

      const slug2 = await generateUniqueSlug("Unique Silk Scarf");
      expect(slug2).toBe(`${slug1}-2`);

      // Cleanup temp
      await prisma.product.delete({ where: { id: tempProd.id } });
    });
  });

  describe("Category Management", () => {
    it("should create a new luxury category", async () => {
      const category = await createCategory({
        name: `Horology & Complications ${uniquePrefix}`,
        slug: `horology-complications-${uniquePrefix}`,
        description: "Fine Swiss mechanical timepieces and grand complications.",
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe(`Horology & Complications ${uniquePrefix}`);
      testCategoryId = category.id;
    });

    it("should update existing category information", async () => {
      const updated = await updateCategory(testCategoryId, {
        description: "Updated description for fine Swiss mechanical timepieces.",
      });

      expect(updated.description).toBe(
        "Updated description for fine Swiss mechanical timepieces."
      );
    });

    it("should list categories with product counts", async () => {
      const list = await getAdminCategories();
      expect(list.length).toBeGreaterThan(0);
      const created = list.find((c) => c.id === testCategoryId);
      expect(created).toBeDefined();
      expect(created?.productCount).toBe(0);
    });

    it("should prevent deleting a category with associated products", async () => {
      // Find a seeded category that has products
      const activeCategory = await prisma.category.findFirst({
        where: { products: { some: {} } },
      });

      if (activeCategory) {
        await expect(deleteCategory(activeCategory.id)).rejects.toThrow(
          /Cannot delete category: .* product\(s\) are currently associated with it/
        );
      }
    });
  });

  describe("Product Lifecycle & Inventory Auditing", () => {
    const sku1 = `SKU-A-${uniquePrefix}`;
    const sku2 = `SKU-B-${uniquePrefix}`;

    it("should create a product with variants, images, and initial stock movements", async () => {
      const product = await createProduct(
        {
          title: `Artisanal Leather Document Folio ${uniquePrefix}`,
          description: "Handcrafted in Florence from Tuscan vegetable-tanned calfskin.",
          categoryId: testCategoryId,
          basePriceInCents: 125000,
          featured: true,
          published: true,
          images: [
            {
              url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
              alt: "Document Folio in Cognac Leather",
              position: 0,
            },
          ],
          variants: [
            {
              sku: sku1,
              title: "Cognac / Full Grain",
              color: "Cognac",
              priceInCents: 125000,
              stock: 12,
              lowStockThreshold: 3,
            },
            {
              sku: sku2,
              title: "Nero / Matte Finish",
              color: "Nero",
              priceInCents: 135000,
              stock: 5,
              lowStockThreshold: 2,
            },
          ],
        },
        adminUserId
      );

      expect(product.id).toBeDefined();
      expect(product.slug).toContain("artisanal-leather-document-folio");
      testProductId = product.id;

      // Verify product with variants in DB
      const loaded = await getAdminProductById(testProductId);
      expect(loaded).toBeDefined();
      expect(loaded?.variants.length).toBe(2);
      expect(loaded?.images.length).toBe(1);

      // Verify that initial inventory movements were created for the variants
      const movements = await prisma.inventoryMovement.findMany({
        where: { variant: { productId: testProductId } },
      });
      expect(movements.length).toBe(2);
      expect(movements[0].type).toBe("RESTOCK");
      expect(movements[0].userId).toBe(adminUserId);
    });

    it("should prevent creating a product with duplicate SKU", async () => {
      await expect(
        createProduct(
          {
            title: `Duplicate SKU Product ${uniquePrefix}`,
            description: "Should fail validation due to existing SKU.",
            basePriceInCents: 50000,
            published: false,
            variants: [
              {
                sku: sku1, // Already used above
                title: "Duplicate Variant",
                priceInCents: 50000,
                stock: 1,
              },
            ],
          },
          adminUserId
        )
      ).rejects.toThrow(`A variant with SKU "${sku1}" already exists.`);
    });

    it("should update product details and add an additional variant", async () => {
      const sku3 = `SKU-C-${uniquePrefix}`;
      const updated = await updateProduct(
        testProductId,
        {
          title: `Artisanal Leather Document Folio (Updated) ${uniquePrefix}`,
          basePriceInCents: 130000,
          variants: [
            {
              sku: sku3,
              title: "Espresso / Vegetable Tanned",
              color: "Espresso",
              priceInCents: 140000,
              stock: 7,
            },
          ],
        },
        adminUserId
      );

      expect(updated.title).toContain("(Updated)");
      expect(updated.basePriceInCents).toBe(130000);

      const refreshed = await getAdminProductById(testProductId);
      // It should now have 3 variants (2 existing + 1 new)
      expect(refreshed?.variants.length).toBe(3);
    });

    it("should toggle publication status", async () => {
      // Unpublish
      const unpublished = await setProductPublishStatus(testProductId, false);
      expect(unpublished.published).toBe(false);

      // Verify customer storefront excludes it
      const storefrontResult1 = await getPublishedProducts({ limit: 100 });
      const foundInStorefront1 = storefrontResult1.products.find(
        (p) => p.id === testProductId
      );
      expect(foundInStorefront1).toBeUndefined();

      // Publish
      const published = await setProductPublishStatus(testProductId, true);
      expect(published.published).toBe(true);

      // Verify customer storefront includes it
      const storefrontResult2 = await getPublishedProducts({ limit: 100 });
      const foundInStorefront2 = storefrontResult2.products.find(
        (p) => p.id === testProductId
      );
      expect(foundInStorefront2).toBeDefined();
    });

    it("should archive product and ensure it is hidden from storefront", async () => {
      const archived = await archiveProduct(testProductId);
      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).toBeInstanceOf(Date);
      expect(archived.published).toBe(false);

      // Public catalog must NEVER include archived products
      const publicCatalog = await getPublishedProducts({ limit: 100 });
      const inPublic = publicCatalog.products.find((p) => p.id === testProductId);
      expect(inPublic).toBeUndefined();

      // Admin products list can find it under 'archived' filter
      const adminArchived = await getAdminProducts({ status: "archived" });
      const inAdmin = adminArchived.products.find((p) => p.id === testProductId);
      expect(inAdmin).toBeDefined();
      expect(inAdmin?.isArchived).toBe(true);

      // Restore product
      const restored = await restoreProduct(testProductId);
      expect(restored.isArchived).toBe(false);
      expect(restored.archivedAt).toBeNull();
    });

    it("should compute accurate real-time dashboard metrics from PostgreSQL", async () => {
      const metrics = await getDashboardMetrics();

      expect(metrics.totalProducts).toBeGreaterThan(0);
      expect(metrics.publishedProducts).toBeGreaterThanOrEqual(0);
      expect(metrics.archivedProducts).toBeGreaterThanOrEqual(0);
      expect(metrics.totalVariants).toBeGreaterThan(0);
      expect(metrics.lowStockVariants).toBeGreaterThanOrEqual(0);
      expect(metrics.outOfStockVariants).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metrics.recentMovements)).toBe(true);
    });
  });
});
