import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { getPlanById, updatePlan, updatePlanPricing } from "@/services/saas/plan.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/plans/[id]
 * Retrieves a plan by ID with versioned pricing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformSuperadmin();
    const { id } = await params;

    const plan = await getPlanById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("[API Platform Plan GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load plan.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * PATCH /api/platform/plans/[id]
 * Updates a plan's configuration, features, or adds a new pricing version.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformSuperadmin();
    const { id } = await params;
    const body = await request.json();

    const { monthlyPriceInCents, yearlyPriceInCents, ...planFields } = body;

    const updatedPlan = await updatePlan(id, planFields);

    if (typeof monthlyPriceInCents === "number") {
      await updatePlanPricing(id, "MONTHLY", monthlyPriceInCents);
    }

    if (typeof yearlyPriceInCents === "number") {
      await updatePlanPricing(id, "YEARLY", yearlyPriceInCents);
    }

    const refreshed = await getPlanById(id);

    return NextResponse.json({
      success: true,
      message: `Plan "${updatedPlan.name}" updated successfully.`,
      plan: refreshed,
    });
  } catch (error) {
    console.error("[API Platform Plan PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update plan.";
    const status = error instanceof AuthError ? error.status : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
