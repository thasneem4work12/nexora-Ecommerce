import { NextRequest, NextResponse } from "next/server";
import { PILOT_COOKIE_NAME, verifyPilotSessionToken } from "@/lib/pilot-gate";

export async function GET(req: NextRequest) {
  const isGateEnabled = process.env.PILOT_ACCESS_GATE_ENABLED === "true";
  const cookie = req.cookies.get(PILOT_COOKIE_NAME)?.value;
  const isUnlocked = isGateEnabled ? (cookie ? await verifyPilotSessionToken(cookie) : false) : true;

  return NextResponse.json({
    gateEnabled: isGateEnabled,
    isUnlocked,
    approvedHostnameConfigured: !!process.env.APPROVED_PILOT_HOSTNAME,
  });
}
