import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getBusinessUsageSummary } from "@/services/saas/usage.service";
import { getBusinessInvoices } from "@/services/saas/invoice.service";
import { getPublicPlans } from "@/services/saas/plan.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing
 * Retrieves the current business's SaaS subscription, usage summary, and recent invoices.
 */
export async function GET(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "VIEW_BILLING");
    const { businessId, businessRole, isSuperAdmin } = adminContext;

    const [usageSummary, invoices, availablePlans] = await Promise.all([
      getBusinessUsageSummary(businessId),
      getBusinessInvoices(businessId),
      getPublicPlans(),
    ]);

    return NextResponse.json({
      success: true,
      businessId,
      canManageBilling: businessRole === "OWNER" || isSuperAdmin,
      usage: usageSummary,
      invoices,
      availablePlans,
    });
  } catch (error) {
    console.error("[API Admin Billing GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load billing information.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
