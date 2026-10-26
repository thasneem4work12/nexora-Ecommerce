import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSuperadmin, AuthError } from "@/lib/admin-auth";
import { reactivateBusiness } from "@/services/saas/platform-admin.service";

/**
 * POST /api/platform/businesses/[id]/reactivate
 * Reactivates a suspended business tenant and their SaaS subscription.
 * Restricted strictly to platform SUPERADMIN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requirePlatformSuperadmin();
    const { id } = await params;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const updatedBiz = await reactivateBusiness({
      businessId: id,
      superadminUserId: user.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Business "${updatedBiz.name}" reactivated successfully.`,
      business: updatedBiz,
    });
  } catch (error) {
    console.error("[API Platform Reactivate Business POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to reactivate business.";
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
