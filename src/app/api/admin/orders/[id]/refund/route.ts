import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { recordManualRefund } from "@/services/return.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, businessId } = await requireAdminApi(request, "MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { refundAmountInCents, reconciliationReference, notes } = body;

    if (!refundAmountInCents || typeof refundAmountInCents !== "number" || refundAmountInCents <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid refundAmountInCents (> 0) is required." },
        { status: 400 }
      );
    }

    if (!reconciliationReference || !reconciliationReference.trim()) {
      return NextResponse.json(
        { success: false, error: "Reconciliation reference (bank wire / transaction ID) is required." },
        { status: 400 }
      );
    }

    const order = await recordManualRefund({
      orderId: id,
      adminUserId: user.id,
      refundAmountInCents,
      reconciliationReference: reconciliationReference.trim(),
      notes,
      businessId,
    });

    return NextResponse.json({
      success: true,
      message: "Manual refund reconciled and recorded in audit ledger.",
      order,
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
        error: error instanceof Error ? error.message : "Failed to reconcile refund",
      },
      { status: 400 }
    );
  }
}
