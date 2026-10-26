import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { discardDraftAppearance } from "@/services/theme.service";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(req, "MANAGE_APPEARANCE");

    const appearance = await discardDraftAppearance(businessId);

    return NextResponse.json({
      success: true,
      message: "Unpublished draft changes have been discarded.",
      appearance,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("POST /api/admin/appearance/discard error:", error);
    return NextResponse.json(
      { error: "Internal server error discarding draft" },
      { status: 500 }
    );
  }
}
