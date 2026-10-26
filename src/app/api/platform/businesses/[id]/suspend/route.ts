import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { suspendBusiness } from "@/services/saas/platform-admin.service";

/**
 * POST /api/platform/businesses/[id]/suspend
 * Suspends a business tenant and their SaaS subscription.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requirePlatformSuperadmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { reason = "Administrative suspension by platform superadmin" } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const updatedBiz = await suspendBusiness({
      businessId: id,
      reason,
      superadminUserId: user.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Business "${updatedBiz.name}" suspended successfully.`,
      business: updatedBiz,
    });
  } catch (error) {
    console.error("[API Platform Suspend Business POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to suspend business.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
