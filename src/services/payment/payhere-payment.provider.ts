import crypto from "crypto";
import type {
  PaymentProvider,
  PaymentSessionInput,
  PaymentSessionResult,
  PaymentWebhookEvent,
} from "./payment-provider.interface";

export class PayHerePaymentProvider implements PaymentProvider {
  readonly id = "PAYHERE";
  readonly name = "PayHere (Sri Lanka & International)";

  private getMerchantId(): string {
    return process.env.PAYHERE_MERCHANT_ID || "";
  }

  private getMerchantSecret(): string {
    return process.env.PAYHERE_MERCHANT_SECRET || "";
  }

  private isSandbox(): boolean {
    return process.env.PAYHERE_SANDBOX !== "false";
  }

  isAvailable(): boolean {
    return Boolean(this.getMerchantId() && this.getMerchantSecret());
  }

  /**
   * Generates the PayHere checkout hash required to authorize the payment form.
   * Formula: strtoupper(md5(merchant_id + order_id + formatted_amount + currency + strtoupper(md5(merchant_secret))))
   */
  generatePaymentHash(
    orderId: string,
    amountInCents: number,
    currency: string
  ): string {
    const merchantId = this.getMerchantId();
    const secret = this.getMerchantSecret();
    const formattedAmount = (amountInCents / 100).toFixed(2);

    const hashedSecret = crypto
      .createHash("md5")
      .update(secret)
      .digest("hex")
      .toUpperCase();

    const hashString = `${merchantId}${orderId}${formattedAmount}${currency}${hashedSecret}`;

    return crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex")
      .toUpperCase();
  }

  async createPaymentSession(
    input: PaymentSessionInput
  ): Promise<PaymentSessionResult> {
    const merchantId = this.getMerchantId();
    if (!merchantId) {
      throw new Error("PayHere credentials are not configured.");
    }

    const formattedAmount = (input.amountInCents / 100).toFixed(2);
    const hash = this.generatePaymentHash(
      input.orderId,
      input.amountInCents,
      input.currency
    );

    const gatewayUrl = this.isSandbox()
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout";

    const nameParts = input.customerName.trim().split(" ");
    const firstName = nameParts[0] || "Valued";
    const lastName = nameParts.slice(1).join(" ") || "Client";

    const formParameters: Record<string, string> = {
      merchant_id: merchantId,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      notify_url: input.notifyUrl,
      order_id: input.orderId,
      items: `NEXORA Atelier Order ${input.orderNumber}`,
      currency: input.currency,
      amount: formattedAmount,
      first_name: firstName,
      last_name: lastName,
      email: input.customerEmail,
      phone: "+94770000000",
      address: "Atelier Client Address",
      city: "Colombo",
      country: "Sri Lanka",
      hash,
    };

    return {
      provider: this.id,
      sessionId: `payhere_${input.orderId}`,
      redirectUrl: gatewayUrl,
      formParameters,
      metadata: {
        gatewayUrl,
        sandbox: this.isSandbox(),
      },
    };
  }

  async verifyWebhookSignature(payload: string): Promise<boolean> {
    const secret = this.getMerchantSecret();
    if (!secret) return false;

    try {
      // PayHere sends urlencoded or json form data
      const data = typeof payload === "string" && payload.startsWith("{")
        ? JSON.parse(payload)
        : Object.fromEntries(new URLSearchParams(payload));

      const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig,
      } = data;

      if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
        return false;
      }

      const hashedSecret = crypto
        .createHash("md5")
        .update(secret)
        .digest("hex")
        .toUpperCase();

      const expectedString = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`;
      const localMd5sig = crypto
        .createHash("md5")
        .update(expectedString)
        .digest("hex")
        .toUpperCase();

      return localMd5sig === String(md5sig).toUpperCase();
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: string): Promise<PaymentWebhookEvent> {
    const data = typeof payload === "string" && payload.startsWith("{")
      ? JSON.parse(payload)
      : Object.fromEntries(new URLSearchParams(payload));

    const statusCode = parseInt(data.status_code, 10);
    let status: "PAID" | "FAILED" | "PENDING" = "FAILED";

    if (statusCode === 2) {
      status = "PAID";
    } else if (statusCode === 0) {
      status = "PENDING";
    }

    const amountInCents = Math.round(parseFloat(data.payhere_amount || "0") * 100);

    // Card details (never stores raw sensitive card data)
    let cardLast4: string | undefined;
    if (data.card_no) {
      const match = String(data.card_no).match(/(\d{4})$/);
      if (match) cardLast4 = match[1];
    }

    return {
      provider: this.id,
      eventId: data.payment_id || `payhere_evt_${Date.now()}`,
      eventType: statusCode === 2 ? "payhere.payment.success" : "payhere.payment.failed",
      orderId: data.order_id,
      providerPaymentId: data.payment_id || `payhere_pay_${Date.now()}`,
      status,
      amountInCents,
      currency: data.payhere_currency || "LKR",
      paymentMethod: data.method || "CARD",
      cardBrand: data.method,
      cardLast4,
      errorMessage: statusCode !== 2 ? data.status_message : undefined,
      rawPayload: payload,
    };
  }
}
