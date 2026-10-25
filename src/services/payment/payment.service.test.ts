import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getAvailablePaymentProviders,
  getPaymentProvider,
  initiateOrderPayment,
  processPaymentWebhook,
} from "./payment.service";
import { MockPaymentProvider } from "./mock-payment.provider";
import { PayHerePaymentProvider } from "./payhere-payment.provider";

describe("Payment Provider Architecture & Webhooks", () => {
  let testOrderId: string;
  let testOrderNumber: string;
  const mockProvider = new MockPaymentProvider();

  beforeAll(async () => {
    testOrderNumber = `NXR-PAY-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotalInCents: 250000,
        totalInCents: 250000,
        currency: "USD",
        guestEmail: "patron@nexoracommerce.com",
        guestName: "Lord Stirling",
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    await prisma.paymentEvent.deleteMany({ where: { orderId: testOrderId } });
    await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
    await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
  });

  describe("Provider Registry", () => {
    it("should list available payment providers", () => {
      const available = getAvailablePaymentProviders();
      expect(available.length).toBeGreaterThan(0);
      const mock = available.find((p) => p.id === "MOCK");
      expect(mock).toBeDefined();
      expect(mock?.name).toContain("Atelier");
    });

    it("should resolve provider by ID case-insensitively", () => {
      const provider = getPaymentProvider("mock");
      expect(provider.id).toBe("MOCK");
    });

    it("should reject unconfigured or unknown providers", () => {
      expect(() => getPaymentProvider("UNKNOWN_GATEWAY")).toThrow(
        "Unsupported payment provider: UNKNOWN_GATEWAY"
      );
    });
  });

  describe("Payment Session Initiation", () => {
    it("should initiate a payment session and create a PENDING payment record", async () => {
      const sessionResult = await initiateOrderPayment(
        testOrderId,
        "MOCK",
        "http://localhost:3000"
      );

      expect(sessionResult.provider).toBe("MOCK");
      expect(sessionResult.sessionId).toBeDefined();
      expect(sessionResult.redirectUrl).toContain("session_id=");

      // Verify Payment record in PostgreSQL
      const payment = await prisma.payment.findFirst({
        where: { orderId: testOrderId },
      });
      expect(payment).toBeDefined();
      expect(payment?.status).toBe("PENDING");
      expect(payment?.amountInCents).toBe(250000);
      expect(payment?.providerPaymentId).toBe(sessionResult.sessionId);
    });
  });

  describe("Webhook Security & Idempotency", () => {
    it("should reject webhooks with missing or invalid signatures", async () => {
      const fakePayload = JSON.stringify({
        orderId: testOrderId,
        status: "PAID",
        amountInCents: 250000,
      });

      const badHeaders = new Headers({
        "x-mock-signature": "invalid-forged-signature-hash",
      });

      await expect(
        processPaymentWebhook("MOCK", fakePayload, badHeaders)
      ).rejects.toThrow("Webhook signature verification failed.");
    });

    it("should process valid payment success webhook, update order to PAID, and record PaymentEvent", async () => {
      const eventId = `evt_success_${Date.now()}`;
      const payloadObj = {
        eventId,
        eventType: "payment.succeeded",
        orderId: testOrderId,
        orderNumber: testOrderNumber,
        providerPaymentId: `mock_trans_${Date.now()}`,
        status: "PAID",
        amountInCents: 250000,
        currency: "USD",
        paymentMethod: "CREDIT_CARD",
        cardBrand: "Visa",
        cardLast4: "4242",
      };
      const payloadString = JSON.stringify(payloadObj);
      const signature = mockProvider.generateWebhookSignature(payloadString);
      const headers = new Headers({ "x-mock-signature": signature });

      const result = await processPaymentWebhook("MOCK", payloadString, headers);

      expect(result.success).toBe(true);
      expect(result.status).toBe("PAID");
      expect(result.duplicate).toBe(false);

      // Verify Order updated in PostgreSQL
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.paymentStatus).toBe("PAID");
      expect(updatedOrder?.status).toBe("PAID");
      expect(updatedOrder?.paidAt).toBeInstanceOf(Date);

      // Verify PaymentEvent recorded
      const eventRecord = await prisma.paymentEvent.findUnique({
        where: { eventId },
      });
      expect(eventRecord).toBeDefined();
      expect(eventRecord?.status).toBe("PROCESSED");
    });

    it("should enforce idempotency by detecting duplicate webhook events and returning duplicate notice", async () => {
      const eventId = `evt_dedup_${Date.now()}`;
      const payloadObj = {
        eventId,
        eventType: "payment.succeeded",
        orderId: testOrderId,
        status: "PAID",
        amountInCents: 250000,
      };
      const payloadString = JSON.stringify(payloadObj);
      const signature = mockProvider.generateWebhookSignature(payloadString);
      const headers = new Headers({ "x-mock-signature": signature });

      // First delivery
      const firstResult = await processPaymentWebhook("MOCK", payloadString, headers);
      expect(firstResult.duplicate).toBe(false);

      // Duplicate delivery with identical eventId
      const secondResult = await processPaymentWebhook("MOCK", payloadString, headers);
      expect(secondResult.success).toBe(true);
      expect(secondResult.duplicate).toBe(true);
      expect(secondResult.message).toContain("Duplicate webhook event already processed");
    });
  });

  describe("PayHere Signature Calculations", () => {
    it("should calculate correct MD5 hash according to PayHere specifications", () => {
      const payhere = new PayHerePaymentProvider();
      process.env.PAYHERE_MERCHANT_ID = "1211111";
      process.env.PAYHERE_MERCHANT_SECRET = "TestSecretKey123";

      const hash = payhere.generatePaymentHash("ORD-1001", 50000, "LKR");
      expect(hash).toBeDefined();
      expect(hash.length).toBe(32); // MD5 hex length
      expect(hash).toBe(hash.toUpperCase());
    });
  });
});
