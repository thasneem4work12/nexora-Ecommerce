import { describe, it, expect } from "vitest";
import {
  getPublishedProducts,
  getProductBySlug,
  getCategories,
  getRelatedProducts,
  getVariantStock,
} from "./catalog.service";

describe("Catalog Service (PostgreSQL Integration)", () => {
  it("should fetch only published products and hide unpublished archive items", async () => {
    const result = await getPublishedProducts({ limit: 50 });

    expect(result.products.length).toBeGreaterThan(0);
    // Bespoke Vicuna Overcoat is seeded as published: false
    const unpublishedItem = result.products.find(
      (p) => p.slug === "bespoke-vicuna-overcoat-private-archive"
    );
    expect(unpublishedItem).toBeUndefined();

    // All returned products must have published: true
    result.products.forEach((p) => {
      expect(p.published).toBe(true);
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.variants.length).toBeGreaterThan(0);
    });
  });

  it("should filter products by category slug or name", async () => {
    const apparelResult = await getPublishedProducts({ category: "apparel" });
    expect(apparelResult.products.length).toBeGreaterThan(0);
    apparelResult.products.forEach((p) => {
      expect(p.category.toLowerCase()).toBe("apparel");
    });

    const footwearResult = await getPublishedProducts({ category: "footwear" });
    expect(footwearResult.products.length).toBeGreaterThan(0);
    footwearResult.products.forEach((p) => {
      expect(p.category.toLowerCase()).toBe("footwear");
    });
  });

  it("should filter products by search term across title and description", async () => {
    const searchResult = await getPublishedProducts({ search: "cashmere" });
    expect(searchResult.products.length).toBeGreaterThan(0);
    const hasCashmere = searchResult.products.some(
      (p) =>
        p.title.toLowerCase().includes("cashmere") ||
        p.description.toLowerCase().includes("cashmere")
    );
    expect(hasCashmere).toBe(true);
  });

  it("should correctly sort products by price ascending and descending", async () => {
    const ascResult = await getPublishedProducts({ sort: "price-asc" });
    for (let i = 0; i < ascResult.products.length - 1; i++) {
      expect(ascResult.products[i].basePriceInCents).toBeLessThanOrEqual(
        ascResult.products[i + 1].basePriceInCents
      );
    }

    const descResult = await getPublishedProducts({ sort: "price-desc" });
    for (let i = 0; i < descResult.products.length - 1; i++) {
      expect(descResult.products[i].basePriceInCents).toBeGreaterThanOrEqual(
        descResult.products[i + 1].basePriceInCents
      );
    }
  });

  it("should handle pagination accurately", async () => {
    const pageSize = 3;
    const page1 = await getPublishedProducts({ page: 1, limit: pageSize });
    const page2 = await getPublishedProducts({ page: 2, limit: pageSize });

    expect(page1.products.length).toBe(pageSize);
    expect(page1.pagination.page).toBe(1);
    expect(page1.pagination.limit).toBe(pageSize);
    expect(page1.pagination.hasNextPage).toBe(true);
    expect(page1.pagination.hasPrevPage).toBe(false);

    expect(page2.pagination.page).toBe(2);
    expect(page2.pagination.hasPrevPage).toBe(true);

    // Products on page 1 and page 2 should not overlap
    const page1Ids = page1.products.map((p) => p.id);
    const page2Ids = page2.products.map((p) => p.id);
    const intersection = page1Ids.filter((id) => page2Ids.includes(id));
    expect(intersection.length).toBe(0);
  });

  it("should fetch a single product by slug with variants and images", async () => {
    const slug = "double-breasted-cashmere-trench";
    const product = await getProductBySlug(slug);

    expect(product).not.toBeNull();
    expect(product?.slug).toBe(slug);
    expect(product?.title).toBe("Double-Breasted Cashmere Trench");
    expect(product?.variants.length).toBeGreaterThan(0);
    expect(product?.images.length).toBeGreaterThan(0);
  });

  it("should return null for unpublished products by default, but allow access when includeUnpublished is true", async () => {
    const unpublishedSlug = "bespoke-vicuna-overcoat-private-archive";

    // Public lookup: must be null
    const publicLookup = await getProductBySlug(unpublishedSlug);
    expect(publicLookup).toBeNull();

    // Internal lookup: returns the product
    const internalLookup = await getProductBySlug(unpublishedSlug, {
      includeUnpublished: true,
    });
    expect(internalLookup).not.toBeNull();
    expect(internalLookup?.published).toBe(false);
  });

  it("should fetch all categories", async () => {
    const categories = await getCategories();
    expect(categories.length).toBe(3);
    const slugs = categories.map((c) => c.slug);
    expect(slugs).toContain("apparel");
    expect(slugs).toContain("footwear");
    expect(slugs).toContain("accessories");
  });

  it("should fetch related products excluding the current product", async () => {
    const targetSlug = "double-breasted-cashmere-trench";
    const product = await getProductBySlug(targetSlug);
    expect(product).not.toBeNull();

    const related = await getRelatedProducts(product!.id, product!.category, 2);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(2);

    // Should not contain the original product
    const containsOriginal = related.some((p) => p.id === product!.id);
    expect(containsOriginal).toBe(false);

    // All should share the category
    related.forEach((p) => {
      expect(p.category.toLowerCase()).toBe(product!.category.toLowerCase());
    });
  });

  it("should authoritatively resolve variant stock and price", async () => {
    const product = await getProductBySlug("double-breasted-cashmere-trench");
    const variantId = product!.variants[0].id;

    const stockInfo = await getVariantStock(variantId);
    expect(stockInfo).not.toBeNull();
    expect(stockInfo?.id).toBe(variantId);
    expect(stockInfo?.stock).toBeGreaterThan(0);
    expect(stockInfo?.available).toBe(true);
    expect(stockInfo?.priceInCents).toBe(product!.variants[0].priceInCents);
  });
});
