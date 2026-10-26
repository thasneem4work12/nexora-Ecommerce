"use client";

import React, { useState } from "react";
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
} from "lucide-react";

export interface PlatformPlanItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  maxProducts: number;
  maxStaff: number;
  maxStorageMb: number;
  allowCustomThemes: boolean;
  allowAdvancedAnalytics: boolean;
  allowPrioritySupport: boolean;
  trialDays: number;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  prices: {
    id: string;
    interval: "MONTHLY" | "YEARLY";
    amountInCents: number;
    currency: string;
    version: number;
    isActive: boolean;
  }[];
  _count?: {
    subscriptions: number;
  };
}

interface PlatformPlansClientProps {
  initialPlans: PlatformPlanItem[];
}

export function PlatformPlansClient({ initialPlans }: PlatformPlansClientProps) {
  const [plans, setPlans] = useState<PlatformPlanItem[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<PlatformPlanItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxProducts, setEditMaxProducts] = useState(50);
  const [editMaxStaff, setEditMaxStaff] = useState(2);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(29);
  const [editYearlyPrice, setEditYearlyPrice] = useState(290);

  // Create form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMaxProducts, setNewMaxProducts] = useState(100);
  const [newMaxStaff, setNewMaxStaff] = useState(5);
  const [newMonthlyPrice, setNewMonthlyPrice] = useState(49);
  const [newYearlyPrice, setNewYearlyPrice] = useState(490);

  const startEdit = (plan: PlatformPlanItem) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDescription(plan.description || "");
    setEditMaxProducts(plan.maxProducts);
    setEditMaxStaff(plan.maxStaff);

    const monthly = plan.prices.find((p) => p.interval === "MONTHLY");
    const yearly = plan.prices.find((p) => p.interval === "YEARLY");
    setEditMonthlyPrice(monthly ? monthly.amountInCents / 100 : 0);
    setEditYearlyPrice(yearly ? yearly.amountInCents / 100 : 0);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/platform/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          maxProducts: editMaxProducts,
          maxStaff: editMaxStaff,
          monthlyPriceInCents: Math.round(editMonthlyPrice * 100),
          yearlyPriceInCents: Math.round(editYearlyPrice * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update plan.");
      }

      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlan.id ? { ...p, ...data.plan } : p))
      );
      setFeedback({ type: "success", message: `Plan "${editName}" updated successfully.` });
      setEditingPlan(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update plan.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlan = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/platform/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toLowerCase(),
          name: newName.trim(),
          description: newDescription.trim(),
          maxProducts: newMaxProducts,
          maxStaff: newMaxStaff,
          monthlyPriceInCents: Math.round(newMonthlyPrice * 100),
          yearlyPriceInCents: Math.round(newYearlyPrice * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create plan.");
      }

      setPlans((prev) => [...prev, data.plan]);
      setFeedback({ type: "success", message: `New plan "${newName}" created successfully.` });
      setShowCreateModal(false);
      // Reset form
      setNewCode("");
      setNewName("");
      setNewDescription("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create plan.";
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

      {/* Top Action Bar */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-charcoal-500">
          Showing {plans.length} configured platform plan tiers.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-charcoal-900 hover:bg-black text-white shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Plan</span>
        </button>
      </div>

      {/* Plans Table */}
      <div className="rounded-2xl bg-white border border-[#EAE5D9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE5D9] bg-[#FAF8F5] text-charcoal-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-6">Plan Name</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Monthly</th>
                <th className="py-3.5 px-4">Yearly</th>
                <th className="py-3.5 px-4">Products Limit</th>
                <th className="py-3.5 px-4">Staff Limit</th>
                <th className="py-3.5 px-4">Subscribers</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5D9]">
              {plans.map((p) => {
                const monthly = p.prices?.find((pr) => pr.interval === "MONTHLY");
                const yearly = p.prices?.find((pr) => pr.interval === "YEARLY");

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-charcoal-900 text-sm">{p.name}</div>
                      <div className="text-[11px] text-charcoal-500 truncate max-w-xs">{p.description}</div>
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-charcoal-700">
                      {p.code}
                    </td>
                    <td className="py-4 px-4 font-semibold text-charcoal-900">
                      ${monthly ? (monthly.amountInCents / 100).toFixed(0) : 0}/mo
                    </td>
                    <td className="py-4 px-4 font-semibold text-charcoal-900">
                      ${yearly ? (yearly.amountInCents / 100).toFixed(0) : 0}/yr
                    </td>
                    <td className="py-4 px-4 text-charcoal-700">
                      {p.maxProducts.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-charcoal-700">
                      {p.maxStaff.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded font-mono font-bold bg-[#F3EFE6] text-charcoal-800">
                        {p._count?.subscriptions || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => startEdit(p)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#EAE5D9] text-charcoal-800 hover:bg-zinc-100 transition-all inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3 text-bronze" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5D9] pb-3">
              <h3 className="font-serif text-xl text-charcoal-900">Edit Plan: {editingPlan.name}</h3>
              <button onClick={() => setEditingPlan(null)} className="p-1 text-charcoal-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-charcoal-700">Plan Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal-700">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-charcoal-700">Max Products</label>
                  <input
                    type="number"
                    value={editMaxProducts}
                    onChange={(e) => setEditMaxProducts(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-charcoal-700">Max Staff</label>
                  <input
                    type="number"
                    value={editMaxStaff}
                    onChange={(e) => setEditMaxStaff(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EAE5D9]">
                <div>
                  <label className="font-semibold text-charcoal-700">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={editMonthlyPrice}
                    onChange={(e) => setEditMonthlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-charcoal-700">Yearly Price ($)</label>
                  <input
                    type="number"
                    value={editYearlyPrice}
                    onChange={(e) => setEditYearlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#EAE5D9]">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-lg text-xs text-charcoal-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-black"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5D9] pb-3">
              <h3 className="font-serif text-xl text-charcoal-900">Create New SaaS Plan</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-charcoal-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-charcoal-700">Plan Code (Unique slug)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. enterprise"
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-charcoal-700">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Enterprise Tier"
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-charcoal-700">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Plan features and target boutique size..."
                  className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-charcoal-700">Max Products</label>
                  <input
                    type="number"
                    value={newMaxProducts}
                    onChange={(e) => setNewMaxProducts(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-charcoal-700">Max Staff</label>
                  <input
                    type="number"
                    value={newMaxStaff}
                    onChange={(e) => setNewMaxStaff(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EAE5D9]">
                <div>
                  <label className="font-semibold text-charcoal-700">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={newMonthlyPrice}
                    onChange={(e) => setNewMonthlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-charcoal-700">Yearly Price ($)</label>
                  <input
                    type="number"
                    value={newYearlyPrice}
                    onChange={(e) => setNewYearlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-[#EAE5D9] mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#EAE5D9]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-charcoal-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={!newCode.trim() || !newName.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-black disabled:opacity-50"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
