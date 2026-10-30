import React from "react";
import Link from "next/link";
import { getPlatformOverviewMetrics } from "@/services/saas/platform-admin.service";
import { GuidedTourTrigger } from "@/components/guidance/GuidedTourTrigger";
import {
  DollarSign,
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  Sliders,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PlatformInvoiceRow {
  id: string;
  invoiceNumber: string;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: Date | string;
  business: { id: string; name: string; slug: string };
  subscription?: { plan?: { name: string } | null } | null;
}

export default async function PlatformOverviewPage() {
  const metrics = await getPlatformOverviewMetrics();
  const recentInvoices = metrics.recentInvoices as PlatformInvoiceRow[];

  return (
    <div className="space-y-8">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Superadmin Infrastructure
          </span>
          <h1 className="font-serif text-3xl text-charcoal-900 tracking-tight mt-1">Platform Control Center</h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Global SaaS subscription revenue, multi-tenant fleet health, and system-wide plan distribution.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <GuidedTourTrigger tourId="platform-superadmin" label="Tour Platform" />
          <Link
            href="/platform/businesses"
            data-tour="platform-tenants-btn"
            className="px-4 py-2 rounded-btn text-xs font-semibold bg-canvas-surface border border-border-default text-charcoal-800 hover:bg-canvas-secondary shadow-xs flex items-center gap-2"
          >
            <Building2 className="w-3.5 h-3.5 text-bronze" />
            <span>Manage Tenants</span>
          </Link>
          <Link
            href="/platform/plans"
            data-tour="platform-plans-btn"
            className="px-4 py-2 rounded-btn text-xs font-semibold bg-charcoal-900 hover:bg-black text-white shadow-xs flex items-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Plans</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR Card */}
        <div data-tour="platform-mrr" className="p-6 rounded-card bg-canvas-surface border border-border-default shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-charcoal-900">
            ${(metrics.mrrInCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1 flex items-center gap-1 font-light">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>ARR Run Rate: ${(metrics.arrInCents / 100).toLocaleString("en-US")}</span>
          </div>
        </div>

        {/* Total Invoiced Revenue */}
        <div className="p-6 rounded-card bg-canvas-surface border border-border-default shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Paid SaaS Revenue</span>
            <DollarSign className="w-4 h-4 text-bronze" />
          </div>
          <div className="font-serif text-3xl font-bold text-charcoal-900">
            ${(metrics.totalRevenueInCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            Lifetime collected SaaS subscription payments
          </div>
        </div>

        {/* Active Businesses */}
        <div className="p-6 rounded-card bg-canvas-surface border border-border-default shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Active Businesses</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-charcoal-900">
            {metrics.activeBusinesses}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            Out of {metrics.totalBusinesses} total registered tenants
          </div>
        </div>

        {/* Suspended Fleet */}
        <div className="p-6 rounded-card bg-canvas-surface border border-border-default shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Suspended Tenants</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="font-serif text-3xl font-bold text-charcoal-900">
            {metrics.suspendedBusinesses}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            {metrics.suspendedBusinesses === 0 ? "Fleet operating smoothly" : "Requires administrative review"}
          </div>
        </div>
      </div>

      {/* Subscription Breakdown & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-[#EAE5D9] shadow-sm space-y-4">
          <h2 className="font-serif text-lg text-charcoal-900 font-semibold">Subscriptions by Lifecycle Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[11px] font-semibold uppercase text-emerald-700">Active</span>
              <div className="text-2xl font-serif font-bold text-emerald-950 mt-1">
                {metrics.subscriptionsByStatus["ACTIVE"] || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="text-[11px] font-semibold uppercase text-blue-700">Trialing</span>
              <div className="text-2xl font-serif font-bold text-blue-950 mt-1">
                {metrics.subscriptionsByStatus["TRIALING"] || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="text-[11px] font-semibold uppercase text-amber-700">Past Due</span>
              <div className="text-2xl font-serif font-bold text-amber-950 mt-1">
                {metrics.subscriptionsByStatus["PAST_DUE"] || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-100">
              <span className="text-[11px] font-semibold uppercase text-red-700">Suspended</span>
              <div className="text-2xl font-serif font-bold text-red-950 mt-1">
                {metrics.subscriptionsByStatus["SUSPENDED"] || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] font-semibold uppercase text-zinc-600">Cancelled</span>
              <div className="text-2xl font-serif font-bold text-zinc-900 mt-1">
                {metrics.subscriptionsByStatus["CANCELLED"] || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-[#EAE5D9] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-charcoal-900 font-semibold">Subscriber Distribution by Plan</h2>
            <Link href="/platform/plans" className="text-xs text-bronze hover:underline flex items-center gap-1">
              <span>View all plans</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {metrics.subscriptionsByPlan.map((p) => {
              const totalSubs = Object.values(metrics.subscriptionsByStatus).reduce((a, b) => a + b, 0) || 1;
              const percentage = Math.round((p.count / totalSubs) * 100);

              return (
                <div key={p.planId} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-charcoal-700">
                    <span>{p.planName}</span>
                    <span>{p.count} tenants ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-bronze transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent SaaS Invoices Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#EAE5D9] shadow-sm space-y-4">
        <h2 className="font-serif text-lg text-charcoal-900 font-semibold">Recent SaaS Invoices</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE5D9] text-charcoal-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5D9]">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-charcoal-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-charcoal-800">
                    {inv.business.name}
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">
                    {inv.subscription?.plan?.name || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-charcoal-900">
                    ${(inv.totalInCents / 100).toFixed(2)} {inv.currency}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        inv.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : inv.status === "OPEN"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
