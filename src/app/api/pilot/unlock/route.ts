import { NextRequest, NextResponse } from "next/server";
import { redeemPilotInvitation } from "@/services/pilot-access.service";
import { PILOT_COOKIE_NAME } from "@/lib/pilot-gate";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const body = await req.json().catch(() => ({}));
    const accessKey = typeof body.accessKey === "string" ? body.accessKey.trim() : "";

    const result = await redeemPilotInvitation({
      rawToken: accessKey,
      ipAddress: ip,
      userAgent,
    });

    if (!result.success || !result.sessionToken) {
      return NextResponse.json(
        { error: result.error || "Invalid or expired pilot access token." },
        { status: result.statusCode || 401 }
      );
    }

    const isHttps =
      req.nextUrl.protocol === "https:" ||
      (process.env.APPROVED_PILOT_HOSTNAME
        ? process.env.APPROVED_PILOT_HOSTNAME.startsWith("https://")
        : false);

    const res = NextResponse.json({
      success: true,
      message: `Pilot access granted. Welcome to NEXORA Commerce Staging${
        result.testerName ? `, ${result.testerName}` : ""
      }.`,
      testerName: result.testerName,
    });

    res.cookies.set({
      name: PILOT_COOKIE_NAME,
      value: result.sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return res;
  } catch (error) {
    console.error("[PilotUnlockAPI] Unexpected failure:", error);
    return NextResponse.json(
      { error: "Authentication system error. Please try again." },
      { status: 500 }
    );
  }
}
