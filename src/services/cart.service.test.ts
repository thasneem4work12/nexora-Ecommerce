import { describe, it, expect } from "vitest";
import { validateCart } from "./cart.service";
import { getProductBySlug } from "./catalog.service";
import type { CartLineItem } from "@/types";

describe("Cart Service (Server-side Inventory & Price Validation)", () => {
  it("should validate and accept an in-stock cart with accurate calculations", async () => {
    const product = await getProductBySlug("double-breasted-cashmere-trench");
    expect(product).not.toBeNull();
    const variant = product!.variants[0];

    const clientItems: CartLineItem[] = [
      {
        variantId: variant.id,
        productId: product!.id,
        title: product!.title,
        variantTitle: variant.title,
        priceInCents: variant.priceInCents,
        quantity: 1,
        image: product!.images[0],
        maxStock: variant.stock,
      },
    ];

    const result = await validateCart(clientItems);

    expect(result.isValid).toBe(true);
    expect(result.issues.length).toBe(0);
    expect(result.authoritativeCart.items.length).toBe(1);
    expect(result.authoritativeCart.items[0].quantity).toBe(1);
    expect(result.authoritativeCart.subtotalInCents).toBe(variant.priceInCents);
    expect(result.authoritativeCart.totalInCents).toBeGreaterThan(variant.priceInCents);
  });

  it("should clamp quantity and flag issue when requested quantity exceeds database stock", async () => {
    const product = await getProductBySlug("double-breasted-cashmere-trench");
    const variant = product!.variants[0];

    // Request 999 units (far exceeding available stock)
    const excessiveQuantity = 999;
    const clientItems: CartLineItem[] = [
      {
        variantId: variant.id,
        productId: product!.id,
        title: product!.title,
        variantTitle: variant.title,
        priceInCents: variant.priceInCents,
        quantity: excessiveQuantity,
        image: product!.images[0],
        maxStock: excessiveQuantity,
      },
    ];

    const result = await validateCart(clientItems);

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].issue).toBe("QUANTITY_EXCEEDED");
    expect(result.issues[0].availableStock).toBe(variant.stock);
    // Verified line item should be clamped to actual database stock
    expect(result.authoritativeCart.items[0].quantity).toBe(variant.stock);
  });

  it("should detect and correct tampered or altered client-side prices", async () => {
    const product = await getProductBySlug("double-breasted-cashmere-trench");
    const variant = product!.variants[0];

    // Malicious client tampering: sets price to 100 cents ($1.00) instead of $1450.00
    const tamperedPrice = 100;
    const clientItems: CartLineItem[] = [
      {
        variantId: variant.id,
        productId: product!.id,
        title: product!.title,
        variantTitle: variant.title,
        priceInCents: tamperedPrice,
        quantity: 1,
        image: product!.images[0],
        maxStock: variant.stock,
      },
    ];

    const result = await validateCart(clientItems);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.issue === "PRICE_CHANGED")).toBe(true);
    // Authoritative total must use the database price, not the tampered price
    expect(result.authoritativeCart.items[0].priceInCents).toBe(variant.priceInCents);
    expect(result.authoritativeCart.subtotalInCents).toBe(variant.priceInCents);
  });

  it("should reject unavailable or unpublished products", async () => {
    // Attempt to add a non-existent variant ID
    const clientItems: CartLineItem[] = [
      {
        variantId: "non_existent_variant_id",
        productId: "non_existent_prod",
        title: "Ghost Item",
        variantTitle: "Phantom",
        priceInCents: 50000,
        quantity: 1,
        image: "/ghost.jpg",
        maxStock: 5,
      },
    ];

    const result = await validateCart(clientItems);

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].issue).toBe("PRODUCT_UNAVAILABLE");
    expect(result.authoritativeCart.items.length).toBe(0);
  });
});
