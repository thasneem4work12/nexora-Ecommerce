import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { reviewReturnRequest } from "@/services/return.service";
import type { ReturnStatus, RefundStatus } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminApi("MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      adminNotes,
      resolutionNotes,
      refundStatus,
      refundAmountInCents,
      restockInventory = true,
    } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Return status is required." },
        { status: 400 }
      );
    }

    const updated = await reviewReturnRequest({
      returnRequestId: id,
      adminUserId: admin.user.id,
      status: status as ReturnStatus,
      adminNotes,
      resolutionNotes,
      refundStatus: refundStatus as RefundStatus,
      refundAmountInCents: typeof refundAmountInCents === "number" ? refundAmountInCents : undefined,
      restockInventory: Boolean(restockInventory),
    });

    return NextResponse.json({
      success: true,
      message: `Return request ${updated.returnNumber} status updated to ${updated.status}.`,
      returnRequest: updated,
    });
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
        error: error instanceof Error ? error.message : "Failed to review return request",
      },
      { status: 400 }
    );
  }
}
