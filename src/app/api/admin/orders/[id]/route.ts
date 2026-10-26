import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getAdminOrderById, updateAdminOrderStatus } from "@/services/admin-order.service";
import type { OrderStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAdminApi(request, "VIEW_ORDERS");
    const { id } = await params;

    const order = await getAdminOrderById(id, businessId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
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
      { success: false, error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAdminApi(request, "MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { status, notes } = body;
    if (!status) {
      return NextResponse.json(
        { success: false, error: "Target order status is required." },
        { status: 400 }
      );
    }

    const updated = await updateAdminOrderStatus(
      id,
      status as OrderStatus,
      notes,
      businessId
    );

    return NextResponse.json({
      success: true,
      message: `Order status successfully transitioned to ${status}.`,
      order: updated,
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
        error: error instanceof Error ? error.message : "Failed to update order status",
      },
      { status: 400 }
    );
  }
}
