import { NextRequest, NextResponse } from "next/server";
import { getAvailableShippingMethods, calculateTax } from "@/services/shipping-tax.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subtotalInCents = typeof body.subtotalInCents === "number" ? body.subtotalInCents : 0;
    const address = body.address;

    const shippingMethods = getAvailableShippingMethods(subtotalInCents);
    const tax = calculateTax(subtotalInCents, address);

    return NextResponse.json({
      success: true,
      shippingMethods,
      tax,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate rates",
      },
      { status: 400 }
    );
  }
}
