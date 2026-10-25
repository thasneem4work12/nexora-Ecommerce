"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { INITIAL_PRODUCTS } from "@/lib/seed-data";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "All Works" },
  { id: "apparel", label: "Apparel" },
  { id: "footwear", label: "Footwear" },
  { id: "accessories", label: "Accessories" },
];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory.toLowerCase());
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  const filteredProducts = useMemo(() => {
    let result = [...INITIAL_PRODUCTS];

    if (selectedCategory !== "all") {
      result = result.filter(
        (p) => p.category.toLowerCase() === selectedCategory
      );
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => a.basePriceInCents - b.basePriceInCents);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.basePriceInCents - a.basePriceInCents);
    }

    return result;
  }, [selectedCategory, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Page Header */}
      <div className="border-b border-border-default pb-8 mb-10">
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          The House Catalog
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif text-charcoal-900 mt-2">
          Curated Creations
        </h1>
        <p className="text-sm text-charcoal-500 mt-2 max-w-xl font-light">
          Explore our limited collection of made-to-order garments, bench-made footwear, and leather accoutrements.
        </p>

        {/* Filters and Controls */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 text-xs uppercase tracking-luxury transition-all select-none border",
                  selectedCategory === cat.id
                    ? "bg-charcoal-900 text-canvas-primary border-charcoal-900"
                    : "bg-canvas-surface text-charcoal-700 border-border-default hover:border-bronze hover:text-bronze"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Product Counter */}
          <div className="flex items-center space-x-4">
            <span className="text-xs text-charcoal-500">
              {filteredProducts.length} {filteredProducts.length === 1 ? "Piece" : "Pieces"}
            </span>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "featured" | "price-asc" | "price-desc"
                )
              }
              className="bg-canvas-surface border border-border-default text-xs uppercase tracking-wider text-charcoal-900 py-2 px-3 focus:outline-none focus:border-bronze rounded-none cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-base font-serif text-charcoal-900">
            No creations found in this category.
          </p>
          <button
            onClick={() => setSelectedCategory("all")}
            className="mt-4 text-xs uppercase tracking-luxury text-bronze hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="w-8 h-8 border-2 border-bronze border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase tracking-luxury text-charcoal-500">
            Presenting the Collection...
          </p>
        </div>
      }
    >
      <ProductsPageContent />
    </React.Suspense>
  );
}
