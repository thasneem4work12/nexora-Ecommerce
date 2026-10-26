"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Layers,
  Users,
  HardDrive,
  FileText,
  Sparkles,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import type { BusinessUsageSummary } from "@/services/saas/usage.service";

export interface SaaSInvoiceItem {
  id: string;
  invoiceNumber: string;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: Date | string;
  paidAt?: Date | string | null;
  billingPeriodStartsAt: Date | string;
  billingPeriodEndsAt: Date | string;
  lines?: {
    id: string;
    description: string;
    totalAmountInCents: number;
  }[];
}

export interface SaaSPlanItem {
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
  prices: {
    id: string;
    interval: "MONTHLY" | "YEARLY";
    amountInCents: number;
    currency: string;
  }[];
}

interface BillingDashboardClientProps {
  businessId: string;
  businessName: string;
  canManageBilling: boolean;
  initialUsage: BusinessUsageSummary;
  initialInvoices: SaaSInvoiceItem[];
  availablePlans: SaaSPlanItem[];
}

export function BillingDashboardClient({
  businessName,
  canManageBilling,
  initialUsage,
  initialInvoices,
  availablePlans,
}: BillingDashboardClientProps) {
  const [usage, setUsage] = useState<BusinessUsageSummary>(initialUsage);
  const [invoices, setInvoices] = useState<SaaSInvoiceItem[]>(initialInvoices);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSInvoiceItem | null>(null);
  const [planModalInterval, setPlanModalInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const sub = usage.subscription;
  const plan = usage.plan;

  const refreshData = async () => {
    try {
      const res = await fetch("/api/admin/billing");
      const data = await res.json();
      if (data.success) {
        setUsage(data.usage);
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Failed to refresh billing data:", err);
    }
  };

  const handlePlanChange = async (targetPlanId: string, targetPriceId: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanId, targetPriceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to switch plan.");
      }
      setFeedback({ type: "success", message: data.message });
      setShowPlanModal(false);
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch plan.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async (cancelAtPeriodEnd: boolean) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd, reason: "Customer requested cancellation via admin" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel subscription.");
      }
      setFeedback({ type: "success", message: data.message });
      setShowCancelModal(false);
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel subscription.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/billing/resume", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resume subscription.");
      }
      setFeedback({ type: "success", message: data.message });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resume subscription.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePayment = async (action: "renew" | "fail" | "pay_invoice", invoiceId?: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/billing/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, invoiceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Simulation failed.");
      }
      setFeedback({ type: "success", message: data.message });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to simulate payment.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
      case "TRIALING":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5" /> Trial Period</span>;
      case "PAST_DUE":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> Past Due</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3.5 h-3.5" /> Suspended</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-300">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">{status || "Unknown"}</span>;
    }
  };

  return (
    <div className="space-y-8">
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
          <button
            onClick={() => setFeedback(null)}
            className="text-inherit hover:opacity-70 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription Status Warning */}
      {sub?.cancelAtPeriodEnd && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div className="text-sm">
              <span className="font-semibold">Subscription Cancellation Scheduled:</span> Your plan will remain active until the end of your billing cycle on{" "}
              {new Date(sub.currentPeriodEndsAt).toLocaleDateString()}.
            </div>
          </div>
          {canManageBilling && (
            <button
              onClick={handleResumeSubscription}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              Resume Plan
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Plan Overview & Usage Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Current Plan Card */}
        <div className="lg:col-span-1 rounded-2xl bg-white border border-[#EAE5D9] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-luxury text-charcoal-500 font-semibold">Active Plan</span>
              {getStatusBadge(sub?.status)}
            </div>

            <h2 className="font-serif text-3xl text-charcoal-900 tracking-tight mb-2">
              {plan?.name || "No Plan"}
            </h2>

            <p className="text-xs text-charcoal-600 mb-6">
              Current Cycle Ends:{" "}
              <span className="font-medium text-charcoal-900">
                {sub ? new Date(sub.currentPeriodEndsAt).toLocaleDateString() : "N/A"}
              </span>
            </p>

            <div className="space-y-3 pt-4 border-t border-[#EAE5D9]">
              <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 mb-2">
                Included Features
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal-700">
                <Check className={`w-4 h-4 ${usage.features.allowCustomThemes ? "text-bronze" : "text-zinc-300"}`} />
                <span>Custom Storefront Themes: {usage.features.allowCustomThemes ? "Unlocked" : "Locked"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal-700">
                <Check className={`w-4 h-4 ${usage.features.allowAdvancedAnalytics ? "text-bronze" : "text-zinc-300"}`} />
                <span>Advanced Analytics: {usage.features.allowAdvancedAnalytics ? "Unlocked" : "Locked"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal-700">
                <Check className={`w-4 h-4 ${usage.features.allowPrioritySupport ? "text-bronze" : "text-zinc-300"}`} />
                <span>Priority Support: {usage.features.allowPrioritySupport ? "Active" : "Standard"}</span>
              </div>
            </div>
          </div>

          {canManageBilling && (
            <div className="pt-6 mt-6 border-t border-[#EAE5D9] flex flex-col gap-2.5">
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-charcoal-900 hover:bg-black text-white text-center transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Change Plan</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {!sub?.cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2 text-xs font-semibold text-charcoal-500 hover:text-red-600 transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Capacity & Usage Meters */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#EAE5D9] p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-serif text-xl text-charcoal-900 tracking-tight">Capacity & Usage Meters</h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Real-time resource utilization against your active subscription allowances.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Products Meter */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE5D9]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                  <Layers className="w-4 h-4 text-bronze" />
                  <span>Products</span>
                </div>
                <span className="text-xs font-bold text-charcoal-900">
                  {usage.metrics.products.percentage}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    usage.metrics.products.percentage >= 100
                      ? "bg-red-500"
                      : usage.metrics.products.percentage >= 80
                      ? "bg-amber-500"
                      : "bg-bronze"
                  }`}
                  style={{ width: `${Math.min(100, usage.metrics.products.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-charcoal-500">
                <span>{usage.metrics.products.current} active</span>
                <span>Max {usage.metrics.products.limit}</span>
              </div>
            </div>

            {/* Staff Meter */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE5D9]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                  <Users className="w-4 h-4 text-bronze" />
                  <span>Team Staff</span>
                </div>
                <span className="text-xs font-bold text-charcoal-900">
                  {usage.metrics.staff.percentage}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    usage.metrics.staff.percentage >= 100
                      ? "bg-red-500"
                      : usage.metrics.staff.percentage >= 80
                      ? "bg-amber-500"
                      : "bg-bronze"
                  }`}
                  style={{ width: `${Math.min(100, usage.metrics.staff.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-charcoal-500">
                <span>{usage.metrics.staff.current} members</span>
                <span>Max {usage.metrics.staff.limit}</span>
              </div>
            </div>

            {/* Storage Meter */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE5D9]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                  <HardDrive className="w-4 h-4 text-bronze" />
                  <span>Media Storage</span>
                </div>
                <span className="text-xs font-bold text-charcoal-900">
                  {usage.metrics.storageMb.percentage}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    usage.metrics.storageMb.percentage >= 100
                      ? "bg-red-500"
                      : usage.metrics.storageMb.percentage >= 80
                      ? "bg-amber-500"
                      : "bg-bronze"
                  }`}
                  style={{ width: `${Math.min(100, usage.metrics.storageMb.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-charcoal-500">
                <span>{usage.metrics.storageMb.current} MB</span>
                <span>Max {usage.metrics.storageMb.limit} MB</span>
              </div>
            </div>
          </div>

          {/* Sandbox Development Simulator Controls */}
          <div className="p-4 rounded-xl border border-dashed border-[#DDD7CD] bg-[#FDFBF7]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider uppercase text-charcoal-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-bronze" />
                Developer Sandbox Billing Controls
              </span>
              <span className="text-[11px] text-charcoal-500">Phase 8 Verification Suite</span>
            </div>
            <p className="text-xs text-charcoal-500 mb-3">
              Trigger simulated renewals and billing state transitions without external gateway calls.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSimulatePayment("renew")}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-zinc-50 border border-zinc-300 text-charcoal-800 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3 text-bronze" />
                Simulate Renewal Cycle ($ Paid)
              </button>
              <button
                onClick={() => handleSimulatePayment("fail")}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Simulate Payment Failure (PAST_DUE)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Invoices & Receipts Table */}
      <div className="rounded-2xl bg-white border border-[#EAE5D9] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-charcoal-900 tracking-tight">Billing Invoices & Receipts</h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Historical accounting receipts for SaaS platform subscriptions and renewals.
            </p>
          </div>
          <button
            onClick={refreshData}
            className="p-2 rounded-lg text-charcoal-600 hover:text-charcoal-900 hover:bg-zinc-100 transition-colors"
            title="Refresh Invoices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-10 text-charcoal-500 text-xs">
            No SaaS invoices issued yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAE5D9] text-charcoal-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5D9]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-charcoal-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-charcoal-600">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-charcoal-600">
                      {new Date(inv.billingPeriodStartsAt).toLocaleDateString()} –{" "}
                      {new Date(inv.billingPeriodEndsAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal-900">
                      ${(inv.totalInCents / 100).toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-3 px-4">
                      {inv.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : inv.status === "OPEN" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
                          Open
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600">
                          {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FAF8F5] border border-[#EAE5D9] hover:bg-zinc-100 text-charcoal-700 text-[11px] font-medium transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-bronze" />
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Switcher Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE5D9] pb-4">
              <div>
                <h3 className="font-serif text-2xl text-charcoal-900">Switch Subscription Plan</h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Choose a plan that fits your growing business capacity.
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 rounded-lg text-charcoal-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interval Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 rounded-full bg-[#EFECE6] border border-[#DDD7CD]">
                <button
                  onClick={() => setPlanModalInterval("MONTHLY")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                    planModalInterval === "MONTHLY" ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-600"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setPlanModalInterval("YEARLY")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                    planModalInterval === "YEARLY" ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-600"
                  }`}
                >
                  Yearly (Save ~16%)
                </button>
              </div>
            </div>

            {/* Plan Cards in Modal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((p) => {
                const price = p.prices.find((pr) => pr.interval === planModalInterval) || p.prices[0];
                const isCurrent = plan?.id === p.id;
                const exceedsProducts = usage.metrics.products.current > p.maxProducts;
                const exceedsStaff = usage.metrics.staff.current > p.maxStaff;
                const isDowngradeBlocked = exceedsProducts || exceedsStaff;

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl p-5 border flex flex-col justify-between ${
                      isCurrent
                        ? "border-bronze bg-bronze/5 ring-1 ring-bronze"
                        : "border-[#EAE5D9] bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-serif text-lg font-bold">{p.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bronze text-white uppercase">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mb-4">
                        <span className="font-serif text-3xl font-bold">
                          ${((price?.amountInCents || 0) / 100).toFixed(0)}
                        </span>
                        <span className="text-xs text-charcoal-500">
                          /{planModalInterval === "YEARLY" ? "yr" : "mo"}
                        </span>
                      </div>

                      <ul className="space-y-2 text-xs text-charcoal-600 mb-6">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-bronze" />
                          <span>Max {p.maxProducts} active products</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-bronze" />
                          <span>Max {p.maxStaff} staff members</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-bronze" />
                          <span>{p.maxStorageMb} MB storage</span>
                        </li>
                      </ul>

                      {isDowngradeBlocked && !isCurrent && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] mb-4">
                          {exceedsProducts
                            ? `Cannot switch: Business has ${usage.metrics.products.current} products (limit ${p.maxProducts}).`
                            : `Cannot switch: Business has ${usage.metrics.staff.current} staff (limit ${p.maxStaff}).`}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handlePlanChange(p.id, price.id)}
                      disabled={isCurrent || isDowngradeBlocked || isSubmitting}
                      className={`w-full py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        isCurrent
                          ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                          : isDowngradeBlocked
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-charcoal-900 hover:bg-black text-white"
                      }`}
                    >
                      {isCurrent ? "Current Plan" : isDowngradeBlocked ? "Limit Exceeded" : `Select ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl text-charcoal-900">Cancel Subscription?</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Are you sure you want to cancel your NEXORA subscription? Your storefront will remain fully active until the end of your billing cycle on{" "}
              <span className="font-semibold">{sub ? new Date(sub.currentPeriodEndsAt).toLocaleDateString() : "period end"}</span>.
            </p>
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-charcoal-700 hover:bg-zinc-100"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-[#EAE5D9] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-bronze">
                  Official SaaS Receipt
                </span>
                <h3 className="font-serif text-2xl text-charcoal-900 mt-1">
                  {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-charcoal-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-charcoal-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-charcoal-500 font-medium">Billed To:</span>
                  <div className="font-semibold text-charcoal-900">{businessName}</div>
                </div>
                <div>
                  <span className="text-charcoal-500 font-medium">Payment Date:</span>
                  <div className="font-semibold text-charcoal-900">
                    {selectedInvoice.paidAt
                      ? new Date(selectedInvoice.paidAt).toLocaleDateString()
                      : "Pending"}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-charcoal-500 font-medium">Coverage Period:</span>
                <div className="font-semibold text-charcoal-900">
                  {new Date(selectedInvoice.billingPeriodStartsAt).toLocaleDateString()} to{" "}
                  {new Date(selectedInvoice.billingPeriodEndsAt).toLocaleDateString()}
                </div>
              </div>

              <div className="border-t border-[#EAE5D9] pt-4 space-y-2">
                <div className="font-semibold text-charcoal-900">Line Items</div>
                {selectedInvoice.lines?.map((line) => (
                  <div key={line.id} className="flex justify-between">
                    <span>{line.description}</span>
                    <span className="font-mono">${(line.totalAmountInCents / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#EAE5D9] pt-4 flex justify-between font-bold text-sm text-charcoal-900">
                <span>Total Amount Paid</span>
                <span className="font-mono">
                  ${(selectedInvoice.totalInCents / 100).toFixed(2)} {selectedInvoice.currency}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-black inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
