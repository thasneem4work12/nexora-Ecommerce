import React from "react";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getBusinessUsageSummary } from "@/services/saas/usage.service";
import { getBusinessInvoices } from "@/services/saas/invoice.service";
import { getPublicPlans } from "@/services/saas/plan.service";
import {
  BillingDashboardClient,
  type SaaSInvoiceItem,
  type SaaSPlanItem,
} from "./BillingDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const adminContext = await requireAdminPageSession("VIEW_BILLING");
  const { businessId, business, businessRole, isSuperAdmin } = adminContext;

  const [usageSummary, invoices, availablePlans] = await Promise.all([
    getBusinessUsageSummary(businessId),
    getBusinessInvoices(businessId),
    getPublicPlans(),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl text-charcoal-900 tracking-tight">Subscription & Billing</h1>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EFE6] text-charcoal-700 uppercase tracking-wider">
            {business.name}
          </span>
        </div>
        <p className="text-sm text-charcoal-600 mt-1">
          Manage your NEXORA SaaS subscription plan, monitor catalog capacity, and review billing receipts.
        </p>
      </div>

      <BillingDashboardClient
        businessId={businessId}
        businessName={business.name}
        canManageBilling={businessRole === "OWNER" || isSuperAdmin}
        initialUsage={usageSummary}
        initialInvoices={invoices as unknown as SaaSInvoiceItem[]}
        availablePlans={availablePlans as unknown as SaaSPlanItem[]}
      />
    </div>
  );
}
