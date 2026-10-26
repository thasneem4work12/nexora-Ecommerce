import { NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { publishAppearance } from "@/services/theme.service";

export async function POST() {
  try {
    const { user } = await requireAdminApi("MANAGE_APPEARANCE");

    const appearance = await publishAppearance();

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
