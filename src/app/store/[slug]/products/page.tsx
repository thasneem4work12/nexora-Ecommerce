import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveStoreTenant } from "@/lib/tenant-context";
import { getPublishedProducts, getCategories } from "@/services/catalog.service";
import { getStoreAppearance } from "@/services/theme.service";
import { ProductCard } from "@/components/product/ProductCard";
import { CatalogToolbar } from "@/components/product/CatalogToolbar";
import type { ProductSortOption } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StoreProductsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function StoreProductsPage({
  params,
  searchParams,
}: StoreProductsPageProps) {
  const { slug } = await params;
  const tenant = await resolveStoreTenant(slug);

  if (!tenant) {
    notFound();
  }

  const { business } = tenant;
  const appearance = await getStoreAppearance({ businessId: business.id });
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || "all";
  const currentSearch = resolvedParams.search || "";
  const currentSort = (resolvedParams.sort as ProductSortOption) || "featured";
  const currentPage = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const [categories, { products, pagination }] = await Promise.all([
    getCategories(business.id),
    getPublishedProducts({
      businessId: business.id,
      category: currentCategory,
      search: currentSearch,
      sort: currentSort,
      page: isNaN(currentPage) ? 1 : currentPage,
      limit: 9,
      includeUnpublished: false,
    }),
  ]);

  const basePath = `/store/${business.slug}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Page Header */}
      <div className="border-b border-border-default pb-8 mb-8">
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          {appearance.storeName} Catalog
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif text-charcoal-900 mt-2">
          Curated Offerings
        </h1>
        <p className="text-sm text-charcoal-500 mt-2 max-w-xl font-light">
          {appearance.storeTagline || "Discover exclusive creations and premium essentials."}
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
            No items found matching your criteria.
          </p>
          <p className="text-xs text-charcoal-500 mt-2">
            Try adjusting your search terms or view our full inventory.
          </p>
          <Link
            href={`${basePath}/products`}
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
                    href={`${basePath}/products?${new URLSearchParams({
                      ...(currentCategory !== "all" && { category: currentCategory }),
                      ...(currentSearch && { search: currentSearch }),
                      ...(currentSort !== "featured" && { sort: currentSort }),
                      page: (pagination.page - 1).toString(),
                    }).toString()}`}
                    className="inline-flex items-center text-xs tracking-luxury uppercase text-charcoal-700 hover:text-bronze transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Previous
                  </Link>
                ) : (
                  <span className="text-xs tracking-luxury uppercase text-charcoal-300 cursor-not-allowed">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2 inline" /> Previous
                  </span>
                )}
              </div>

              <span className="text-xs text-charcoal-500 uppercase tracking-widest">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <div>
                {pagination.hasNextPage ? (
                  <Link
                    href={`${basePath}/products?${new URLSearchParams({
                      ...(currentCategory !== "all" && { category: currentCategory }),
                      ...(currentSearch && { search: currentSearch }),
                      ...(currentSort !== "featured" && { sort: currentSort }),
                      page: (pagination.page + 1).toString(),
                    }).toString()}`}
                    className="inline-flex items-center text-xs tracking-luxury uppercase text-charcoal-700 hover:text-bronze transition-colors"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                ) : (
                  <span className="text-xs tracking-luxury uppercase text-charcoal-300 cursor-not-allowed">
                    Next <ArrowRight className="w-3.5 h-3.5 ml-2 inline" />
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
