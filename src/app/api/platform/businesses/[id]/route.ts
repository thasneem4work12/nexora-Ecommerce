import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { getPlatformBusinessDetail } from "@/services/saas/platform-admin.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/businesses/[id]
 * Returns full detail for a business tenant.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformSuperadmin();
    const { id } = await params;

    const business = await getPlatformBusinessDetail(id);
    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error) {
    console.error("[API Platform Business Detail GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load business details.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
