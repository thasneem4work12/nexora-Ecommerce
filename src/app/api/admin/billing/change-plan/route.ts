import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { changeBusinessPlan } from "@/services/saas/subscription.service";

/**
 * POST /api/admin/billing/change-plan
 * Upgrades or downgrades the business's subscription plan.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_BILLING");
    const { businessId, user } = adminContext;

    const body = await request.json();
    const { targetPlanId, targetPriceId } = body;

    if (!targetPlanId || !targetPriceId) {
      return NextResponse.json(
        { success: false, error: "targetPlanId and targetPriceId are required." },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const updatedSub = await changeBusinessPlan({
      businessId,
      targetPlanId,
      targetPriceId,
      userId: user.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${updatedSub.plan.name} plan.`,
      subscription: updatedSub,
    });
  } catch (error) {
    console.error("[API Admin Change Plan POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to change subscription plan.";
    const status = error instanceof AuthError ? error.status : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
