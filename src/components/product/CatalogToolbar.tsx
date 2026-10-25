"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { CategoryItem, ProductSortOption } from "@/types";
import { cn } from "@/lib/utils";

interface CatalogToolbarProps {
  categories: CategoryItem[];
  currentCategory: string;
  currentSort: ProductSortOption;
  currentSearch: string;
  totalCount: number;
}

export function CatalogToolbar({
  categories,
  currentCategory,
  currentSort,
  currentSearch,
  totalCount,
}: CatalogToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const updateFilters = (updates: {
    category?: string;
    sort?: string;
    search?: string;
    page?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.category !== undefined) {
      if (updates.category === "all") {
        params.delete("category");
      } else {
        params.set("category", updates.category.toLowerCase());
      }
      params.delete("page"); // Reset page on category change
    }

    if (updates.sort !== undefined) {
      if (updates.sort === "featured") {
        params.delete("sort");
      } else {
        params.set("sort", updates.sort);
      }
    }

    if (updates.search !== undefined) {
      if (!updates.search.trim()) {
        params.delete("search");
      } else {
        params.set("search", updates.search.trim());
      }
      params.delete("page"); // Reset page on search change
    }

    if (updates.page !== undefined) {
      params.set("page", updates.page);
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(`/products${queryString ? `?${queryString}` : ""}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateFilters({ search: "" });
  };

  const categoryList = [
    { id: "all", name: "All Works", slug: "all" },
    ...categories,
  ];

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-md"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by tailoring, fabric, last, or leather..."
              className="w-full pl-10 pr-10 py-2.5 bg-canvas-surface border border-border-default text-xs tracking-wider text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-bronze transition-colors rounded-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-900"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Sort & Counter */}
        <div className="flex items-center justify-between md:justify-end space-x-4">
          <span className="text-xs text-charcoal-500 font-light">
            {isPending ? (
              <span className="text-bronze italic">Updating atelier view...</span>
            ) : (
              `${totalCount} ${totalCount === 1 ? "Creation" : "Creations"}`
            )}
          </span>

          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-charcoal-400 hidden sm:block" />
            <select
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="bg-canvas-surface border border-border-default text-xs uppercase tracking-wider text-charcoal-900 py-2 px-3 focus:outline-none focus:border-bronze rounded-none cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills / Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {categoryList.map((cat) => {
          const isSelected =
            currentCategory === cat.slug.toLowerCase() ||
            (cat.slug === "all" && (!currentCategory || currentCategory === "all"));

          return (
            <button
              key={cat.id}
              onClick={() => updateFilters({ category: cat.slug })}
              className={cn(
                "px-4 py-2 text-xs uppercase tracking-luxury transition-all select-none border",
                isSelected
                  ? "bg-charcoal-900 text-canvas-primary border-charcoal-900 shadow-sm"
                  : "bg-canvas-surface text-charcoal-700 border-border-default hover:border-bronze hover:text-bronze"
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active Search / Filter Tag (if filtered) */}
      {(currentSearch || (currentCategory && currentCategory !== "all")) && (
        <div className="flex items-center gap-2 pt-2 text-xs text-charcoal-500">
          <span>Active filter:</span>
          {currentCategory && currentCategory !== "all" && (
            <span className="inline-flex items-center px-2 py-0.5 bg-canvas-secondary border border-border-default text-charcoal-800 font-medium capitalize">
              {currentCategory}
              <button
                onClick={() => updateFilters({ category: "all" })}
                className="ml-1.5 hover:text-bronze"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {currentSearch && (
            <span className="inline-flex items-center px-2 py-0.5 bg-canvas-secondary border border-border-default text-charcoal-800 font-medium">
              &ldquo;{currentSearch}&rdquo;
              <button
                onClick={handleClearSearch}
                className="ml-1.5 hover:text-bronze"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setSearchInput("");
              updateFilters({ category: "all", search: "" });
            }}
            className="text-[11px] uppercase tracking-wider text-bronze hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
