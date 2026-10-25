import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { PayHerePaymentProvider } from "./payhere-payment.provider";

describe("PayHere Payment Provider (Official Gateway Specification Audit)", () => {
  const originalEnv = process.env;
  let provider: PayHerePaymentProvider;

  const TEST_MERCHANT_ID = "1234567";
  const TEST_MERCHANT_SECRET = "secure_payhere_merchant_secret_key_2026";

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PAYHERE_MERCHANT_ID: TEST_MERCHANT_ID,
      PAYHERE_MERCHANT_SECRET: TEST_MERCHANT_SECRET,
      PAYHERE_SANDBOX: "true",
    };
    provider = new PayHerePaymentProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function generateOfficialPayHereSignature(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
    statusCode: string | number,
    secret: string
  ): string {
    const hashedSecret = crypto
      .createHash("md5")
      .update(secret)
      .digest("hex")
      .toUpperCase();
    const hashString = `${merchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    return crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex")
      .toUpperCase();
  }

  it("should generate checkout payment hash conforming to official PayHere specification", () => {
    const orderId = "NXR-ORD-1001";
    const amountInCents = 245000; // $2,450.00
    const currency = "USD";

    const hash = provider.generatePaymentHash(orderId, amountInCents, currency);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(32);
    expect(hash).toBe(hash.toUpperCase());

    // Verify manual calculation matches
    const expected = generateOfficialPayHereSignature(
      TEST_MERCHANT_ID,
      orderId,
      "2450.00",
      currency,
      "",
      TEST_MERCHANT_SECRET
    );
    expect(hash).toBe(expected);
  });

  it("should verify authentic PayHere callback signatures with matching merchant ID and credentials", async () => {
    const orderId = "NXR-ORD-2002";
    const amount = "1250.00";
    const currency = "USD";
    const statusCode = 2; // Success

    const md5sig = generateOfficialPayHereSignature(
      TEST_MERCHANT_ID,
      orderId,
      amount,
      currency,
      statusCode,
      TEST_MERCHANT_SECRET
    );

    const payload = new URLSearchParams({
      merchant_id: TEST_MERCHANT_ID,
      order_id: orderId,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: String(statusCode),
      payment_id: "payhere_trans_9999",
      md5sig,
    }).toString();

    const isValid = await provider.verifyWebhookSignature(payload);
    expect(isValid).toBe(true);
  });

  it("should strictly reject callback signatures if merchant ID does not match configured store ID", async () => {
    const orderId = "NXR-ORD-2002";
    const amount = "1250.00";
    const currency = "USD";
    const statusCode = 2;
    const rogueMerchantId = "9999999";

    const md5sig = generateOfficialPayHereSignature(
      rogueMerchantId,
      orderId,
      amount,
      currency,
      statusCode,
      TEST_MERCHANT_SECRET
    );

    const payload = new URLSearchParams({
      merchant_id: rogueMerchantId,
      order_id: orderId,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: String(statusCode),
      md5sig,
    }).toString();

    const isValid = await provider.verifyWebhookSignature(payload);
    expect(isValid).toBe(false);
  });

  it("should reject tampered or invalid MD5 signatures", async () => {
    const orderId = "NXR-ORD-3003";
    const amount = "500.00";
    const currency = "USD";
    const statusCode = 2;

    const payload = new URLSearchParams({
      merchant_id: TEST_MERCHANT_ID,
      order_id: orderId,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: String(statusCode),
      md5sig: "INVALID_TAMPERED_CHECKSUM_HASH_VALUE",
    }).toString();

    const isValid = await provider.verifyWebhookSignature(payload);
    expect(isValid).toBe(false);
  });

  it("should reject callback when required fields are missing or malformed", async () => {
    // Missing md5sig
    expect(
      await provider.verifyWebhookSignature(
        new URLSearchParams({
          merchant_id: TEST_MERCHANT_ID,
          order_id: "ORD-1",
          payhere_amount: "100.00",
          payhere_currency: "USD",
          status_code: "2",
        }).toString()
      )
    ).toBe(false);

    // Missing order_id
    expect(
      await provider.verifyWebhookSignature(
        new URLSearchParams({
          merchant_id: TEST_MERCHANT_ID,
          payhere_amount: "100.00",
          payhere_currency: "USD",
          status_code: "2",
          md5sig: "some_hash",
        }).toString()
      )
    ).toBe(false);

    // Empty payload
    expect(await provider.verifyWebhookSignature("")).toBe(false);
  });

  it("should correctly parse status codes into authoritative internal status states", async () => {
    // Status 2 -> PAID
    const successEvent = await provider.parseWebhookEvent(
      new URLSearchParams({
        order_id: "ORD-101",
        status_code: "2",
        payhere_amount: "350.00",
        payhere_currency: "USD",
      }).toString()
    );
    expect(successEvent.status).toBe("PAID");
    expect(successEvent.amountInCents).toBe(35000);

    // Status 0 -> PENDING
    const pendingEvent = await provider.parseWebhookEvent(
      new URLSearchParams({
        order_id: "ORD-102",
        status_code: "0",
        payhere_amount: "350.00",
        payhere_currency: "USD",
      }).toString()
    );
    expect(pendingEvent.status).toBe("PENDING");

    // Status -1 -> FAILED (Canceled)
    const canceledEvent = await provider.parseWebhookEvent(
      new URLSearchParams({
        order_id: "ORD-103",
        status_code: "-1",
        payhere_amount: "350.00",
        payhere_currency: "USD",
      }).toString()
    );
    expect(canceledEvent.status).toBe("FAILED");

    // Status -2 -> FAILED
    const failedEvent = await provider.parseWebhookEvent(
      new URLSearchParams({
        order_id: "ORD-104",
        status_code: "-2",
        payhere_amount: "350.00",
        payhere_currency: "USD",
      }).toString()
    );
    expect(failedEvent.status).toBe("FAILED");
  });

  it("should extract masked card details without exposing sensitive PAN or CVV data", async () => {
    const event = await provider.parseWebhookEvent(
      new URLSearchParams({
        order_id: "ORD-200",
        status_code: "2",
        payhere_amount: "1200.00",
        payhere_currency: "USD",
        card_no: "************4242",
        method: "VISA",
      }).toString()
    );

    expect(event.cardLast4).toBe("4242");
    expect(event.cardBrand).toBe("VISA");
    // Verify payload does not contain unmasked PAN
    expect(event.rawPayload).not.toContain("4242424242424242");
  });

  it("should reject malformed or non-numeric status_code and amounts during parsing", async () => {
    await expect(
      provider.parseWebhookEvent(
        new URLSearchParams({
          order_id: "ORD-300",
          status_code: "not_a_number",
          payhere_amount: "100.00",
          payhere_currency: "USD",
        }).toString()
      )
    ).rejects.toThrow(/invalid status_code/);

    await expect(
      provider.parseWebhookEvent(
        new URLSearchParams({
          order_id: "ORD-300",
          status_code: "2",
          payhere_amount: "abc_invalid",
          payhere_currency: "USD",
        }).toString()
      )
    ).rejects.toThrow(/invalid payhere_amount/);
  });
});
