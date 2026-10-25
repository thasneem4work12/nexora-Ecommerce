import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { cancelCustomerOrder } from "@/services/order.service";

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
        { success: false, error: "Authentication required to cancel order." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Client requested cancellation";

    const updated = await cancelCustomerOrder(id, authSession.user.id, reason);

    return NextResponse.json({
      success: true,
      message: `Order ${updated.orderNumber} successfully cancelled and stock released.`,
      order: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel order",
      },
      { status: 400 }
    );
  }
}
