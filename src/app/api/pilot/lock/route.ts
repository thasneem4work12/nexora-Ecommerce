import { NextRequest, NextResponse } from "next/server";
import { PILOT_COOKIE_NAME } from "@/lib/pilot-gate";
import { revokePilotSession } from "@/services/pilot-access.service";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(PILOT_COOKIE_NAME)?.value;
  if (cookie) {
    const parts = cookie.split(".");
    if (parts.length >= 1 && parts[0]) {
      await revokePilotSession(parts[0]).catch(() => null);
    }
  }

  const res = NextResponse.json({
    success: true,
    message: "Pilot session locked. Access revoked.",
  });

  res.cookies.set({
    name: PILOT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
