import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createOrderFromCheckout } from "@/services/order.service";
import { initiateOrderPayment } from "@/services/payment/payment.service";
import type { CheckoutSubmissionInput } from "@/types/order";

export async function POST(request: NextRequest) {
  try {
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });
    const authenticatedUserId = authSession?.user?.id;

    const body = (await request.json()) as CheckoutSubmissionInput;

    // Validate guest requirements if not signed in
    if (!authenticatedUserId && (!body.guestEmail || !body.guestEmail.includes("@"))) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid contact email is required for atelier guest checkout.",
        },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your bag is currently empty." },
        { status: 400 }
      );
    }

    if (
      !body.shippingAddress ||
      !body.shippingAddress.firstName ||
      !body.shippingAddress.addressLine1 ||
      !body.shippingAddress.city ||
      !body.shippingAddress.country
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Complete shipping address (First Name, Address, City, Country) is required.",
        },
        { status: 400 }
      );
    }

    // 1. Transactionally validate, create order, and reserve stock
    const order = await createOrderFromCheckout(body, authenticatedUserId);

    // 2. Resolve origin for payment return / notification callbacks
    const origin = request.nextUrl.origin || "http://localhost:3000";

    // 3. Initiate payment session
    const paymentProvider = body.paymentProvider || "MOCK";
    const paymentSession = await initiateOrderPayment(
      order.id,
      paymentProvider,
      origin
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalInCents: order.totalInCents,
        subtotalInCents: order.subtotalInCents,
        shippingInCents: order.shippingInCents,
        taxInCents: order.taxInCents,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
      paymentSession,
    });
  } catch (error) {
    console.error("Checkout execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout submission failed.",
      },
      { status: 400 }
    );
  }
}
