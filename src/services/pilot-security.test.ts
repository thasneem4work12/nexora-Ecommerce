import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPilotSessionToken,
  verifyPilotSessionToken,
  validateHostHeader,
  getApprovedPilotKeys,
  hmacSha256,
} from "@/lib/pilot-gate";
import { maskEmail } from "@/services/notification.service";
import { envSchema } from "@/lib/env-validator";
import { NextRequest } from "next/server";

describe("Pilot Security & Gating Infrastructure", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.PILOT_ACCESS_KEYS = "pilot_luxury_demo_2026,pilot_partner_tech_2026";
    process.env.PILOT_GATE_SECRET = "test_super_secret_signing_key_32_characters_minimum";
    process.env.APPROVED_PILOT_HOSTNAME = "https://staging-pilot-demo.trycloudflare.com";
    process.env.PILOT_ACCESS_GATE_ENABLED = "true";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Pilot Access Token Generation & Verification", () => {
    it("should generate and verify valid session token for approved key", async () => {
      const approvedKeys = getApprovedPilotKeys();
      expect(approvedKeys).toContain("pilot_luxury_demo_2026");

      const token = await createPilotSessionToken("pilot_luxury_demo_2026");
      expect(typeof token).toBe("string");
      expect(token.includes(".")).toBe(true);

      const isValid = await verifyPilotSessionToken(token);
      expect(isValid).toBe(true);
    });

    it("should reject token with an unauthorized key", async () => {
      const invalidToken = await createPilotSessionToken("unapproved_hacker_token");
      const isValid = await verifyPilotSessionToken(invalidToken);
      expect(isValid).toBe(false);
    });

    it("should reject tampered token signatures", async () => {
      const validToken = await createPilotSessionToken("pilot_luxury_demo_2026");
      const [payload, signature] = validToken.split(".");
      
      // Tamper signature by altering last character
      const tamperedSignature = signature.slice(0, -1) + (signature.slice(-1) === "a" ? "b" : "a");
      const tamperedToken = `${payload}.${tamperedSignature}`;

      expect(await verifyPilotSessionToken(tamperedToken)).toBe(false);
    });

    it("should reject tokens with tampered payloads", async () => {
      const validToken = await createPilotSessionToken("pilot_luxury_demo_2026");
      const [, signature] = validToken.split(".");
      
      // Forge a new payload with unauthorized key but keep signature
      const fakePayload = Buffer.from(`hacker_key:${Date.now()}`).toString("base64url");
      const fakeToken = `${fakePayload}.${signature}`;

      expect(await verifyPilotSessionToken(fakeToken)).toBe(false);
    });

    it("should reject expired tokens older than 24 hours", async () => {
      // Create token timestamped 25 hours ago
      const key = "pilot_luxury_demo_2026";
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      const payload = `${key}:${oldTimestamp}`;
      const signature = await hmacSha256(process.env.PILOT_GATE_SECRET || "default", payload);
      const expiredToken = `${Buffer.from(payload).toString("base64url")}.${signature}`;

      expect(await verifyPilotSessionToken(expiredToken)).toBe(false);
    });
  });

  describe("Host Header Validation & Origin Protection", () => {
    it("should allow standard localhost and loopback requests", () => {
      const localReq = new NextRequest("http://localhost:3005/api/health", {
        headers: { host: "localhost:3005" },
      });
      expect(validateHostHeader(localReq)).toBe(true);

      const ipReq = new NextRequest("http://127.0.0.1:3005/api/health", {
        headers: { host: "127.0.0.1:3005" },
      });
      expect(validateHostHeader(ipReq)).toBe(true);
    });

    it("should allow requests matching the exact APPROVED_PILOT_HOSTNAME", () => {
      const validReq = new NextRequest("https://staging-pilot-demo.trycloudflare.com/catalog", {
        headers: {
          host: "staging-pilot-demo.trycloudflare.com",
          "x-forwarded-host": "staging-pilot-demo.trycloudflare.com",
        },
      });
      expect(validateHostHeader(validReq)).toBe(true);
    });

    it("should strictly reject requests with unapproved or spoofed host headers", () => {
      const spoofedReq = new NextRequest("https://staging-pilot-demo.trycloudflare.com/catalog", {
        headers: {
          host: "attacker-phishing-domain.com",
        },
      });
      expect(validateHostHeader(spoofedReq)).toBe(false);

      const subDomainAttackReq = new NextRequest("https://staging-pilot-demo.trycloudflare.com/catalog", {
        headers: {
          host: "evil.staging-pilot-demo.trycloudflare.com",
        },
      });
      expect(validateHostHeader(subDomainAttackReq)).toBe(false);
    });

    it("should reject arbitrary Cloudflare tunnel subdomains that do not match APPROVED_PILOT_HOSTNAME", () => {
      const otherTunnelReq = new NextRequest("https://different-tunnel.trycloudflare.com/catalog", {
        headers: {
          host: "different-tunnel.trycloudflare.com",
        },
      });
      expect(validateHostHeader(otherTunnelReq)).toBe(false);
    });
  });

  describe("Email PII Masking & Safe Logging", () => {
    it("should redact email local parts to prevent log leakage", () => {
      expect(maskEmail("john.doe@example.com")).toBe("jo***e@example.com");
      expect(maskEmail("client@luxury.atelier")).toBe("cl***t@luxury.atelier");
    });

    it("should handle short email names safely", () => {
      expect(maskEmail("ab@domain.com")).toBe("a*@domain.com");
      expect(maskEmail("a@domain.com")).toBe("a*@domain.com");
    });

    it("should handle null or invalid email inputs gracefully without throwing", () => {
      expect(maskEmail(null)).toBe("anonymous@example.com");
      expect(maskEmail(undefined)).toBe("anonymous@example.com");
      expect(maskEmail("not-an-email")).toBe("[INVALID_EMAIL]");
    });
  });

  describe("Environment Configuration Validator Integrity", () => {
    it("should reject wildcard in APPROVED_PILOT_HOSTNAME", () => {
      const invalidConfig = {
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        BETTER_AUTH_SECRET: "a_very_secret_key_at_least_32_chars_long",
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        APPROVED_PILOT_HOSTNAME: "https://*.trycloudflare.com",
      };

      const result = envSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.errors.some((e) =>
            e.message.includes("must not contain wildcards (*)")
          )
        ).toBe(true);
      }
    });

    it("should accept valid HTTPS tunnel URL in APPROVED_PILOT_HOSTNAME", () => {
      const validConfig = {
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        BETTER_AUTH_SECRET: "a_very_secret_key_at_least_32_chars_long",
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        APPROVED_PILOT_HOSTNAME: "https://nexora-test-tunnel.trycloudflare.com",
      };

      const result = envSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
  });
});
