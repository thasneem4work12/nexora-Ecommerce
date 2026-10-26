import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { publishAppearance } from "@/services/theme.service";

export async function POST(req: NextRequest) {
  try {
    const { user, businessId } = await requireAdminApi(req, "MANAGE_APPEARANCE");

    const appearance = await publishAppearance(businessId);

    return NextResponse.json({
      success: true,
      message: "Theme appearance published to live storefront successfully.",
      appearance,
      publishedBy: user.email,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("POST /api/admin/appearance/publish error:", error);
    return NextResponse.json(
      { error: "Internal server error publishing appearance" },
      { status: 500 }
    );
  }
}
