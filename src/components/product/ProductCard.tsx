"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductItem } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ProductCardProps {
  product: ProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const primaryImage = product.images[0] || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800";
  const firstVariant = product.variants[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firstVariant || firstVariant.stock <= 0) return;

    addItem({
      variantId: firstVariant.id,
      productId: product.id,
      title: product.title,
      variantTitle: firstVariant.title,
      priceInCents: firstVariant.priceInCents,
      quantity: 1,
      image: primaryImage,
      maxStock: firstVariant.stock,
    });
  };

  return (
    <div className="group relative flex flex-col bg-canvas-surface border border-border-subtle hover:border-border-strong transition-all duration-300">
      {/* Product Image Container */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-canvas-secondary"
      >
        <Image
          src={primaryImage}
          alt={product.title}
          fill
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.featured && (
            <Badge variant="charcoal">Curated</Badge>
          )}
          {firstVariant && firstVariant.stock <= 3 && firstVariant.stock > 0 && (
            <Badge variant="warning">Few Pieces Left</Badge>
          )}
          {firstVariant && firstVariant.stock === 0 && (
            <Badge variant="danger">Sold Out</Badge>
          )}
        </div>

        {/* Quick Add Overlay on Hover */}
        {firstVariant && firstVariant.stock > 0 && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-charcoal-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center">
            <button
              onClick={handleQuickAdd}
              className="w-full bg-canvas-surface/90 hover:bg-canvas-surface text-charcoal-900 text-xs uppercase tracking-luxury py-2.5 px-4 font-medium transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <Plus className="w-3.5 h-3.5 text-bronze" />
              <span>Quick Add</span>
            </button>
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between bg-canvas-surface">
        <div>
          <span className="text-[10px] tracking-luxury uppercase text-charcoal-500 font-medium">
            {product.category}
          </span>
          <h3 className="text-sm sm:text-base font-serif text-charcoal-900 group-hover:text-bronze transition-colors mt-1 line-clamp-1">
            <Link href={`/products/${product.slug}`}>
              {product.title}
            </Link>
          </h3>
        </div>

        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="text-sm font-medium text-charcoal-900">
            {formatPrice(product.basePriceInCents)}
          </span>
          <span className="text-xs text-charcoal-500">
            {product.variants.length} {product.variants.length === 1 ? "Option" : "Options"}
          </span>
        </div>
      </div>
    </div>
  );
}
