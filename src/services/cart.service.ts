import { prisma } from "@/lib/prisma";
import type { CartLineItem, CartSummary } from "@/types";

export interface CartValidationResult {
  isValid: boolean;
  issues: Array<{
    variantId: string;
    issue: "OUT_OF_STOCK" | "QUANTITY_EXCEEDED" | "PRICE_CHANGED" | "PRODUCT_UNAVAILABLE";
    message: string;
    requestedQuantity: number;
    availableStock?: number;
    dbPriceInCents?: number;
  }>;
  authoritativeCart: CartSummary;
}

/**
 * Validates a client cart payload against authoritative PostgreSQL database records.
 * Ensures stock levels are not exceeded and calculates true totals using current database prices.
 */
export async function validateCart(clientItems: CartLineItem[]): Promise<CartValidationResult> {
  const issues: CartValidationResult["issues"] = [];
  const verifiedLineItems: CartLineItem[] = [];

  for (const item of clientItems) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            published: true,
            images: {
              take: 1,
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!variant || !variant.product.published) {
      issues.push({
        variantId: item.variantId,
        issue: "PRODUCT_UNAVAILABLE",
        message: `The item "${item.title}" is no longer available in the atelier collection.`,
        requestedQuantity: item.quantity,
      });
      continue;
    }

    if (variant.stock <= 0) {
      issues.push({
        variantId: item.variantId,
        issue: "OUT_OF_STOCK",
        message: `"${variant.product.title} (${variant.title})" is currently sold out.`,
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    let verifiedQuantity = item.quantity;
    if (item.quantity > variant.stock) {
      verifiedQuantity = variant.stock;
      issues.push({
        variantId: item.variantId,
        issue: "QUANTITY_EXCEEDED",
        message: `Only ${variant.stock} piece(s) available for "${variant.product.title} (${variant.title})". Quantity adjusted.`,
        requestedQuantity: item.quantity,
        availableStock: variant.stock,
      });
    }

    if (item.priceInCents !== variant.priceInCents) {
      issues.push({
        variantId: item.variantId,
        issue: "PRICE_CHANGED",
        message: `Price for "${variant.product.title}" has been updated to the current atelier price.`,
        requestedQuantity: verifiedQuantity,
        dbPriceInCents: variant.priceInCents,
      });
    }

    verifiedLineItems.push({
      variantId: variant.id,
      productId: variant.productId,
      title: variant.product.title,
      variantTitle: variant.title,
      priceInCents: variant.priceInCents, // authoritative DB price
      quantity: verifiedQuantity,
      image: variant.product.images[0]?.url || item.image,
      maxStock: variant.stock,
    });
  }

  const itemCount = verifiedLineItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalInCents = verifiedLineItems.reduce(
    (sum, i) => sum + i.priceInCents * i.quantity,
    0
  );
  const estimatedTaxInCents = Math.round(subtotalInCents * 0.08);
  const shippingInCents = subtotalInCents > 15000 || subtotalInCents === 0 ? 0 : 1500;
  const totalInCents = subtotalInCents + estimatedTaxInCents + shippingInCents;

  return {
    isValid: issues.length === 0,
    issues,
    authoritativeCart: {
      items: verifiedLineItems,
      itemCount,
      subtotalInCents,
      estimatedTaxInCents,
      shippingInCents,
      totalInCents,
    },
  };
}
