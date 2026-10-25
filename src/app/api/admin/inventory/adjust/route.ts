import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { adjustStock } from "@/services/inventory.service";

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminApi("ADJUST_INVENTORY");
    const body = await request.json();

    const { variantId, delta, type, reason, reference } = body;

    if (!variantId || typeof delta !== "number" || delta === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "variantId and non-zero numeric delta are required.",
        },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "An audit reason is required for every stock adjustment.",
        },
        { status: 400 }
      );
    }

    const result = await adjustStock({
      variantId,
      delta,
      type: type || "MANUAL_CORRECTION",
      reason,
      reference,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Stock successfully adjusted by ${delta > 0 ? `+${delta}` : delta}.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to adjust stock",
      },
      { status: 400 }
    );
  }
}
