import { NextRequest } from "next/server";

export const PILOT_COOKIE_NAME = "nexora_pilot_session";

/**
 * Returns the secret used to sign pilot session cookies.
 * Fails closed if not configured in production or when gate is active.
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
 * Native Edge/Node Web Crypto HMAC-SHA256 signature generator.
 */
export async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Creates a cryptographically signed pilot session cookie value (for testing / session issuance).
 * Structure: sessionId.rawSessionSecret.expiresAtMs.signature
 */
export async function createPilotSessionToken(
  sessionId = "pilot_sess_demo_uuid",
  rawSessionSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  expiresInMs = 24 * 60 * 60 * 1000
): Promise<string> {
  const expiresAtMs = (Date.now() + expiresInMs).toString();
  const sessionPayload = `${sessionId}.${rawSessionSecret}.${expiresAtMs}`;
  const signature = await hmacSha256(getPilotSigningSecret(), sessionPayload);
  return `${sessionPayload}.${signature}`;
}

/**
 * Verifies the pilot session cookie in Edge Middleware.
 * Validates token format, expiration, and cryptographic HMAC signature.
 * Authoritative database checks (revocation/status) are performed by Node API services.
 */
export async function verifyPilotSessionToken(token: string): Promise<boolean> {
  try {
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 4) return false;

    const [sessionId, rawSessionSecret, expiresAtMsStr, signature] = parts;
    if (!sessionId || !rawSessionSecret || !expiresAtMsStr || !signature) {
      return false;
    }

    // Check expiration timestamp
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
      return false;
    }

    // Verify cryptographic signature using constant-time comparison
    const sessionPayload = `${sessionId}.${rawSessionSecret}.${expiresAtMsStr}`;
    const expectedSignature = await hmacSha256(getPilotSigningSecret(), sessionPayload);

    return timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Validates the Host header against localhost and APPROVED_PILOT_HOSTNAME.
 * Enforces strict fail-closed origin policy.
 */
export function validateHostHeader(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const cleanHost = host.split(":")[0]?.toLowerCase();

  if (!cleanHost) return false;

  // Always allow localhost and loopback
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(cleanHost)) {
    return true;
  }

  // If approved pilot hostname is configured, check exact match
  const approved = process.env.APPROVED_PILOT_HOSTNAME;
  if (approved) {
    try {
      const approvedUrl = new URL(approved);
      const approvedHost = approvedUrl.hostname.toLowerCase();
      if (cleanHost === approvedHost) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // If running in development mode without pilot gate, allow local IPs
  if (process.env.NODE_ENV !== "production" && process.env.PILOT_ACCESS_GATE_ENABLED !== "true") {
    return true;
  }

  return false;
}
