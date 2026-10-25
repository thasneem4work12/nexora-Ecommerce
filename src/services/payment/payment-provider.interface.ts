export interface PaymentSessionInput {
  orderId: string;
  orderNumber: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PaymentSessionResult {
  provider: string;
  sessionId: string;
  redirectUrl?: string;
  clientSecret?: string;
  metadata?: Record<string, unknown>;
  formParameters?: Record<string, string>; // For POST redirect gateways like PayHere
}

export interface PaymentWebhookEvent {
  provider: string;
  eventId: string;
  eventType: string;
  orderId: string;
  orderNumber?: string;
  providerPaymentId: string;
  status: "PAID" | "FAILED" | "PENDING";
  amountInCents: number;
  currency: string;
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  errorMessage?: string;
  rawPayload: string;
}

export interface PaymentProvider {
  id: string; // e.g. "MOCK", "PAYHERE", "STRIPE"
  name: string;
  isAvailable(): boolean;
  createPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult>;
  verifyWebhookSignature(payload: string, headers: Headers): Promise<boolean>;
  parseWebhookEvent(payload: string, headers: Headers): Promise<PaymentWebhookEvent>;
}
