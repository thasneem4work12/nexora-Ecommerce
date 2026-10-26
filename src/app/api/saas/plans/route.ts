import { NextResponse } from "next/server";
import { getPublicPlans } from "@/services/saas/plan.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/saas/plans
 * Public endpoint returning available active SaaS plans and pricing.
 */
export async function GET() {
  try {
    const plans = await getPublicPlans();
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("[API SaaS Plans GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve subscription plans." },
      { status: 500 }
    );
  }
}
