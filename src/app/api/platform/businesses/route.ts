import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { getPlatformBusinessesList } from "@/services/saas/platform-admin.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/businesses
 * Returns paginated businesses with SaaS plans and usage metrics.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformSuperadmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const status = searchParams.get("status") || undefined;
    const planId = searchParams.get("planId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getPlatformBusinessesList({
      query,
      status,
      planId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[API Platform Businesses GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load businesses.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
