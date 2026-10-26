import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { themeIdSchema } from "@/types/theme";

export async function POST(req: NextRequest) {
  try {
    await requireAdminApi("VIEW_APPEARANCE");
    const body = await req.json();

    const validation = themeIdSchema.safeParse(body.themeId);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid theme ID for preview." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Preview cookie set for theme: ${validation.data}`,
      themeId: validation.data,
    });

    response.cookies.set("nexora_theme_preview", validation.data, {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("POST /api/admin/appearance/preview error:", error);
    return NextResponse.json(
      { error: "Internal server error setting preview" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Preview cookie cleared.",
    });

    response.cookies.set("nexora_theme_preview", "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("DELETE /api/admin/appearance/preview error:", error);
    return NextResponse.json(
      { error: "Internal server error clearing preview" },
      { status: 500 }
    );
  }
}
