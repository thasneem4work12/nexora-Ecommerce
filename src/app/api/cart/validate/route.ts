import { NextRequest, NextResponse } from "next/server";
import { validateCart } from "@/services/cart.service";
import type { CartLineItem } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: CartLineItem[] = Array.isArray(body?.items) ? body.items : [];

    const result = await validateCart(items);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("API error in /api/cart/validate:", error);
    return NextResponse.json(
      { success: false, error: "Cart validation failed" },
      { status: 500 }
    );
  }
}
