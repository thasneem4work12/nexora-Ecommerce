import crypto from "crypto";
import {
  ISaaSBillingProvider,
  SaaSSubscriptionCheckoutOptions,
  SaaSCheckoutResult,
  SaaSWebhookResult,
} from "./billing-provider.interface";

const SIMULATED_WEBHOOK_SECRET = process.env.SAAS_BILLING_WEBHOOK_SECRET || "nexora_simulated_saas_webhook_secret_2026";

export class SimulatedSaaSBillingProvider implements ISaaSBillingProvider {
  getProviderName(): string {
    return "SIMULATED";
  }

  async createSubscriptionCheckout(
    options: SaaSSubscriptionCheckoutOptions
  ): Promise<SaaSCheckoutResult> {
    const providerSubscriptionId = `sim_sub_${options.businessId.slice(0, 8)}_${Date.now().toString(36)}`;
    const providerPaymentId = `sim_pay_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

    return {
      providerSubscriptionId,
      providerPaymentId,
      status: "ACTIVE",
      requiresRedirect: false,
      metadata: {
        provider: "SIMULATED",
        businessId: options.businessId,
        planCode: options.planCode,
        interval: options.interval,
        amountInCents: options.amountInCents,
        currency: options.currency,
        sandbox: true,
      },
    };
  }

  async cancelSubscription(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    providerSubscriptionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reason?: string
  ): Promise<{ success: boolean; effectiveDate?: Date }> {
    return {
      success: true,
      effectiveDate: new Date(),
    };
  }

  verifyWebhookSignature(
    payload: string | Buffer | Record<string, unknown>,
    signature: string
  ): boolean {
    if (!signature) return false;
    const rawPayload = typeof payload === "string" ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac("sha256", SIMULATED_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");
    
    // Constant time comparison to prevent timing attacks
    return (
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    );
  }

  static generateWebhookSignature(payload: Record<string, unknown>): string {
    const rawPayload = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", SIMULATED_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");
  }

  async processWebhook(
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<SaaSWebhookResult> {
    if (signature && !this.verifyWebhookSignature(payload, signature)) {
      throw new Error("Invalid simulated webhook HMAC signature.");
    }

    const event = (payload.event as string) || "payment.succeeded";
    return {
      handled: true,
      event,
      businessId: payload.businessId as string | undefined,
      subscriptionId: payload.subscriptionId as string | undefined,
      providerSubscriptionId: payload.providerSubscriptionId as string | undefined,
      providerPaymentId: (payload.providerPaymentId as string) || `sim_pay_${Date.now().toString(36)}`,
      status: (payload.status as string) || "PAID",
      amountInCents: payload.amountInCents as number | undefined,
      currency: (payload.currency as string) || "USD",
      message: (payload.message as string) || "Simulated event processed successfully",
      raw: payload,
    };
  }
}

export const simulatedSaaSBillingProvider = new SimulatedSaaSBillingProvider();
