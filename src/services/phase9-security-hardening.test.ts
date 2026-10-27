import { describe, it, expect } from "vitest";
import { getSafeCallbackUrl } from "@/lib/redirect-utils";
import { isValidImageSignature } from "@/lib/image-utils";
import { redactSensitiveData, generateCorrelationId } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { processNotificationOutbox } from "@/services/notification.service";
import { getInvoiceById } from "@/services/saas/invoice.service";
import nextConfig from "../../next.config";

describe("NEXORA Commerce — Phase 9 Security Hardening & Observability Suite", () => {
  // =========================================================================
  // TASK 2 & 4: HTTP SECURITY HEADERS & CONTENT SECURITY POLICY (CSP)
  // =========================================================================
  describe("Task 2 & 4 — HTTP Security Headers & Content Security Policy", () => {
    it("configures robust HTTP security headers and CSP in next.config.ts", async () => {
      expect(typeof nextConfig.headers).toBe("function");
      if (nextConfig.headers) {
        const headerConfigs = await nextConfig.headers();
        const rootHeaders = headerConfigs.find((h) => h.source === "/:path*");
        expect(rootHeaders).toBeDefined();

        const headersMap = new Map(rootHeaders!.headers.map((h) => [h.key, h.value]));

        // 1. Content Security Policy
        expect(headersMap.has("Content-Security-Policy")).toBe(true);
        const csp = headersMap.get("Content-Security-Policy")!;
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("frame-src 'self'");
        expect(csp).toContain("frame-ancestors 'self'");
        expect(csp).toContain("object-src 'none'");

        // 2. Clickjacking protection (SAMEORIGIN allows Appearance Studio preview iframe)
        expect(headersMap.get("X-Frame-Options")).toBe("SAMEORIGIN");

        // 3. MIME sniffing defense
        expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");

        // 4. Referrer policy
        expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

        // 5. Permissions policy
        expect(headersMap.get("Permissions-Policy")).toContain("camera=()");

        // 6. XSS Protection
        expect(headersMap.get("X-XSS-Protection")).toBe("1; mode=block");
      }
    });
  });

  // =========================================================================
  // TASK 2: SAFE REDIRECT VALIDATION & OPEN REDIRECT DEFENSE
  // =========================================================================
  describe("Task 2 — Safe Redirect Validation (Open Redirect Defense)", () => {
    it("permits legitimate internal relative paths", () => {
      expect(getSafeCallbackUrl("/admin")).toBe("/admin");
      expect(getSafeCallbackUrl("/admin/billing")).toBe("/admin/billing");
      expect(getSafeCallbackUrl("/account/orders")).toBe("/account/orders");
      expect(getSafeCallbackUrl("/store/apex-kicks")).toBe("/store/apex-kicks");
    });

    it("strictly neutralizes external URLs, protocol-relative paths, and pseudo-schemes", () => {
      // External HTTP/HTTPS
      expect(getSafeCallbackUrl("http://evil-attacker.com")).toBe("/account");
      expect(getSafeCallbackUrl("https://evil-attacker.com/steal-token")).toBe("/account");

      // Protocol-relative URL bypasses
      expect(getSafeCallbackUrl("//evil-attacker.com")).toBe("/account");
      expect(getSafeCallbackUrl("/\\evil-attacker.com")).toBe("/account");

      // JavaScript / data pseudo-protocols
      expect(getSafeCallbackUrl("javascript:alert(1)")).toBe("/account");
      expect(getSafeCallbackUrl("data:text/html,<script>alert(1)</script>")).toBe("/account");

      // Null or empty input
      expect(getSafeCallbackUrl(null)).toBe("/account");
      expect(getSafeCallbackUrl("")).toBe("/account");
    });
  });

  // =========================================================================
  // TASK 4: UNRESTRICTED FILE UPLOAD & MAGIC BYTE VALIDATION
  // =========================================================================
  describe("Task 4 — Unsafe File Upload Defense & Magic Byte Inspection", () => {
    it("validates authentic JPEG, PNG, and WebP byte signatures", () => {
      // Authentic JPEG: FF D8 FF E0
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(isValidImageSignature(jpegBuffer, "image/jpeg")).toBe(true);

      // Authentic PNG: 89 50 4E 47
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      expect(isValidImageSignature(pngBuffer, "image/png")).toBe(true);

      // Authentic WebP: RIFF....WEBP
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      expect(isValidImageSignature(webpBuffer, "image/webp")).toBe(true);
    });

    it("rejects malicious scripts disguised with image MIME types", () => {
      // Disguised PHP script with image/jpeg Content-Type
      const phpScript = Buffer.from("<?php system($_GET['cmd']); ?>");
      expect(isValidImageSignature(phpScript, "image/jpeg")).toBe(false);

      // Disguised HTML/XSS script with image/png Content-Type
      const htmlScript = Buffer.from("<script>alert('xss')</script>");
      expect(isValidImageSignature(htmlScript, "image/png")).toBe(false);

      // Truncated invalid buffer
      const shortBuffer = Buffer.from([0xff, 0xd8]);
      expect(isValidImageSignature(shortBuffer, "image/jpeg")).toBe(false);
    });
  });

  // =========================================================================
  // TASK 12: OBSERVABILITY & SENSITIVE LOG REDACTION
  // =========================================================================
  describe("Task 12 — Structured Logging & Sensitive Data Redaction", () => {
    it("recursively redacts credentials, secrets, and auth tokens from log payloads", () => {
      const sensitivePayload = {
        user: "patron@nexora.luxury",
        password: "SuperSecretPassword123!",
        secret: "webhook_signing_secret_999",
        merchantSecret: "payhere_merchant_secret",
        token: "bearer_eyJhGciOi...",
        authorization: "Bearer eyJhbGciOi...",
        order: {
          id: "ord_123",
          creditCard: "4111222233334444",
          cvv: "999",
          totalInCents: 150000,
        },
      };

      const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;

      expect(redacted.user).toBe("patron@nexora.luxury");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.secret).toBe("[REDACTED]");
      expect(redacted.merchantSecret).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.authorization).toBe("[REDACTED]");

      const nestedOrder = redacted.order as Record<string, unknown>;
      expect(nestedOrder.id).toBe("ord_123");
      expect(nestedOrder.totalInCents).toBe(150000);
      expect(nestedOrder.creditCard).toBe("[REDACTED]");
      expect(nestedOrder.cvv).toBe("[REDACTED]");
    });

    it("generates standard UUIDs for distributed correlation tracing", () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(typeof id1).toBe("string");
      expect(id1.length).toBe(36);
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  // =========================================================================
  // TASK 11: RELIABILITY & NOTIFICATION OUTBOX SWEEPER
  // =========================================================================
  describe("Task 11 — Background Jobs & Outbox Reliability", () => {
    it("sweeps queued transactional notifications and sets delivery status to SENT", async () => {
      // 1. Create a synthetic test notification in QUEUED status
      const testUser = await prisma.user.findFirstOrThrow();
      const notification = await prisma.notification.create({
        data: {
          userId: testUser.id,
          type: "GENERAL",
          title: "Outbox Queue Test",
          message: "Testing outbox worker dispatch",
          deliveryStatus: "QUEUED",
        },
      });

      expect(notification.deliveryStatus).toBe("QUEUED");
      expect(notification.deliveredAt).toBeNull();

      // 2. Run outbox sweeper
      const sweepResult = await processNotificationOutbox(10);
      expect(sweepResult.processed).toBeGreaterThanOrEqual(1);
      expect(sweepResult.succeeded).toBeGreaterThanOrEqual(1);

      // 3. Verify status updated to SENT
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.deliveryStatus).toBe("SENT");
      expect(updated?.deliveredAt).not.toBeNull();

      // Cleanup
      await prisma.notification.delete({ where: { id: notification.id } });
    });
  });

  // =========================================================================
  // TASK 3: CROSS-TENANT IDOR PREVENTIONS
  // =========================================================================
  describe("Task 3 — Cross-Tenant IDOR Invariant Verification", () => {
    it("prevents tenant cross-access when querying invoices by ID without authoritative business context", async () => {
      // Look up an existing invoice
      const existingInvoice = await prisma.saaSInvoice.findFirst();
      if (existingInvoice) {
        // Querying with an unauthorized businessId must return null
        const unauthorizedAttempt = await getInvoiceById(
          existingInvoice.id,
          "unauthorized_fake_business_id"
        );
        expect(unauthorizedAttempt).toBeNull();
      }
    });
  });
});
