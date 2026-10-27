import { NextRequest, NextResponse } from "next/server";
import {
  createPilotSessionToken,
  getApprovedPilotKeys,
  PILOT_COOKIE_NAME,
} from "@/lib/pilot-gate";

// In-memory rate limiter for pilot gate attempts (max 5 failed attempts per IP per 5 mins)
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (now > entry.resetAt) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= 5;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = failedAttempts.get(ip) || { count: 0, resetAt: now + 5 * 60 * 1000 };
  entry.count++;
  failedAttempts.set(ip, entry);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many failed unlock attempts. Please wait 5 minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accessKey = typeof body.accessKey === "string" ? body.accessKey.trim() : "";

    const approvedKeys = getApprovedPilotKeys();
    if (!accessKey || !approvedKeys.includes(accessKey)) {
      recordFailure(ip);
      return NextResponse.json(
        { error: "Invalid or expired pilot access token. Please verify your invitation." },
        { status: 401 }
      );
    }

    // Generate signed token
    const token = await createPilotSessionToken(accessKey);
    const isHttps =
      req.nextUrl.protocol === "https:" ||
      (process.env.APPROVED_PILOT_HOSTNAME
        ? process.env.APPROVED_PILOT_HOSTNAME.startsWith("https://")
        : false);

    const res = NextResponse.json({
      success: true,
      message: "Pilot access granted. Welcome to NEXORA Commerce Staging.",
    });

    res.cookies.set({
      name: PILOT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return res;
  } catch (error) {
    console.error("Pilot unlock error:", error);
    return NextResponse.json({ error: "Authentication system error." }, { status: 500 });
  }
}
