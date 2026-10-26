import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { resumeSubscription } from "@/services/saas/subscription.service";

/**
 * POST /api/admin/billing/resume
 * Resumes a subscription that was scheduled to cancel at period end.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_BILLING");
    const { businessId, user } = adminContext;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const updatedSub = await resumeSubscription(businessId, user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: "Subscription successfully resumed. Auto-renewal is active.",
      subscription: updatedSub,
    });
  } catch (error) {
    console.error("[API Admin Resume Billing POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to resume subscription.";
    const status = error instanceof AuthError ? error.status : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
