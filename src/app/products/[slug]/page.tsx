"use client";

import React, { useState } from "react";
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, RefreshCw, Check, AlertCircle } from "lucide-react";
import { INITIAL_PRODUCTS } from "@/lib/seed-data";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const product = INITIAL_PRODUCTS.find((p) => p.slug === slug);
  if (!product) {
    notFound();
  }

  const { addItem } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id || ""
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.variants[0];

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock <= 0) return;

    setIsAdding(true);
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      title: product.title,
      variantTitle: selectedVariant.title,
      priceInCents: selectedVariant.priceInCents,
      quantity,
      image: product.images[selectedImageIndex] || product.images[0],
      maxStock: selectedVariant.stock,
    });

    setTimeout(() => {
      setIsAdding(false);
    }, 400);
  };

  const relatedProducts = INITIAL_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Breadcrumb Back Link */}
      <div className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-500 hover:text-bronze transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left: Gallery Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[3/4] w-full bg-canvas-secondary border border-border-default overflow-hidden">
            <Image
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={product.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-4">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-24 aspect-[3/4] border-2 transition-all ${
                    selectedImageIndex === idx
                      ? "border-bronze shadow-sm"
                      : "border-border-default hover:border-border-strong opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.title} preview ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Purchase Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
                  {product.category}
                </span>
                {selectedVariant && (
                  <span className="text-xs text-charcoal-300 font-mono">
                    SKU: {selectedVariant.sku}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900 leading-tight">
                {product.title}
              </h1>
              <div className="mt-3 text-2xl font-serif text-charcoal-900">
                {formatPrice(selectedVariant ? selectedVariant.priceInCents : product.basePriceInCents)}
              </div>
            </div>

            <p className="text-sm text-charcoal-700 leading-relaxed font-light">
              {product.description}
            </p>

            {/* Variant Selector */}
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <label className="block text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
                Select Option / Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  const isOutOfStock = variant.stock === 0;

                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      disabled={isOutOfStock}
                      className={`px-3 py-3 text-xs uppercase tracking-wider border text-left flex flex-col justify-between transition-all select-none ${
                        isSelected
                          ? "border-charcoal-900 bg-charcoal-900 text-canvas-primary"
                          : isOutOfStock
                          ? "border-border-subtle bg-canvas-secondary/40 text-charcoal-300 cursor-not-allowed line-through"
                          : "border-border-default bg-canvas-surface text-charcoal-900 hover:border-bronze"
                      }`}
                    >
                      <span className="font-medium">{variant.title}</span>
                      <span className={`text-[10px] mt-1 ${isSelected ? "text-canvas-secondary" : "text-charcoal-500"}`}>
                        {variant.stock > 0 ? `${variant.stock} left` : "Sold out"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock Status Indicator */}
            <div className="flex items-center space-x-2 text-xs">
              {selectedVariant && selectedVariant.stock > 5 ? (
                <div className="flex items-center text-emerald-700">
                  <Check className="w-4 h-4 mr-1" /> Ready for Immediate Dispatch
                </div>
              ) : selectedVariant && selectedVariant.stock > 0 ? (
                <div className="flex items-center text-amber-700">
                  <AlertCircle className="w-4 h-4 mr-1" /> Only {selectedVariant.stock} pieces remaining
                </div>
              ) : (
                <div className="flex items-center text-rose-700">
                  <AlertCircle className="w-4 h-4 mr-1" /> Currently Sold Out
                </div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="pt-4 border-t border-border-subtle space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border-default bg-canvas-surface">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2.5 text-charcoal-700 hover:bg-canvas-secondary disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-xs font-medium text-charcoal-900 select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant?.stock || 1, quantity + 1))}
                    disabled={quantity >= (selectedVariant?.stock || 1)}
                    className="px-3 py-2.5 text-charcoal-700 hover:bg-canvas-secondary disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock <= 0}
                  isLoading={isAdding}
                  className="flex-1"
                >
                  {selectedVariant && selectedVariant.stock > 0
                    ? "Add to Shopping Bag"
                    : "Sold Out"}
                </Button>
              </div>
            </div>
          </div>

          {/* Reassurance Accoutrements */}
          <div className="border-t border-border-subtle pt-6 space-y-3 text-xs text-charcoal-500">
            <div className="flex items-center space-x-3">
              <Truck className="w-4 h-4 text-bronze flex-shrink-0" />
              <span>Complimentary express delivery & insured customs packaging</span>
            </div>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-4 h-4 text-bronze flex-shrink-0" />
              <span>Includes Digital Certificate of Provenance</span>
            </div>
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-4 h-4 text-bronze flex-shrink-0" />
              <span>30-day discreet worldwide returns with complimentary collection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Pieces */}
      {relatedProducts.length > 0 && (
        <div className="mt-24 pt-16 border-t border-border-default">
          <div className="mb-10">
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              Harmonizing Pieces
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900 mt-1">
              Complete the Look
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
