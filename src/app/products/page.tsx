import React, { Suspense } from "react";
import Link from "next/link";
import { getPublishedProducts, getCategories } from "@/services/catalog.service";
import { ProductCard } from "@/components/product/ProductCard";
import { CatalogToolbar } from "@/components/product/CatalogToolbar";
import type { ProductSortOption } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || "all";
  const currentSearch = resolvedParams.search || "";
  const currentSort = (resolvedParams.sort as ProductSortOption) || "featured";
  const currentPage = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const [categories, { products, pagination }] = await Promise.all([
    getCategories(),
    getPublishedProducts({
      category: currentCategory,
      search: currentSearch,
      sort: currentSort,
      page: isNaN(currentPage) ? 1 : currentPage,
      limit: 9, // Luxury 9-item grid
      includeUnpublished: false, // Customer security
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Page Header */}
      <div className="border-b border-border-default pb-8 mb-8">
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          The House Catalog
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif text-charcoal-900 mt-2">
          Curated Creations
        </h1>
        <p className="text-sm text-charcoal-500 mt-2 max-w-xl font-light">
          Explore our limited collection of made-to-order garments, bench-made footwear, and leather accoutrements.
        </p>

        {/* Toolbar with Search, Category Filter, and Sorting */}
        <div className="mt-8">
          <Suspense fallback={<div className="h-10 bg-canvas-secondary/50 animate-pulse" />}>
            <CatalogToolbar
              categories={categories}
              currentCategory={currentCategory}
              currentSort={currentSort}
              currentSearch={currentSearch}
              totalCount={pagination.total}
            />
          </Suspense>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-lg font-serif text-charcoal-900">
            No creations found matching your criteria.
          </p>
          <p className="text-xs text-charcoal-500 mt-2">
            Try adjusting your search terms or view our complete collections.
          </p>
          <Link
            href="/products"
            className="inline-block mt-6 px-6 py-2.5 text-xs uppercase tracking-luxury bg-charcoal-900 text-canvas-primary hover:bg-bronze transition-colors"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-16 pt-8 border-t border-border-default flex items-center justify-between">
              <div>
                {pagination.hasPrevPage ? (
                  <Link
                    href={`/products?${new URLSearchParams({
                      ...(currentCategory !== "all" && { category: currentCategory }),
                      ...(currentSearch && { search: currentSearch }),
                      ...(currentSort !== "featured" && { sort: currentSort }),
                      page: (pagination.page - 1).toString(),
                    }).toString()}`}
                    className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-700 hover:text-bronze transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-300 cursor-not-allowed">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </span>
                )}
              </div>

              <div className="text-xs uppercase tracking-luxury text-charcoal-600">
                Page {pagination.page} of {pagination.totalPages}
              </div>

              <div>
                {pagination.hasNextPage ? (
                  <Link
                    href={`/products?${new URLSearchParams({
                      ...(currentCategory !== "all" && { category: currentCategory }),
                      ...(currentSearch && { search: currentSearch }),
                      ...(currentSort !== "featured" && { sort: currentSort }),
                      page: (pagination.page + 1).toString(),
                    }).toString()}`}
                    className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-700 hover:text-bronze transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-300 cursor-not-allowed">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
