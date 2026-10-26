import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { restoreDefaultAppearance } from "@/services/theme.service";

export async function POST(req: NextRequest) {
  try {
    const { user, businessId } = await requireAdminApi(req, "MANAGE_APPEARANCE");

    const appearance = await restoreDefaultAppearance(businessId);

    return NextResponse.json({
      success: true,
      message: "Appearance restored to default Editorial Luxury theme.",
      appearance,
      restoredBy: user.email,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("POST /api/admin/appearance/reset error:", error);
    return NextResponse.json(
      { error: "Internal server error restoring default appearance" },
      { status: 500 }
    );
  }
}
