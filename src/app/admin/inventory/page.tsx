import React from "react";
import { getInventoryItems } from "@/services/inventory.service";
import { InventoryTable } from "@/components/admin/InventoryTable";

import { requireAdminPageSession } from "@/lib/admin-auth";

interface AdminInventoryPageProps {
  searchParams: Promise<{
    search?: string;
    lowStockOnly?: string;
    page?: string;
  }>;
}

export default async function AdminInventoryPage({
  searchParams,
}: AdminInventoryPageProps) {
  const { businessId } = await requireAdminPageSession("VIEW_ADMIN");
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const lowStockOnly = resolvedParams.lowStockOnly === "true";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { items, pagination } = await getInventoryItems({
    businessId,
    search,
    lowStockOnly,
    page: isNaN(page) ? 1 : page,
    limit: 20,
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          Real-Time Physical Stock
        </span>
        <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
          Inventory & Stock Management
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 font-light">
          Monitor size and color variant quantities, configure low-stock alerts, and execute auditable stock adjustments.
        </p>
      </div>

      <InventoryTable
        initialItems={items}
        currentSearch={search}
        currentLowStockOnly={lowStockOnly}
        pagination={pagination}
      />
    </div>
  );
}
