import { NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { getPlatformOverviewMetrics } from "@/services/saas/platform-admin.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/metrics
 * Returns platform-level SaaS KPIs, MRR, ARR, and subscription breakdowns.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function GET() {
  try {
    await requirePlatformSuperadmin();
    const metrics = await getPlatformOverviewMetrics();
    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("[API Platform Metrics GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load platform metrics.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
