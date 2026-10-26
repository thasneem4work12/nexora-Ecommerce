import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { reviewOrderCancellation } from "@/services/cancellation.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, businessId } = await requireAdminApi(request, "MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { decision, adminNotes } = body;
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json(
        { success: false, error: 'Decision must be either "APPROVED" or "REJECTED".' },
        { status: 400 }
      );
    }

    const result = await reviewOrderCancellation({
      orderId: id,
      adminUserId: user.id,
      decision,
      adminNotes,
      businessId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to review cancellation",
      },
      { status: 400 }
    );
  }
}
