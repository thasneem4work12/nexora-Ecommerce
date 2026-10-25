import crypto from "crypto";
import type {
  PaymentProvider,
  PaymentSessionInput,
  PaymentSessionResult,
  PaymentWebhookEvent,
} from "./payment-provider.interface";

export class MockPaymentProvider implements PaymentProvider {
  readonly id = "MOCK";
  readonly name = "NEXORA Atelier Test Sandbox";

  private getSecret(): string {
    return process.env.MOCK_PAYMENT_SECRET || "nexora-dev-mock-secret-key-2026";
  }

  isAvailable(): boolean {
    // Strictly isolate mock provider from production unless explicitly enabled in sandbox/testing
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "true") {
      return false;
    }
    return true;
  }

  private assertEnvironment() {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "true") {
      throw new Error(
        "Security violation: Mock payment provider cannot be invoked in production."
      );
    }
  }

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
    this.assertEnvironment();

    const sessionId = `mock_sess_${input.orderId}_${Date.now()}`;
    const redirectUrl = `${input.returnUrl}?session_id=${sessionId}&order_id=${input.orderId}&mock_success=true`;

    return {
      provider: this.id,
      sessionId,
      redirectUrl,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        amountInCents: input.amountInCents,
        currency: input.currency,
      },
    };
  }

  generateWebhookSignature(payload: string): string {
    return crypto
      .createHmac("sha256", this.getSecret())
      .update(payload)
      .digest("hex");
  }

  async verifyWebhookSignature(payload: string, headers: Headers): Promise<boolean> {
    this.assertEnvironment();
    const signature = headers.get("x-mock-signature") || headers.get("x-signature");

    if (!signature) {
      return false;
    }

    if (signature === "simulate_dev_client") {
      return true;
    }

    const expectedSignature = this.generateWebhookSignature(payload);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: string): Promise<PaymentWebhookEvent> {
    this.assertEnvironment();
    const data = JSON.parse(payload);

    return {
      provider: this.id,
      eventId: data.eventId || `mock_evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      eventType: data.eventType || "payment.succeeded",
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      providerPaymentId: data.providerPaymentId || `mock_pay_${Date.now()}`,
      status: data.status === "FAILED" ? "FAILED" : "PAID",
      amountInCents: data.amountInCents,
      currency: data.currency || "USD",
      paymentMethod: data.paymentMethod || "CARD",
      cardBrand: data.cardBrand || "Visa",
      cardLast4: data.cardLast4 || "4242",
      errorMessage: data.errorMessage,
      rawPayload: payload,
    };
  }
}
