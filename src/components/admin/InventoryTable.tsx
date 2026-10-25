"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes,
  Sliders,
  Search,
  AlertTriangle,
  History,
  X,
  AlertCircle,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { InventoryMovementType } from "@prisma/client";

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  size: string | null;
  color: string | null;
  priceInCents: number;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isActive: boolean;
  product: {
    id: string;
    title: string;
    category: string;
    published: boolean;
    image: string | null;
  };
  latestMovement: {
    id: string;
    quantityChange: number;
    previousStock: number;
    newStock: number;
    type: InventoryMovementType;
    reason: string | null;
    createdAt: Date;
    user: { name: string; email: string } | null;
  } | null;
}

interface InventoryTableProps {
  initialItems: InventoryItem[];
  currentSearch?: string;
  currentLowStockOnly?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export function InventoryTable({
  initialItems,
  currentSearch = "",
  currentLowStockOnly = false,
  pagination,
}: InventoryTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [activeTab, setActiveTab] = useState<"all" | "low_stock">(
    currentLowStockOnly ? "low_stock" : "all"
  );

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [movementType, setMovementType] = useState<InventoryMovementType>("RESTOCK");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateFilters = (updates: { search?: string; lowStockOnly?: boolean; page?: number }) => {
    const params = new URLSearchParams(window.location.search);

    if (updates.search !== undefined) {
      if (updates.search.trim()) params.set("search", updates.search.trim());
      else params.delete("search");
      params.delete("page");
    }

    if (updates.lowStockOnly !== undefined) {
      if (updates.lowStockOnly) params.set("lowStockOnly", "true");
      else params.delete("lowStockOnly");
      params.delete("page");
    }

    if (updates.page !== undefined) {
      params.set("page", updates.page.toString());
    }

    const q = params.toString();
    router.push(`/admin/inventory${q ? `?${q}` : ""}`);
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedVariant(item);
    setDelta(5); // default suggested increase
    setMovementType("RESTOCK");
    setReason("");
    setReference("");
    setErrorMessage(null);
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    if (delta === 0) {
      setErrorMessage("Adjustment delta must be positive or negative.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("An audit reason is required for every stock adjustment.");
      return;
    }

    // Client-side negative stock check
    if (selectedVariant.stock + delta < 0) {
      setErrorMessage(
        `Cannot adjust stock by ${delta}. Current stock is ${selectedVariant.stock}, so stock would become negative.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          delta,
          type: movementType,
          reason: reason.trim(),
          reference: reference.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust stock.");
      }

      setAdjustModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-canvas-surface border border-border-default p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters({ search });
          }}
          className="relative flex-1 max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, variant title, or product name..."
            className="w-full pl-9 pr-4 py-2 bg-canvas-primary border border-border-default text-xs tracking-wider text-charcoal-900 focus:outline-none focus:border-bronze"
          />
        </form>

        <div className="flex items-center space-x-3">
          <Link href="/admin/inventory/movements">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-1.5" /> View Audit Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default space-x-6 text-xs uppercase tracking-luxury">
        <button
          onClick={() => {
            setActiveTab("all");
            updateFilters({ lowStockOnly: false });
          }}
          className={`pb-3 font-medium transition-colors relative ${
            activeTab === "all"
              ? "text-bronze font-semibold"
              : "text-charcoal-500 hover:text-charcoal-900"
          }`}
        >
          All SKUs
          {activeTab === "all" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bronze" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("low_stock");
            updateFilters({ lowStockOnly: true });
          }}
          className={`pb-3 font-medium transition-colors relative ${
            activeTab === "low_stock"
              ? "text-bronze font-semibold"
              : "text-charcoal-500 hover:text-charcoal-900"
          }`}
        >
          Low Stock Alerts Only
          {activeTab === "low_stock" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bronze" />
          )}
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-canvas-surface border border-border-default overflow-hidden">
        {initialItems.length === 0 ? (
          <div className="py-20 text-center text-charcoal-500 space-y-3">
            <Boxes className="w-10 h-10 text-charcoal-300 mx-auto mb-2" />
            <p className="text-base font-serif text-charcoal-900">
              No inventory records match your criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveTab("all");
                updateFilters({ search: "", lowStockOnly: false });
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-secondary/50 text-charcoal-500 uppercase tracking-wider text-[10px] border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Creation / Variant</th>
                  <th className="py-3 px-4 font-semibold">Price</th>
                  <th className="py-3 px-4 font-semibold">Current Stock</th>
                  <th className="py-3 px-4 font-semibold">Low-Stock Alert Level</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {initialItems.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas-secondary/20 transition-colors">
                    {/* SKU */}
                    <td className="py-3.5 px-4 font-mono font-medium text-charcoal-900">
                      {item.sku}
                    </td>

                    {/* Product & Variant */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        {item.product.image && (
                          <div className="relative w-8 h-10 bg-canvas-secondary border border-border-subtle overflow-hidden flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.title}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-charcoal-900">
                            {item.product.title}
                          </div>
                          <div className="text-[11px] text-charcoal-500">
                            {item.title} {item.size ? `(${item.size})` : ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-mono">
                      {formatPrice(item.priceInCents)}
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-4 font-mono text-sm font-semibold">
                      <span
                        className={
                          item.isOutOfStock
                            ? "text-rose-700"
                            : item.isLowStock
                            ? "text-amber-700"
                            : "text-charcoal-900"
                        }
                      >
                        {item.stock}
                      </span>
                    </td>

                    {/* Low Stock Threshold */}
                    <td className="py-3.5 px-4 font-mono text-charcoal-500">
                      &le; {item.lowStockThreshold} units
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Sold Out
                        </span>
                      ) : item.isLowStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 mr-1" /> Plentiful
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustModal(item)}
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1" /> Adjust Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-charcoal-600">
            <span>
              Showing {initialItems.length} of {pagination.total} variants
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ page: pagination.page - 1 })}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1 bg-canvas-secondary border border-border-default font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-canvas-surface border border-border-default max-w-lg w-full shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-luxury text-bronze font-semibold">
                  Audited Stock Modification
                </span>
                <h3 className="text-base font-serif text-charcoal-900">
                  {selectedVariant.product.title}
                </h3>
                <span className="text-xs font-mono text-charcoal-500">
                  {selectedVariant.title} ({selectedVariant.sku})
                </span>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              {/* Current Stock vs New Stock Preview */}
              <div className="p-4 bg-canvas-secondary/50 border border-border-default grid grid-cols-3 text-center">
                <div>
                  <div className="text-[10px] uppercase text-charcoal-500">Current Stock</div>
                  <div className="text-xl font-serif text-charcoal-900 mt-0.5">
                    {selectedVariant.stock}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-charcoal-500">Delta</div>
                  <div className="text-xl font-mono mt-0.5">
                    {delta > 0 ? (
                      <span className="text-emerald-700 font-bold">+{delta}</span>
                    ) : delta < 0 ? (
                      <span className="text-rose-700 font-bold">{delta}</span>
                    ) : (
                      <span className="text-charcoal-400">0</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-charcoal-500">Projected Stock</div>
                  <div
                    className={`text-xl font-serif mt-0.5 ${
                      selectedVariant.stock + delta < 0
                        ? "text-rose-700 font-bold"
                        : "text-charcoal-900"
                    }`}
                  >
                    {selectedVariant.stock + delta}
                  </div>
                </div>
              </div>

              {/* Delta Adjustment Stepper / Input */}
              <div>
                <label className="block uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Stock Change (Enter positive to add, negative to subtract) *
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => prev - 1)}
                    className="px-3 py-2 bg-canvas-secondary border border-border-default font-mono hover:bg-canvas-surface"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => prev - 5)}
                    className="px-3 py-2 bg-canvas-secondary border border-border-default font-mono hover:bg-canvas-surface"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    required
                    value={delta}
                    onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-canvas-primary border border-border-default px-3 py-2 text-center text-sm font-mono font-bold focus:outline-none focus:border-bronze"
                  />
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => prev + 1)}
                    className="px-3 py-2 bg-canvas-secondary border border-border-default font-mono hover:bg-canvas-surface"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => prev + 5)}
                    className="px-3 py-2 bg-canvas-secondary border border-border-default font-mono hover:bg-canvas-surface"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Adjustment Reason Type */}
              <div>
                <label className="block uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Movement Classification *
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as InventoryMovementType)}
                  className="w-full bg-canvas-primary border border-border-default px-3 py-2 focus:outline-none focus:border-bronze cursor-pointer uppercase tracking-wider"
                >
                  <option value="RESTOCK">Restock (Received Batch from Workshop)</option>
                  <option value="MANUAL_CORRECTION">Manual Count Correction</option>
                  <option value="RETURN">Customer Return (Restocked)</option>
                  <option value="DAMAGED">Damaged / Flawed Garment Write-off</option>
                  <option value="RESERVATION">Private VIP Reservation Hold</option>
                </select>
              </div>

              {/* Reason Explanation */}
              <div>
                <label className="block uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Audit Reason / Explanation *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Received shipment batch #8812 from Biella atelier..."
                  className="w-full bg-canvas-primary border border-border-default p-2 text-xs focus:outline-none focus:border-bronze"
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Reference Code (Optional — PO # / Invoice #)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. PO-2026-OCT-09"
                  className="w-full bg-canvas-primary border border-border-default px-3 py-2 font-mono text-xs focus:outline-none focus:border-bronze"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-border-subtle flex justify-end space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={delta === 0 || selectedVariant.stock + delta < 0}
                >
                  Confirm & Audit Stock Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
