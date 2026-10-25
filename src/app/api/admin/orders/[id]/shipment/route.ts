import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { updateOrderShipment } from "@/services/admin-order.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminApi("MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { carrier, trackingNumber, status, notes } = body;

    if (!carrier || !trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Carrier name and tracking number are mandatory for dispatch.",
        },
        { status: 400 }
      );
    }

    const shipment = await updateOrderShipment(id, {
      carrier,
      trackingNumber,
      status,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Shipment updated with tracking: ${trackingNumber}`,
      shipment,
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
        error: error instanceof Error ? error.message : "Failed to record shipment",
      },
      { status: 400 }
    );
  }
}
