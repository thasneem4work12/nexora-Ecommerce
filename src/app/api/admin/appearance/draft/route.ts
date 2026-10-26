import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { saveDraftAppearance } from "@/services/theme.service";
import { saveDraftInputSchema } from "@/types/theme";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAdminApi("MANAGE_APPEARANCE");
    const body = await req.json();

    const validated = saveDraftInputSchema.parse(body);
    const result = await saveDraftAppearance(validated);

    return NextResponse.json({
      success: true,
      message: "Draft appearance saved successfully.",
      draft: result.draft,
      savedBy: user.email,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("POST /api/admin/appearance/draft error:", error);
    return NextResponse.json(
      { error: "Internal server error saving appearance draft" },
      { status: 500 }
    );
  }
}
