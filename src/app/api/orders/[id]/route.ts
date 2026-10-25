import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrderForCustomer } from "@/services/order.service";
import { getVerifiedUserSession } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const guestEmail = searchParams.get("guestEmail") || undefined;

    // Check if user is logged in
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });
    const userId = authSession?.user?.id;

    // Check if user is an administrator
    const adminSession = await getVerifiedUserSession();
    const isAdmin = Boolean(
      adminSession && ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"].includes(adminSession.user.role)
    );

    const order = await getOrderForCustomer(id, {
      userId,
      guestEmail,
      isAdmin,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch order";
    const status = message.includes("Access denied") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
