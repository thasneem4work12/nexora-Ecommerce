import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { cancelSubscription } from "@/services/saas/subscription.service";

/**
 * POST /api/admin/billing/cancel
 * Cancels the business's subscription (at period end by default, or immediately).
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_BILLING");
    const { businessId, user } = adminContext;

    const body = await request.json().catch(() => ({}));
    const { cancelAtPeriodEnd = true, reason } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const updatedSub = await cancelSubscription({
      businessId,
      cancelAtPeriodEnd,
      reason,
      userId: user.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: cancelAtPeriodEnd
        ? "Subscription set to cancel at the end of the current billing cycle."
        : "Subscription cancelled immediately.",
      subscription: updatedSub,
    });
  } catch (error) {
    console.error("[API Admin Cancel Billing POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel subscription.";
    const status = error instanceof AuthError ? error.status : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
