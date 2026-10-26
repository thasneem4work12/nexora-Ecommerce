import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { getAllPlans, createPlan } from "@/services/saas/plan.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/plans
 * Returns all SaaS plans including legacy plans and subscriber counts.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function GET() {
  try {
    await requirePlatformSuperadmin();
    const plans = await getAllPlans();
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("[API Platform Plans GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load plans.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * POST /api/platform/plans
 * Creates a new SaaS subscription plan.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  try {
    await requirePlatformSuperadmin();
    const body = await request.json();

    const plan = await createPlan(body);

    return NextResponse.json({
      success: true,
      message: `Plan "${plan.name}" created successfully.`,
      plan,
    });
  } catch (error) {
    console.error("[API Platform Create Plan POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create plan.";
    const status = error instanceof AuthError ? error.status : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
