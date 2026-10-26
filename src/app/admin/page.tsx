import React from "react";
import Link from "next/link";
import { getDashboardMetrics } from "@/services/admin-catalog.service";
import { getAdminOrderMetrics } from "@/services/admin-order.service";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  History,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { Button } from "@/components/ui/Button";

export default async function AdminDashboardPage() {
  const { businessId } = await requireAdminPageSession("VIEW_ADMIN");

  const [metrics, orderMetrics] = await Promise.all([
    getDashboardMetrics(businessId),
    getAdminOrderMetrics(businessId),
  ]);

  return (
    <div className="space-y-10">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Atelier Command Center
          </span>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Dashboard Overview
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Real-time catalog, orders, and inventory analytics queried directly from PostgreSQL.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm">
              <ShoppingBag className="w-4 h-4 mr-2" /> Orders ({orderMetrics.totalOrders})
            </Button>
          </Link>
          <Link href="/admin/inventory">
            <Button variant="outline" size="sm">
              <Boxes className="w-4 h-4 mr-2" /> Adjust Stock
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" /> New Creation
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Gross Revenue */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Gross Revenue</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif text-charcoal-900">
            {formatPrice(orderMetrics.totalRevenueInCents)}
          </div>
          <div className="text-[11px] text-charcoal-500">
            <span>{orderMetrics.paidOrders} settled commissions</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Fulfillment</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-serif text-charcoal-900">
            {orderMetrics.totalOrders}
          </div>
          <div className="text-[11px] text-charcoal-500">
            <span>{orderMetrics.pendingFulfillment} pending atelier dispatch</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Active Creations</span>
            <Package className="w-4 h-4 text-bronze" />
          </div>
          <div className="text-2xl font-serif text-charcoal-900">
            {metrics.totalProducts}
          </div>
          <div className="text-[11px] text-charcoal-500 flex items-center">
            <span>{metrics.publishedProducts} published</span>
          </div>
        </div>

        {/* Total Variants */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Total SKUs</span>
            <Boxes className="w-4 h-4 text-bronze" />
          </div>
          <div className="text-2xl font-serif text-charcoal-900">
            {metrics.totalVariants}
          </div>
          <div className="text-[11px] text-charcoal-500">
            <span>Size & color combinations</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif text-amber-700">
            {metrics.lowStockVariants}
          </div>
          <div className="text-[11px] text-amber-800">
            <span>At or below threshold</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-canvas-surface p-5 border border-border-default space-y-2">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs uppercase tracking-wider font-medium">Sold Out</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif text-rose-700">
            {metrics.outOfStockVariants}
          </div>
          <div className="text-[11px] text-rose-800">
            <span>Requires restocking</span>
          </div>
        </div>
      </div>

      {/* Recent Inventory Adjustments Auditing Table */}
      <div className="bg-canvas-surface border border-border-default p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              Auditable Transaction Trail
            </span>
            <h2 className="text-xl font-serif text-charcoal-900 mt-0.5">
              Recent Inventory Adjustments
            </h2>
          </div>
          <Link
            href="/admin/inventory/movements"
            className="text-xs uppercase tracking-wider text-charcoal-700 hover:text-bronze font-medium flex items-center transition-colors"
          >
            Complete Ledger <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>

        {metrics.recentMovements.length === 0 ? (
          <div className="py-12 text-center text-charcoal-500 text-xs">
            <History className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
            No inventory adjustments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-secondary/50 text-charcoal-500 uppercase tracking-wider text-[10px] border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Piece / SKU</th>
                  <th className="py-3 px-4 font-semibold">Adjustment</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {metrics.recentMovements.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-canvas-secondary/30 transition-colors">
                      <td className="py-3.5 px-4 text-charcoal-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-charcoal-900">
                        <div>{m.variant.product.title}</div>
                        <div className="text-[11px] text-charcoal-500 font-mono">
                          {m.variant.title} ({m.variant.sku})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
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
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-medium bg-canvas-secondary border border-border-default text-charcoal-700">
                          {m.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-700 max-w-xs truncate">
                        {m.reason || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-600">
                        {m.user?.name || m.user?.email || "System"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
