import { SaaSBillingInterval } from "@prisma/client";

export interface SaaSSubscriptionCheckoutOptions {
  businessId: string;
  businessName: string;
  contactEmail: string;
  planId: string;
  planCode: string;
  planName: string;
  priceId: string;
  interval: SaaSBillingInterval;
  amountInCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SaaSCheckoutResult {
  checkoutUrl?: string;
  providerSubscriptionId: string;
  providerPaymentId?: string;
  status: "PENDING" | "ACTIVE" | "REQUIRES_ACTION";
  requiresRedirect: boolean;
  metadata?: Record<string, unknown>;
}

export interface SaaSWebhookResult {
  handled: boolean;
  event: string;
  businessId?: string;
  subscriptionId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  status?: string;
  amountInCents?: number;
  currency?: string;
  message?: string;
  raw?: unknown;
}

export interface ISaaSBillingProvider {
  getProviderName(): string;
  
  createSubscriptionCheckout(
    options: SaaSSubscriptionCheckoutOptions
  ): Promise<SaaSCheckoutResult>;

  cancelSubscription(
    providerSubscriptionId: string,
    reason?: string
  ): Promise<{ success: boolean; effectiveDate?: Date }>;

  verifyWebhookSignature(
    payload: string | Buffer | Record<string, unknown>,
    signature: string
  ): boolean;

  processWebhook(
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<SaaSWebhookResult>;
}
