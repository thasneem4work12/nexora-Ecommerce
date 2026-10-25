import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createReturnRequest } from "@/services/return.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to request a return." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderItemId, requestedQuantity = 1, reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Return reason is required." },
        { status: 400 }
      );
    }

    const returnRequest = await createReturnRequest({
      orderId: id,
      orderItemId,
      userId: authSession.user.id,
      requestedQuantity: Number(requestedQuantity) || 1,
      reason: reason.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `Return request ${returnRequest.returnNumber} submitted for atelier review.`,
      returnRequest,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create return request",
      },
      { status: 400 }
    );
  }
}
