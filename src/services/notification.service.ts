import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  orderId?: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  message: string;
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
}

/**
 * Generates an Editorial Luxury branded HTML email template.
 */
export function generateLuxuryEmailHtml(params: {
  headline: string;
  previewText: string;
  clientName?: string;
  bodyContent: string;
  actionText?: string;
  actionUrl?: string;
}): string {
  const { headline, previewText, clientName, bodyContent, actionText, actionUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0a09; color: #f5f5f4; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1c1917; border: 1px solid #292524; padding: 40px; }
    .logo { font-family: 'Cinzel', serif, Georgia; font-size: 24px; letter-spacing: 0.2em; text-transform: uppercase; color: #f5f5f4; text-align: center; margin-bottom: 30px; }
    .divider { height: 1px; background: #d97706; margin: 20px 0; opacity: 0.5; }
    .headline { font-size: 20px; font-weight: 300; letter-spacing: 0.05em; color: #fbbf24; text-align: center; margin-bottom: 25px; }
    .salutation { font-size: 15px; color: #e7e5e4; margin-bottom: 16px; }
    .content { font-size: 14px; line-height: 1.7; color: #a8a29e; margin-bottom: 30px; }
    .btn-wrap { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: #d97706; color: #000000; text-decoration: none; padding: 12px 30px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; }
    .footer { font-size: 11px; color: #78716c; text-align: center; border-top: 1px solid #292524; padding-top: 20px; margin-top: 40px; letter-spacing: 0.05em; }
  </style>
<body>
  <div style="display:none;font-size:1px;color:#1c1917;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <div class="container">
    <div class="logo">NEXORA</div>
    <div class="headline">${headline}</div>
    <div class="divider"></div>
    ${clientName ? `<p class="salutation">Dear ${clientName},</p>` : ""}
    <div class="content">
      ${bodyContent}
    </div>
    ${
      actionText && actionUrl
        ? `<div class="btn-wrap"><a href="${actionUrl}" class="btn">${actionText}</a></div>`
        : ""
    }
    <div class="footer">
      NEXORA COMMERCE ATELIER &bull; LUXURY HIGH ARTISANRY<br>
      Automated Transactional Dispatch &bull; Please do not reply directly to this notice.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Creates an in-app notification and dispatches a simulated transactional email.
 * Built with an outbox resilience guarantee: never throws exceptions that abort order transactions.
 */
export async function sendTransactionalNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });

    const recipientEmail = input.emailTo || user?.email;
    const clientName = user?.name;

    const emailHtml =
      input.emailBody ||
      generateLuxuryEmailHtml({
        headline: input.title,
        previewText: input.message,
        clientName,
        bodyContent: `<p>${input.message}</p>`,
      });

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        orderId: input.orderId || null,
        ticketId: input.ticketId || null,
        type: input.type,
        title: input.title,
        message: input.message,
        emailTo: recipientEmail,
        emailSubject: input.emailSubject || input.title,
        emailBody: emailHtml,
        deliveryStatus: "SENT",
        deliveredAt: new Date(),
      },
    });

    // Development & Staging Transactional Email Adapter (Logger)
    console.log(
      `[Transactional Email Adapter] Notification ${notification.id} dispatched to ${recipientEmail}: "${input.title}"`
    );

    return { success: true, notificationId: notification.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Notification Service Error] Failed to send transactional notice:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Helper to notify customer upon order placement.
 */
export async function notifyOrderPlaced(orderId: string, userId: string, orderNumber: string, total: string) {
  return sendTransactionalNotification({
    userId,
    orderId,
    type: "ORDER_PLACED",
    title: `Order Awaiting Confirmation — ${orderNumber}`,
    message: `Your reservation for order ${orderNumber} amounting to ${total} has been received and is pending payment authorization.`,
    emailSubject: `NEXORA Atelier: Order ${orderNumber} Received`,
  });
}

/**
 * Helper to notify customer upon confirmed payment.
 */
export async function notifyPaymentConfirmed(orderId: string, userId: string, orderNumber: string, total: string) {
  return sendTransactionalNotification({
    userId,
    orderId,
    type: "PAYMENT_CONFIRMED",
    title: `Payment Confirmed — ${orderNumber}`,
    message: `Payment of ${total} for order ${orderNumber} has been verified. Your piece is now entering bespoke atelier processing.`,
    emailSubject: `NEXORA Atelier: Payment Confirmed for Order ${orderNumber}`,
  });
}

/**
 * Helper to notify customer upon shipment dispatch.
 */
export async function notifyOrderShipped(
  orderId: string,
  userId: string,
  orderNumber: string,
  carrier: string,
  trackingNumber?: string,
  trackingUrl?: string
) {
  const trackingDetails = trackingNumber
    ? ` Dispatched via ${carrier} under tracking number ${trackingNumber}.`
    : ` Dispatched via ${carrier}.`;

  return sendTransactionalNotification({
    userId,
    orderId,
    type: "ORDER_SHIPPED",
    title: `Shipment Dispatched — ${orderNumber}`,
    message: `Your bespoke creation for order ${orderNumber} has departed the atelier.${trackingDetails}`,
    emailSubject: `NEXORA Atelier: Order ${orderNumber} Dispatched`,
    emailBody: generateLuxuryEmailHtml({
      headline: `Order ${orderNumber} Dispatched`,
      previewText: `Your bespoke creation has departed the atelier.`,
      bodyContent: `<p>Your creation has been meticulously prepared and transferred to our boutique logistics courier.</p><p><strong>Courier:</strong> ${carrier}<br>${trackingNumber ? `<strong>Tracking Code:</strong> ${trackingNumber}` : ""}</p>`,
      actionText: trackingUrl ? "Track Consignment" : "View Order Progress",
      actionUrl: trackingUrl || `/account/orders/${orderId}`,
    }),
  });
}

/**
 * Helper to notify customer upon delivery confirmation.
 */
export async function notifyOrderDelivered(orderId: string, userId: string, orderNumber: string) {
  return sendTransactionalNotification({
    userId,
    orderId,
    type: "ORDER_DELIVERED",
    title: `Order Delivered — ${orderNumber}`,
    message: `Order ${orderNumber} has been safely delivered to your designated address. We hope it exceeds expectations.`,
    emailSubject: `NEXORA Atelier: Delivery Confirmed — ${orderNumber}`,
  });
}

/**
 * Helper to notify customer regarding cancellation decision.
 */
export async function notifyCancellationDecision(
  orderId: string,
  userId: string,
  orderNumber: string,
  decision: "APPROVED" | "REJECTED",
  notes?: string
) {
  const title = decision === "APPROVED"
    ? `Order Cancellation Confirmed — ${orderNumber}`
    : `Order Cancellation Request Declined — ${orderNumber}`;

  const message = decision === "APPROVED"
    ? `Your cancellation request for order ${orderNumber} has been approved.${notes ? ` Note: ${notes}` : ""}`
    : `Your cancellation request for order ${orderNumber} could not be approved.${notes ? ` Reason: ${notes}` : ""}`;

  return sendTransactionalNotification({
    userId,
    orderId,
    type: "CANCELLATION_DECISION",
    title,
    message,
    emailSubject: `NEXORA Atelier: ${title}`,
  });
}

/**
 * Helper to notify customer regarding return decision.
 */
export async function notifyReturnDecision(
  orderId: string,
  userId: string,
  orderNumber: string,
  decision: "APPROVED" | "REJECTED" | "COMPLETED",
  notes?: string
) {
  const title = `Return Request ${decision} — ${orderNumber}`;
  const message = `Your return request for order ${orderNumber} status is now ${decision}.${notes ? ` Detail: ${notes}` : ""}`;

  return sendTransactionalNotification({
    userId,
    orderId,
    type: "RETURN_DECISION",
    title,
    message,
    emailSubject: `NEXORA Atelier: Return Update for Order ${orderNumber}`,
  });
}

/**
 * Helper to notify user of support ticket message.
 */
export async function notifySupportTicketReply(
  ticketId: string,
  userId: string,
  ticketNumber: string,
  senderRole: string,
  snippet: string
) {
  return sendTransactionalNotification({
    userId,
    ticketId,
    type: "SUPPORT_TICKET_REPLY",
    title: `New Concierge Message — ${ticketNumber}`,
    message: `A new message from ${senderRole} has been posted to ticket ${ticketNumber}: "${snippet}"`,
    emailSubject: `NEXORA Concierge: Response on Ticket ${ticketNumber}`,
  });
}
