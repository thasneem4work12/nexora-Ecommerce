import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * POST /api/webhooks/saas/payhere
 * PayHere SaaS recurring billing webhook endpoint.
 * Note: Real PayHere recurring automated subscriptions require an approved merchant account
 * with tokenization permissions enabled. In development and staging, recurring billing is BLOCKED
 * pending approved bank merchant contracts.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // PayHere sometimes sends application/x-www-form-urlencoded
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    }

    const eventId = String(payload.order_id || payload.payment_id || `payhere_evt_${Date.now()}`);

    // Record audit log documenting receipt and current blocked status
    await prisma.saaSBillingAuditLog.create({
      data: {
        action: "PAYHERE_RECURRING_WEBHOOK_RECEIVED",
        details: {
          eventId,
          status: "BLOCKED_PENDING_MERCHANT_APPROVAL",
          note: "PayHere recurring tokenization API is currently in BLOCKED status pending Sri Lankan merchant recurring billing approval.",
          rawPayload: payload as Prisma.InputJsonValue,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.warn(
      "[PayHere SaaS Webhook] Webhook received. PayHere recurring billing is marked as BLOCKED pending external merchant approval."
    );

    return NextResponse.json({
      success: true,
      status: "BLOCKED",
      message:
        "PayHere recurring webhook acknowledged. Real recurring automation requires approved tokenization permissions.",
    });
  } catch (error) {
    console.error("[PayHere SaaS Webhook] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process PayHere recurring webhook." },
      { status: 500 }
    );
  }
}
