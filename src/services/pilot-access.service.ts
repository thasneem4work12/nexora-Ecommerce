import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  PilotInvitationStatus,
  PilotSessionStatus,
  type PilotInvitation,
  type PilotSession,
} from "@prisma/client";

/**
 * Returns the secret used to sign pilot session cookies.
 */
export function getPilotSigningSecret(): string {
  const secret = process.env.PILOT_GATE_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" || process.env.PILOT_ACCESS_GATE_ENABLED === "true") {
      throw new Error("PILOT_GATE_SECRET or BETTER_AUTH_SECRET must be configured.");
    }
    return "nexora_pilot_ephemeral_dev_fallback_secret_32_chars";
  }
  return secret;
}

/**
 * Computes a SHA-256 hash of a token for secure storage and lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Signs a payload with HMAC-SHA256 using the pilot signing secret.
 */
export function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", getPilotSigningSecret())
    .update(payload)
    .digest("hex");
}

/**
 * Constant-time comparison to defeat timing side-channel attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface CreatePilotInvitationInput {
  testerName: string;
  testerEmail?: string;
  testerRole?: string;
  expiresInHours?: number; // Defaults to 48 hours
  maxRedemptions?: number; // Defaults to 1 (single-use)
  createdBy?: string;
}

/**
 * Creates an individual, revocable pilot access invitation with a hashed token.
 * Returns the raw token ONCE for distribution to the invited tester.
 */
export async function createPilotInvitation(
  input: CreatePilotInvitationInput
): Promise<{ invitation: PilotInvitation; rawToken: string }> {
  // Generate a high-entropy cryptographically random token
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawToken = `nxr_pilot_${randomBytes}`;
  const tokenHash = hashToken(rawToken);

  const expiresInHours = input.expiresInHours ?? 48;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const invitation = await prisma.pilotInvitation.create({
    data: {
      tokenHash,
      testerName: input.testerName,
      testerEmail: input.testerEmail || null,
      testerRole: input.testerRole || "EXTERNAL_TESTER",
      status: PilotInvitationStatus.ACTIVE,
      expiresAt,
      maxRedemptions: input.maxRedemptions ?? 1,
      createdBy: input.createdBy || "system",
    },
  });

  await prisma.pilotAccessAuditLog.create({
    data: {
      invitationId: invitation.id,
      action: "INVITATION_CREATED",
      identifier: invitation.testerName,
      metadata: {
        expiresAt: expiresAt.toISOString(),
        maxRedemptions: invitation.maxRedemptions,
        testerEmail: input.testerEmail ? "[REDACTED]" : null,
      },
    },
  });

  return { invitation, rawToken };
}

export interface RedeemPilotInvitationInput {
  rawToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RedeemPilotResult {
  success: boolean;
  sessionToken?: string;
  expiresAt?: Date;
  testerName?: string;
  error?: string;
  code?: string;
  statusCode: number;
}

/**
 * Redeems an individual pilot invitation with PostgreSQL-backed rate limiting.
 * Implements atomic redemption tracking, token invalidation, and session generation.
 */
export async function redeemPilotInvitation(
  input: RedeemPilotInvitationInput
): Promise<RedeemPilotResult> {
  const ip = input.ipAddress || "127.0.0.1";
  const rateLimitIdentifier = `ip:${ip}`;
  const now = new Date();

  // 1. Check PostgreSQL Persistent Rate Limiting
  const existingRateLimit = await prisma.pilotRateLimit.findUnique({
    where: { identifier: rateLimitIdentifier },
  });

  if (existingRateLimit?.blockedUntil && existingRateLimit.blockedUntil > now) {
    await prisma.pilotAccessAuditLog.create({
      data: {
        action: "UNLOCK_FAILED_RATE_LIMITED",
        identifier: rateLimitIdentifier,
        ipAddress: ip,
        userAgent: input.userAgent || null,
        metadata: { blockedUntil: existingRateLimit.blockedUntil.toISOString() },
      },
    });

    return {
      success: false,
      error: "Too many failed unlock attempts. Please wait 5 minutes before trying again.",
      code: "RATE_LIMITED",
      statusCode: 429,
    };
  }

  const tokenHash = hashToken(input.rawToken || "");

  // 2. Execute Redemption Inside PostgreSQL Transaction
  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.pilotInvitation.findUnique({
        where: { tokenHash },
      });

      const isInvalid =
        !invitation ||
        invitation.status !== PilotInvitationStatus.ACTIVE ||
        invitation.expiresAt <= now ||
        invitation.redemptionCount >= invitation.maxRedemptions;

      if (isInvalid) {
        // Record failed attempt in durable PostgreSQL rate limit table
        const windowMs = 5 * 60 * 1000;
        let shouldBlock = false;
        let blockedUntilDate: Date | null = null;

        const currentLimit = await tx.pilotRateLimit.findUnique({
          where: { identifier: rateLimitIdentifier },
        });

        const isWithinWindow = currentLimit
          ? now.getTime() - currentLimit.firstAttemptAt.getTime() < windowMs
          : false;
        const newCount = currentLimit && isWithinWindow ? currentLimit.failedAttempts + 1 : 1;
        const firstAttempt = currentLimit && isWithinWindow ? currentLimit.firstAttemptAt : now;

        if (newCount >= 5) {
          shouldBlock = true;
          blockedUntilDate = new Date(now.getTime() + windowMs);
        }

        await tx.pilotRateLimit.upsert({
          where: { identifier: rateLimitIdentifier },
          create: {
            identifier: rateLimitIdentifier,
            failedAttempts: 1,
            firstAttemptAt: now,
            lastAttemptAt: now,
            blockedUntil: null,
          },
          update: {
            failedAttempts: newCount,
            firstAttemptAt: firstAttempt,
            lastAttemptAt: now,
            blockedUntil: blockedUntilDate,
          },
        });

        // Audit log failed attempt with generic reason to prevent enumeration
        await tx.pilotAccessAuditLog.create({
          data: {
            action: "UNLOCK_ATTEMPT_FAILED",
            identifier: rateLimitIdentifier,
            ipAddress: ip,
            userAgent: input.userAgent || null,
            metadata: {
              tokenHashPrefix: tokenHash.slice(0, 8),
              blocked: shouldBlock,
            },
          },
        });

        return {
          success: false,
          error: "Invalid or expired pilot access token. Please verify your invitation.",
          code: "INVALID_TOKEN",
          statusCode: 401,
        };
      }

      // Valid Invitation: Reset rate limits for this IP
      if (existingRateLimit) {
        await tx.pilotRateLimit.delete({
          where: { identifier: rateLimitIdentifier },
        });
      }

      // Update Invitation Status
      const nextRedemptionCount = invitation.redemptionCount + 1;
      const isExhausted = nextRedemptionCount >= invitation.maxRedemptions;

      // Atomic concurrency lock: update only if status is ACTIVE and redemptionCount matches
      const updateResult = await tx.pilotInvitation.updateMany({
        where: {
          id: invitation.id,
          status: PilotInvitationStatus.ACTIVE,
          redemptionCount: invitation.redemptionCount,
        },
        data: {
          redemptionCount: nextRedemptionCount,
          status: isExhausted ? PilotInvitationStatus.REDEEMED : PilotInvitationStatus.ACTIVE,
          lastRedeemedAt: now,
          lastRedeemedIp: ip,
        },
      });

      if (updateResult.count === 0) {
        return {
          success: false,
          error: "Invalid or expired pilot access token. Please verify your invitation.",
          code: "INVALID_TOKEN",
          statusCode: 401,
        };
      }

      // Generate Cryptographic Session
      const rawSessionSecret = crypto.randomBytes(32).toString("hex");
      const sessionTokenHash = hashToken(rawSessionSecret);
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await tx.pilotSession.create({
        data: {
          invitationId: invitation.id,
          sessionTokenHash,
          testerName: invitation.testerName,
          ipAddress: ip,
          userAgent: input.userAgent || null,
          status: PilotSessionStatus.ACTIVE,
          expiresAt: sessionExpiresAt,
          lastActiveAt: now,
        },
      });

      // Create signed session cookie value: sessionId.rawSessionSecret.expiresAtMs.signature
      const expiresAtMs = sessionExpiresAt.getTime().toString();
      const sessionPayload = `${session.id}.${rawSessionSecret}.${expiresAtMs}`;
      const signature = signPayload(sessionPayload);
      const sessionCookieValue = `${sessionPayload}.${signature}`;

      // Audit Record
      await tx.pilotAccessAuditLog.create({
        data: {
          invitationId: invitation.id,
          sessionId: session.id,
          action: "INVITATION_REDEEMED",
          identifier: invitation.testerName,
          ipAddress: ip,
          userAgent: input.userAgent || null,
          metadata: {
            redemptionCount: nextRedemptionCount,
            maxRedemptions: invitation.maxRedemptions,
          },
        },
      });

      return {
        success: true,
        sessionToken: sessionCookieValue,
        expiresAt: sessionExpiresAt,
        testerName: invitation.testerName,
        statusCode: 200,
      };
    });
  } catch (error) {
    console.error("[PilotAccessService] Redemption error:", error);
    return {
      success: false,
      error: "Authentication service error. Please try again.",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }
}

/**
 * Validates a pilot session cookie value against cryptographic signature and PostgreSQL state.
 */
export async function verifyPilotSession(
  sessionCookieValue: string
): Promise<{ valid: boolean; session?: PilotSession; error?: string }> {
  try {
    if (!sessionCookieValue) {
      return { valid: false, error: "Missing session token" };
    }

    const parts = sessionCookieValue.split(".");
    if (parts.length !== 4) {
      return { valid: false, error: "Malformed session token" };
    }

    const [sessionId, rawSessionSecret, expiresAtMsStr, signature] = parts;
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
      return { valid: false, error: "Session has expired" };
    }

    const sessionPayload = `${sessionId}.${rawSessionSecret}.${expiresAtMsStr}`;
    const expectedSignature = signPayload(sessionPayload);

    // Cryptographic signature check
    if (!timingSafeEqual(signature, expectedSignature)) {
      return { valid: false, error: "Invalid cryptographic signature" };
    }

    // Database state check
    const session = await prisma.pilotSession.findUnique({
      where: { id: sessionId },
      include: { invitation: true },
    });

    if (!session) {
      return { valid: false, error: "Session record not found" };
    }

    if (session.status !== PilotSessionStatus.ACTIVE) {
      return { valid: false, error: `Session is ${session.status.toLowerCase()}` };
    }

    if (session.expiresAt <= new Date()) {
      return { valid: false, error: "Session has expired" };
    }

    // Verify secret hash matches DB
    const expectedHash = hashToken(rawSessionSecret);
    if (!timingSafeEqual(expectedHash, session.sessionTokenHash)) {
      return { valid: false, error: "Invalid session secret" };
    }

    // Verify parent invitation was not revoked
    if (session.invitation.status === PilotInvitationStatus.REVOKED) {
      return { valid: false, error: "Associated invitation was revoked" };
    }

    return { valid: true, session };
  } catch (err) {
    console.error("[PilotAccessService] verifyPilotSession exception:", err);
    return { valid: false, error: "Session verification exception" };
  }
}

/**
 * Revokes an invitation and immediately revokes all of its active sessions.
 */
export async function revokePilotInvitation(
  invitationId: string,
  reason?: string
): Promise<boolean> {
  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.pilotInvitation.update({
        where: { id: invitationId },
        data: {
          status: PilotInvitationStatus.REVOKED,
          revokedAt: now,
          revokedReason: reason || "Revoked by administrator",
        },
      }),
      prisma.pilotSession.updateMany({
        where: { invitationId, status: PilotSessionStatus.ACTIVE },
        data: {
          status: PilotSessionStatus.REVOKED,
          revokedAt: now,
        },
      }),
      prisma.pilotAccessAuditLog.create({
        data: {
          invitationId,
          action: "INVITATION_REVOKED",
          metadata: { reason: reason || "Manual administrator revocation" },
        },
      }),
    ]);
    return true;
  } catch (error) {
    console.error("[PilotAccessService] Failed to revoke invitation:", error);
    return false;
  }
}

/**
 * Revokes a single pilot session immediately.
 */
export async function revokePilotSession(sessionId: string): Promise<boolean> {
  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.pilotSession.update({
        where: { id: sessionId },
        data: {
          status: PilotSessionStatus.REVOKED,
          revokedAt: now,
        },
      }),
      prisma.pilotAccessAuditLog.create({
        data: {
          sessionId,
          action: "SESSION_REVOKED",
          metadata: { revokedAt: now.toISOString() },
        },
      }),
    ]);
    return true;
  } catch (error) {
    console.error("[PilotAccessService] Failed to revoke session:", error);
    return false;
  }
}

/**
 * Cleans up expired rate-limits and updates expired records.
 */
export async function cleanupExpiredPilotData(): Promise<{
  expiredInvitations: number;
  expiredSessions: number;
  deletedRateLimits: number;
}> {
  const now = new Date();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [invitationsRes, sessionsRes, rateLimitsRes] = await Promise.all([
    prisma.pilotInvitation.updateMany({
      where: {
        status: PilotInvitationStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: { status: PilotInvitationStatus.EXPIRED },
    }),
    prisma.pilotSession.updateMany({
      where: {
        status: PilotSessionStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: { status: PilotSessionStatus.EXPIRED },
    }),
    prisma.pilotRateLimit.deleteMany({
      where: {
        lastAttemptAt: { lte: oneHourAgo },
      },
    }),
  ]);

  return {
    expiredInvitations: invitationsRes.count,
    expiredSessions: sessionsRes.count,
    deletedRateLimits: rateLimitsRes.count,
  };
}
