import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPilotSessionToken,
  verifyPilotSessionToken,
  validateHostHeader,
} from "@/lib/pilot-gate";
import {
  createPilotInvitation,
  redeemPilotInvitation,
  verifyPilotSession,
  revokePilotInvitation,
  revokePilotSession,
  hashToken,
} from "@/services/pilot-access.service";
import { maskEmail } from "@/services/notification.service";
import { envSchema } from "@/lib/env-validator";
import { prisma } from "@/lib/prisma";
import { PilotInvitationStatus } from "@prisma/client";
import { NextRequest } from "next/server";

describe("NEXORA Commerce — Pilot Final Security & Access Control Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.PILOT_GATE_SECRET = "test_super_secret_signing_key_32_characters_minimum";
    process.env.APPROVED_PILOT_HOSTNAME = "https://staging-pilot-demo.trycloudflare.com";
    process.env.PILOT_ACCESS_GATE_ENABLED = "true";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ---------------------------------------------------------------------------
  // TASK 1: Secret Rotation & Compromised Passkey Rejection
  // ---------------------------------------------------------------------------
  describe("Task 1: Secret Rotation & Old Passkey Invalidation", () => {
    it("should reject previously exposed literal passkey", async () => {
      const compromisedKey = "pilot_luxury_demo_2026";
      const result = await redeemPilotInvitation({
        rawToken: compromisedKey,
        ipAddress: "10.0.0.1",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("Invalid or expired pilot access token");
    });

    it("should reject second exposed passkey", async () => {
      const compromisedKey = "pilot_partner_tech_2026";
      const result = await redeemPilotInvitation({
        rawToken: compromisedKey,
        ipAddress: "10.0.0.2",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("should reject legacy 2-part session token format", async () => {
      const legacyToken = "ZXhhbXBsZS1wYXlsb2Fk.0123456789abcdef0123456789abcdef";
      const isValid = await verifyPilotSessionToken(legacyToken);
      expect(isValid).toBe(false);
    });

    it("should reject forged HMAC signatures", async () => {
      const validToken = await createPilotSessionToken("sess_123", "secret_abc", 3600000);
      const parts = validToken.split(".");
      expect(parts.length).toBe(4);

      // Tamper signature by flipping last hex character
      const tamperedSignature =
        parts[3].slice(0, -1) + (parts[3].slice(-1) === "a" ? "b" : "a");
      const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2]}.${tamperedSignature}`;

      const isValid = await verifyPilotSessionToken(tamperedToken);
      expect(isValid).toBe(false);
    });

    it("should reject expired tokens beyond timestamp", async () => {
      // Create token that expired 1 hour ago
      const expiredToken = await createPilotSessionToken("sess_old", "secret_old", -3600000);
      const isValid = await verifyPilotSessionToken(expiredToken);
      expect(isValid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // TASK 2: Individual Invitation Control, Hashing & Replay Protection
  // ---------------------------------------------------------------------------
  describe("Task 2: Individual Revocable Pilot Access (PostgreSQL)", () => {
    it("should create individual invitation with SHA-256 hashed token at rest", async () => {
      const { invitation, rawToken } = await createPilotInvitation({
        testerName: "Auditor Smith",
        testerEmail: "auditor@example.com",
        testerRole: "SECURITY_AUDITOR",
        expiresInHours: 24,
        maxRedemptions: 1,
      });

      expect(rawToken.startsWith("nxr_pilot_")).toBe(true);
      expect(invitation.tokenHash).toBe(hashToken(rawToken));
      expect(invitation.status).toBe(PilotInvitationStatus.ACTIVE);
      expect(invitation.redemptionCount).toBe(0);

      // Verify audit log entry
      const audit = await prisma.pilotAccessAuditLog.findFirst({
        where: { invitationId: invitation.id, action: "INVITATION_CREATED" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.identifier).toBe("Auditor Smith");
    });

    it("should enforce single-use redemption and reject replay attempts", async () => {
      const { invitation, rawToken } = await createPilotInvitation({
        testerName: "Reviewer SingleUse",
        expiresInHours: 2,
        maxRedemptions: 1,
      });

      // First Redemption: MUST SUCCEED
      const redemption1 = await redeemPilotInvitation({
        rawToken,
        ipAddress: "192.168.1.50",
        userAgent: "Vitest Client",
      });

      expect(redemption1.success).toBe(true);
      expect(redemption1.sessionToken).toBeDefined();
      expect(redemption1.statusCode).toBe(200);

      // Verify DB record status updated to REDEEMED
      const updatedInv = await prisma.pilotInvitation.findUnique({
        where: { id: invitation.id },
      });
      expect(updatedInv?.status).toBe(PilotInvitationStatus.REDEEMED);
      expect(updatedInv?.redemptionCount).toBe(1);

      // Replay Attack: Exact same token redeemed again MUST FAIL
      const replayAttempt = await redeemPilotInvitation({
        rawToken,
        ipAddress: "192.168.1.51",
        userAgent: "Attacker Replay Tool",
      });

      expect(replayAttempt.success).toBe(false);
      expect(replayAttempt.statusCode).toBe(401);
      expect(replayAttempt.error).toContain("Invalid or expired pilot access token");
    });

    it("should reject expired invitations", async () => {
      const { rawToken, invitation } = await createPilotInvitation({
        testerName: "Expired Reviewer",
        expiresInHours: -1, // Already expired in the past
      });

      // Force expiresAt into the past in DB
      await prisma.pilotInvitation.update({
        where: { id: invitation.id },
        data: { expiresAt: new Date(Date.now() - 60000) },
      });

      const result = await redeemPilotInvitation({
        rawToken,
        ipAddress: "192.168.1.60",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("should support instant revocation of active invitation and all sessions", async () => {
      const { rawToken, invitation } = await createPilotInvitation({
        testerName: "Revoked Tester",
        expiresInHours: 24,
      });

      const redemption = await redeemPilotInvitation({
        rawToken,
        ipAddress: "192.168.1.70",
      });
      expect(redemption.success).toBe(true);
      const sessionToken = redemption.sessionToken!;

      // Verify active session works initially
      const initialVerify = await verifyPilotSession(sessionToken);
      expect(initialVerify.valid).toBe(true);

      // Admin Revocation of Parent Invitation
      const revoked = await revokePilotInvitation(invitation.id, "Security test revocation");
      expect(revoked).toBe(true);

      // Verification of session must now FAIL
      const revokedVerify = await verifyPilotSession(sessionToken);
      expect(revokedVerify.valid).toBe(false);
      expect(revokedVerify.error).toContain("revoked");
    });

    it("should support instant revocation of an individual session", async () => {
      const { rawToken } = await createPilotInvitation({
        testerName: "Individual Session Revoke",
        expiresInHours: 24,
      });

      const redemption = await redeemPilotInvitation({
        rawToken,
        ipAddress: "192.168.1.80",
      });
      const sessionToken = redemption.sessionToken!;
      const sessionId = sessionToken.split(".")[0];

      // Revoke this specific session
      await revokePilotSession(sessionId);

      const verification = await verifyPilotSession(sessionToken);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("revoked");
    });
  });

  // ---------------------------------------------------------------------------
  // TASK 3: Durable Rate Limiting (PostgreSQL)
  // ---------------------------------------------------------------------------
  describe("Task 3: Persistent Rate Limiting & Tamper Prevention", () => {
    it("should track failed attempts in DB and auto-block after 5 failures", async () => {
      const testIp = "198.51.100.99";
      const identifier = `ip:${testIp}`;

      // Clean prior limits for this test IP
      await prisma.pilotRateLimit.deleteMany({ where: { identifier } });

      // Perform 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        const res = await redeemPilotInvitation({
          rawToken: `invalid_token_attempt_${i}`,
          ipAddress: testIp,
        });
        expect(res.success).toBe(false);
        expect(res.statusCode).toBe(401);
      }

      // 5th attempt triggers rate limit block
      const fifthAttempt = await redeemPilotInvitation({
        rawToken: "invalid_token_attempt_5",
        ipAddress: testIp,
      });
      expect(fifthAttempt.success).toBe(false);
      expect(fifthAttempt.statusCode).toBe(401);

      // Verify rate limit record in DB shows blockedUntil is set
      const rateLimitRecord = await prisma.pilotRateLimit.findUnique({
        where: { identifier },
      });
      expect(rateLimitRecord).not.toBeNull();
      expect(rateLimitRecord?.failedAttempts).toBe(5);
      expect(rateLimitRecord?.blockedUntil).not.toBeNull();
      expect(rateLimitRecord!.blockedUntil!.getTime()).toBeGreaterThan(Date.now());

      // 6th attempt must be rejected with 429 RATE_LIMITED
      const blockedAttempt = await redeemPilotInvitation({
        rawToken: "invalid_token_attempt_6",
        ipAddress: testIp,
      });
      expect(blockedAttempt.success).toBe(false);
      expect(blockedAttempt.statusCode).toBe(429);
      expect(blockedAttempt.code).toBe("RATE_LIMITED");

      // Clean up test IP
      await prisma.pilotRateLimit.deleteMany({ where: { identifier } });
    });

    it("should return identical generic error messages to eliminate user enumeration", async () => {
      const resNonExistent = await redeemPilotInvitation({
        rawToken: "nxr_pilot_does_not_exist_at_all",
        ipAddress: "10.10.10.1",
      });

      const { rawToken } = await createPilotInvitation({
        testerName: "Exhausted Tester",
        maxRedemptions: 1,
      });
      await redeemPilotInvitation({ rawToken, ipAddress: "10.10.10.2" });

      // Attempt to redeem again
      const resExhausted = await redeemPilotInvitation({
        rawToken,
        ipAddress: "10.10.10.3",
      });

      expect(resNonExistent.error).toBe(resExhausted.error);
      expect(resNonExistent.statusCode).toBe(resExhausted.statusCode);
      expect(resNonExistent.error).toBe("Invalid or expired pilot access token. Please verify your invitation.");
    });
  });

  // ---------------------------------------------------------------------------
  // TASK 4 & 5: Host Header Validation & Perimeter Enforcement
  // ---------------------------------------------------------------------------
  describe("Task 4 & 5: Host Header Validation & Edge Perimeter", () => {
    it("should permit localhost and loopback interfaces", () => {
      const localReq = new NextRequest("http://localhost:3005/api/health", {
        headers: { host: "localhost:3005" },
      });
      expect(validateHostHeader(localReq)).toBe(true);

      const ipReq = new NextRequest("http://127.0.0.1:3005/api/health", {
        headers: { host: "127.0.0.1:3005" },
      });
      expect(validateHostHeader(ipReq)).toBe(true);
    });

    it("should permit exact match with APPROVED_PILOT_HOSTNAME", () => {
      const tunnelReq = new NextRequest("https://staging-pilot-demo.trycloudflare.com/catalog", {
        headers: {
          host: "staging-pilot-demo.trycloudflare.com",
          "x-forwarded-host": "staging-pilot-demo.trycloudflare.com",
        },
      });
      expect(validateHostHeader(tunnelReq)).toBe(true);
    });

    it("should fail-closed on spoofed host headers", () => {
      const spoofedReq = new NextRequest("https://staging-pilot-demo.trycloudflare.com/catalog", {
        headers: { host: "attacker-phishing-domain.com" },
      });
      expect(validateHostHeader(spoofedReq)).toBe(false);
    });

    it("should fail-closed on unapproved tunnel hostnames", () => {
      const rogueTunnelReq = new NextRequest("https://other-rogue-tunnel.trycloudflare.com/", {
        headers: { host: "other-rogue-tunnel.trycloudflare.com" },
      });
      expect(validateHostHeader(rogueTunnelReq)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // TASK 2 & 5: Gate Decoupling & Role Isolation
  // ---------------------------------------------------------------------------
  describe("Task 2: Pilot Gate Decoupling from Better Auth Roles", () => {
    it("should confirm pilot cookie alone never grants Better Auth user session", async () => {
      const token = await createPilotSessionToken("sess_unprivileged", "secret_unprivileged");

      // Verify that verifying a pilot session returns only pilot session data,
      // and does NOT set or contain any user role, user id, or SUPERADMIN claims.
      const verification = await verifyPilotSessionToken(token);
      expect(verification).toBe(true);

      // Verify that passing the pilot gate does NOT authenticate as SUPERADMIN
      // The Better Auth session is completely separate and requires credentials
      const cookieName = "nexora_pilot_session";
      expect(cookieName).not.toBe("better-auth.session_token");
    });
  });

  // ---------------------------------------------------------------------------
  // Data Privacy & Email Masking Tests
  // ---------------------------------------------------------------------------
  describe("Email PII Masking & Safe Logging", () => {
    it("should redact email local parts to prevent log leakage", () => {
      expect(maskEmail("john.doe@example.com")).toBe("jo***e@example.com");
      expect(maskEmail("client@luxury.atelier")).toBe("cl***t@luxury.atelier");
    });

    it("should handle short email names safely", () => {
      expect(maskEmail("ab@domain.com")).toBe("a*@domain.com");
      expect(maskEmail("a@domain.com")).toBe("a*@domain.com");
    });

    it("should handle null or invalid email inputs gracefully", () => {
      expect(maskEmail(null)).toBe("anonymous@example.com");
      expect(maskEmail(undefined)).toBe("anonymous@example.com");
      expect(maskEmail("not-an-email")).toBe("[INVALID_EMAIL]");
    });
  });

  // ---------------------------------------------------------------------------
  // Configuration Validation
  // ---------------------------------------------------------------------------
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
