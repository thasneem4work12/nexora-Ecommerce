import { NextRequest, NextResponse } from "next/server";
import { PILOT_COOKIE_NAME } from "@/lib/pilot-gate";
import { verifyPilotSession } from "@/services/pilot-access.service";

export async function GET(req: NextRequest) {
  const isGateEnabled = process.env.PILOT_ACCESS_GATE_ENABLED === "true";
  const cookie = req.cookies.get(PILOT_COOKIE_NAME)?.value;

  let isUnlocked = true;
  let testerName: string | undefined;

  if (isGateEnabled) {
    if (!cookie) {
      isUnlocked = false;
    } else {
      const verification = await verifyPilotSession(cookie);
      isUnlocked = verification.valid;
      testerName = verification.session?.testerName;
    }
  }

  return NextResponse.json({
    gateEnabled: isGateEnabled,
    isUnlocked,
    testerName,
    approvedHostnameConfigured: !!process.env.APPROVED_PILOT_HOSTNAME,
  });
}
