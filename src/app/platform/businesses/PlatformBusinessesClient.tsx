"use client";

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  AlertCircle,
} from "lucide-react";

export interface PlatformBusinessItem {
  id: string;
  name: string;
  slug: string;
  isSuspended: boolean;
  suspensionReason?: string | null;
  subscription?: {
    plan?: {
      name: string;
      maxProducts: number;
      maxStaff: number;
    } | null;
  } | null;
  members?: {
    user?: {
      name?: string | null;
      email?: string | null;
    } | null;
  }[];
  _count: {
    products: number;
    members: number;
  };
}

interface PlatformBusinessesClientProps {
  initialBusinesses: PlatformBusinessItem[];
}

export function PlatformBusinessesClient({
  initialBusinesses,
}: PlatformBusinessesClientProps) {
  const [businesses, setBusinesses] = useState<PlatformBusinessItem[]>(initialBusinesses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [suspendingBiz, setSuspendingBiz] = useState<PlatformBusinessItem | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && !b.isSuspended) ||
      (statusFilter === "SUSPENDED" && b.isSuspended);

    return matchesSearch && matchesStatus;
  });

  const handleSuspend = async () => {
    if (!suspendingBiz || !suspensionReason.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/platform/businesses/${suspendingBiz.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspensionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to suspend business.");
      }

      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === suspendingBiz.id
            ? { ...b, isSuspended: true, suspensionReason: suspensionReason.trim() }
            : b
        )
      );
      setFeedback({ type: "success", message: `Business "${suspendingBiz.name}" has been suspended.` });
      setSuspendingBiz(null);
      setSuspensionReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to suspend business.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (business: PlatformBusinessItem) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/platform/businesses/${business.id}/reactivate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reactivate business.");
      }

      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === business.id
            ? { ...b, isSuspended: false, suspensionReason: null }
            : b
        )
      );
      setFeedback({ type: "success", message: `Business "${business.name}" has been reactivated.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reactivate business.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div className="flex-1 text-sm font-medium">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-inherit hover:opacity-70 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#EAE5D9] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store name or slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-[#EAE5D9] focus:outline-none focus:ring-1 focus:ring-bronze"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-charcoal-500 font-medium">Status:</span>
          {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? "bg-charcoal-900 text-white shadow-sm"
                  : "bg-zinc-100 text-charcoal-600 hover:bg-zinc-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Business Tenants Table */}
      <div className="rounded-2xl bg-white border border-[#EAE5D9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE5D9] bg-[#FAF8F5] text-charcoal-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-6">Business / Tenant</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">SaaS Plan</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Staff</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5D9]">
              {filteredBusinesses.map((biz) => {
                const sub = biz.subscription;
                const owner = biz.members?.[0]?.user;
                const maxProds = sub?.plan?.maxProducts ?? "∞";
                const maxStaff = sub?.plan?.maxStaff ?? "∞";

                return (
                  <tr key={biz.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-charcoal-900 text-sm">{biz.name}</div>
                      <div className="font-mono text-[11px] text-charcoal-500">/{biz.slug}</div>
                    </td>
                    <td className="py-4 px-4 text-charcoal-700">
                      <div>{owner?.name || "No Owner Assigned"}</div>
                      <div className="text-[11px] text-charcoal-500">{owner?.email || "—"}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold bg-bronze/10 text-bronze uppercase tracking-wider">
                        {sub?.plan?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-charcoal-700">
                      <span className="font-medium text-charcoal-900">{biz._count.products}</span>
                      <span className="text-charcoal-500"> / {maxProds}</span>
                    </td>
                    <td className="py-4 px-4 text-charcoal-700">
                      <span className="font-medium text-charcoal-900">{biz._count.members}</span>
                      <span className="text-charcoal-500"> / {maxStaff}</span>
                    </td>
                    <td className="py-4 px-4">
                      {biz.isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {biz.isSuspended ? (
                        <button
                          type="button"
                          onClick={() => handleReactivate(biz)}
                          disabled={isSubmitting}
                          data-testid="reactivate-btn"
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSuspendingBiz(biz)}
                          disabled={isSubmitting}
                          data-testid="suspend-btn"
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-all"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {suspendingBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="suspend-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-serif text-xl text-charcoal-900">Suspend Business</h3>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Suspending <span className="font-semibold">{suspendingBiz.name}</span> will immediately take down their public storefront and restrict store admin access.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal-700">
                Administrative Reason for Suspension:
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Terms of service violation, unverified merchant identity, non-payment..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#EAE5D9] text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuspendingBiz(null);
                  setSuspensionReason("");
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-charcoal-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={!suspensionReason.trim() || isSubmitting}
                data-testid="confirm-suspend-btn"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
