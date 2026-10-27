import { NextRequest } from "next/server";

export const PILOT_COOKIE_NAME = "nexora_pilot_session";

/**
 * Returns the secret used to sign pilot session cookies.
 */
function getPilotSigningSecret(): string {
  return (
    process.env.PILOT_GATE_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "nexora_pilot_fallback_signing_secret_at_least_32_characters"
  );
}

/**
 * Parses and returns the list of approved pilot invitation tokens.
 */
export function getApprovedPilotKeys(): string[] {
  const raw = process.env.PILOT_ACCESS_KEYS || "pilot_luxury_demo_2026,pilot_partner_tech_2026";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
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
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

/**
 * Creates a cryptographically signed pilot session cookie value.
 */
export async function createPilotSessionToken(key: string): Promise<string> {
  const timestamp = Date.now();
  const payload = `${key}:${timestamp}`;
  const signature = await hmacSha256(getPilotSigningSecret(), payload);
  return `${base64UrlEncode(payload)}.${signature}`;
}

/**
 * Verifies the pilot session cookie. Returns true if valid and key is currently approved.
 */
export async function verifyPilotSessionToken(token: string): Promise<boolean> {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return false;

    const payload = base64UrlDecode(encodedPayload);
    const [key, timestampStr] = payload.split(":");
    if (!key || !timestampStr) return false;

    // Verify cryptographic signature using timing-safe comparison
    const expectedSignature = await hmacSha256(getPilotSigningSecret(), payload);

    if (!timingSafeEqual(signature, expectedSignature)) {
      return false;
    }

    // Verify token age: max 24 hours
    const timestamp = parseInt(timestampStr, 10);
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAgeMs) {
      return false;
    }

    // Verify key is still in the active approved list (allows instant revocation)
    const approvedKeys = getApprovedPilotKeys();
    return approvedKeys.includes(key);
  } catch {
    return false;
  }
}

/**
 * Validates the Host header against localhost and APPROVED_PILOT_HOSTNAME.
 */
export function validateHostHeader(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const cleanHost = host.split(":")[0]?.toLowerCase();

  // Always allow localhost and loopback
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(cleanHost)) {
    return true;
  }

  // If approved pilot hostname is configured, check match
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

  // If running in development/local test mode without pilot gate, allow local IPs
  if (process.env.NODE_ENV !== "production" && process.env.PILOT_ACCESS_GATE_ENABLED !== "true") {
    return true;
  }

  return false;
}
