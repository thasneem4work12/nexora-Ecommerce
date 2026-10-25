import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/services/payment/payment.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawPayload = await request.text();

    const result = await processPaymentWebhook(
      provider,
      rawPayload,
      request.headers
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payment webhook processing failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 400 }
    );
  }
}
