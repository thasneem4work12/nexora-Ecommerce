"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Archive,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryId?: string | null;
  basePriceInCents: number;
  featured: boolean;
  published: boolean;
  isArchived: boolean;
  totalStock: number;
  variantCount: number;
  hasLowStock: boolean;
  hasOutOfStock: boolean;
  image: string;
  updatedAt: Date;
}

interface ProductListTableProps {
  initialProducts: ProductRow[];
  categories: { id: string; name: string; slug: string }[];
  currentSearch?: string;
  currentCategory?: string;
  currentStatus?: string;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export function ProductListTable({
  initialProducts,
  categories,
  currentSearch = "",
  currentCategory = "all",
  currentStatus = "all",
  pagination,
}: ProductListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const updateFilters = (updates: {
    search?: string;
    categoryId?: string;
    status?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams(window.location.search);

    if (updates.search !== undefined) {
      if (updates.search.trim()) params.set("search", updates.search.trim());
      else params.delete("search");
      params.delete("page");
    }

    if (updates.categoryId !== undefined) {
      if (updates.categoryId === "all") params.delete("categoryId");
      else params.set("categoryId", updates.categoryId);
      params.delete("page");
    }

    if (updates.status !== undefined) {
      if (updates.status === "all") params.delete("status");
      else params.set("status", updates.status);
      params.delete("page");
    }

    if (updates.page !== undefined) {
      params.set("page", updates.page.toString());
    }

    startTransition(() => {
      const q = params.toString();
      router.push(`/admin/products${q ? `?${q}` : ""}`);
    });
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      setLoadingActionId(id);
      const res = await fetch(`/api/admin/products/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !currentPublished }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to toggle publication status.");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error updating product status.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleArchiveToggle = async (id: string, isArchived: boolean) => {
    const confirmed = confirm(
      isArchived
        ? "Restore this product to the active catalog?"
        : "Archive this piece? It will be removed from customer storefronts while preserving all historical order and inventory audit records."
    );
    if (!confirmed) return;

    try {
      setLoadingActionId(id);
      const res = await fetch(`/api/admin/products/${id}/archive`, {
        method: isArchived ? "DELETE" : "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to update archive status.");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error processing archive request.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const statusTabs = [
    { id: "all", label: "All Works" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Category Filters */}
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
            placeholder="Search by title, SKU, or tailoring note..."
            className="w-full pl-9 pr-4 py-2 bg-canvas-primary border border-border-default text-xs tracking-wider text-charcoal-900 focus:outline-none focus:border-bronze"
          />
        </form>

        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currentCategory}
            onChange={(e) => updateFilters({ categoryId: e.target.value })}
            className="bg-canvas-primary border border-border-default text-xs uppercase tracking-wider text-charcoal-900 py-2 px-3 focus:outline-none focus:border-bronze cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Link href="/admin/products/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Creation
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-border-default space-x-6 text-xs uppercase tracking-luxury">
        {statusTabs.map((tab) => {
          const isActive = currentStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => updateFilters({ status: tab.id })}
              className={`pb-3 font-medium transition-colors relative ${
                isActive
                  ? "text-bronze font-semibold"
                  : "text-charcoal-500 hover:text-charcoal-900"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bronze" />
              )}
            </button>
          );
        })}
      </div>

      {/* Table Card */}
      <div className="bg-canvas-surface border border-border-default overflow-hidden">
        {initialProducts.length === 0 ? (
          <div className="py-20 text-center text-charcoal-500 space-y-3">
            <p className="text-base font-serif text-charcoal-900">
              No creations found matching your filter criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                updateFilters({ search: "", categoryId: "all", status: "all" });
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
                  <th className="py-3 px-4 font-semibold">Creation</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Base Price</th>
                  <th className="py-3 px-4 font-semibold">Variants / Stock</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {initialProducts.map((p) => {
                  const isLoading = loadingActionId === p.id || isPending;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-canvas-secondary/20 transition-colors"
                    >
                      {/* Product Preview */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-12 h-14 bg-canvas-secondary border border-border-subtle flex-shrink-0 overflow-hidden">
                            <Image
                              src={p.image}
                              alt={p.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-medium text-charcoal-900 hover:text-bronze transition-colors line-clamp-1"
                            >
                              {p.title}
                            </Link>
                            <span className="text-[10px] text-charcoal-400 font-mono">
                              /{p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-charcoal-700">
                        <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase bg-canvas-secondary border border-border-default font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono font-medium text-charcoal-900">
                        {formatPrice(p.basePriceInCents)}
                      </td>

                      {/* Variants & Stock */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono">
                          <span className="font-semibold text-charcoal-900">
                            {p.totalStock}
                          </span>{" "}
                          units
                          <span className="text-charcoal-500 text-[10px] ml-1">
                            ({p.variantCount} SKUs)
                          </span>
                        </div>
                        {p.hasOutOfStock ? (
                          <div className="flex items-center text-[10px] text-rose-700 mt-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Contains sold-out SKU
                          </div>
                        ) : p.hasLowStock ? (
                          <div className="flex items-center text-[10px] text-amber-700 mt-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low stock alert
                          </div>
                        ) : null}
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4">
                        {p.isArchived ? (
                          <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-charcoal-200 text-charcoal-800">
                            Archived
                          </span>
                        ) : p.published ? (
                          <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Publish/Unpublish toggle */}
                          {!p.isArchived && (
                            <button
                              onClick={() => handleTogglePublish(p.id, p.published)}
                              disabled={isLoading}
                              className="p-1.5 text-charcoal-500 hover:text-charcoal-900 transition-colors"
                              title={p.published ? "Unpublish to draft" : "Publish to storefront"}
                              aria-label={p.published ? "Unpublish" : "Publish"}
                            >
                              {p.published ? (
                                <Eye className="w-4 h-4 text-emerald-700" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-charcoal-400" />
                              )}
                            </button>
                          )}

                          {/* Edit button */}
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="p-1.5 text-charcoal-500 hover:text-bronze transition-colors"
                            title="Edit creation and variants"
                            aria-label={`Edit ${p.title}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Archive/Restore button */}
                          <button
                            onClick={() => handleArchiveToggle(p.id, p.isArchived)}
                            disabled={isLoading}
                            className={`p-1.5 transition-colors ${
                              p.isArchived
                                ? "text-bronze hover:text-bronze-dark"
                                : "text-charcoal-400 hover:text-rose-600"
                            }`}
                            title={p.isArchived ? "Restore product" : "Archive product"}
                            aria-label={p.isArchived ? "Restore" : "Archive"}
                          >
                            {p.isArchived ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-charcoal-600">
            <span>
              Showing {initialProducts.length} of {pagination.total} creations
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
    </div>
  );
}
