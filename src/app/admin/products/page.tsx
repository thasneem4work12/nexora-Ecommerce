import React from "react";
import {
  getAdminProducts,
  getAdminCategories,
} from "@/services/admin-catalog.service";
import { ProductListTable } from "@/components/admin/ProductListTable";

interface AdminProductsPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: "all" | "published" | "draft" | "archived";
    page?: string;
  }>;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const categoryId = resolvedParams.categoryId || "all";
  const status = resolvedParams.status || "all";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const [categories, { products, pagination }] = await Promise.all([
    getAdminCategories(),
    getAdminProducts({
      search,
      categoryId,
      status,
      page: isNaN(page) ? 1 : page,
      limit: 15,
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          Catalog Operations
        </span>
        <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
          Creations & Products
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 font-light">
          Manage handcrafted garments, bench-made footwear, SKUs, imagery, and publication states.
        </p>
      </div>

      {/* Interactive Product List Table */}
      <ProductListTable
        initialProducts={products}
        categories={categories}
        currentSearch={search}
        currentCategory={categoryId}
        currentStatus={status}
        pagination={pagination}
      />
    </div>
  );
}
