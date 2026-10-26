import React from "react";
import Link from "next/link";
import { getInventoryMovements } from "@/services/inventory.service";
import { ArrowLeft, TrendingUp, TrendingDown, History } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { requireAdminPageSession } from "@/lib/admin-auth";

interface MovementsPageProps {
  searchParams: Promise<{
    variantId?: string;
    page?: string;
  }>;
}

export default async function AdminInventoryMovementsPage({
  searchParams,
}: MovementsPageProps) {
  const { businessId } = await requireAdminPageSession("VIEW_ADMIN");
  const resolvedParams = await searchParams;
  const variantId = resolvedParams.variantId || undefined;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { movements, pagination } = await getInventoryMovements({
    businessId,
    variantId,
    page: isNaN(page) ? 1 : page,
    limit: 25,
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-500 hover:text-bronze transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Inventory
          </Link>
          <h1 className="text-3xl font-serif text-charcoal-900">
            Stock Audit Ledger
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Immutable transaction history of all stock additions, deductions, write-offs, and corrections.
          </p>
        </div>
      </div>

      {/* Movements Ledger Table */}
      <div className="bg-canvas-surface border border-border-default overflow-hidden">
        {movements.length === 0 ? (
          <div className="py-20 text-center text-charcoal-500 space-y-2">
            <History className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
            <p className="text-sm font-serif text-charcoal-900">
              No audit movements found in this ledger query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-secondary/50 text-charcoal-500 uppercase tracking-wider text-[10px] border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Piece / SKU</th>
                  <th className="py-3 px-4 font-semibold">Stock Delta</th>
                  <th className="py-3 px-4 font-semibold">Classification</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {movements.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-canvas-secondary/20 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-charcoal-500">
                        {new Date(m.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Product & Variant */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-charcoal-900">
                          {m.variant.product.title}
                        </div>
                        <div className="text-[11px] text-charcoal-500 font-mono">
                          {m.variant.title} ({m.variant.sku})
                        </div>
                      </td>

                      {/* Delta */}
                      <td className="py-3 px-4 font-mono font-semibold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs ${
                            isPositive
                              ? "text-emerald-800 bg-emerald-50"
                              : "text-rose-800 bg-rose-50"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          <span className="text-[10px] text-charcoal-400 ml-1.5 font-normal">
                            ({m.previousStock} &rarr; {m.newStock})
                          </span>
                        </span>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium bg-canvas-secondary border border-border-default text-charcoal-700">
                          {m.type.replace("_", " ")}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 text-charcoal-700 max-w-sm">
                        {m.reason || "—"}
                      </td>

                      {/* Reference */}
                      <td className="py-3 px-4 font-mono text-charcoal-500 text-[11px]">
                        {m.reference || "—"}
                      </td>

                      {/* Admin User */}
                      <td className="py-3 px-4 text-charcoal-600">
                        <div>{m.user?.name || "Atelier Admin"}</div>
                        <div className="text-[10px] text-charcoal-400">
                          {m.user?.email || "system"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-charcoal-600">
            <span>
              Showing {movements.length} of {pagination.total} audit movements
            </span>
            <div className="flex space-x-2">
              <Link
                href={`/admin/inventory/movements?page=${pagination.page - 1}`}
                className={pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}
              >
                <Button variant="outline" size="sm" disabled={pagination.page <= 1}>
                  Previous
                </Button>
              </Link>
              <span className="px-3 py-1 bg-canvas-secondary border border-border-default font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Link
                href={`/admin/inventory/movements?page=${pagination.page + 1}`}
                className={
                  pagination.page >= pagination.totalPages
                    ? "pointer-events-none opacity-40"
                    : ""
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
