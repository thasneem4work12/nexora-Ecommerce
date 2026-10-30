if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("5432")) {
  process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
}

import { prisma } from "../src/lib/prisma";
import { createPilotInvitation } from "../src/services/pilot-access.service";
import fs from "fs";
import path from "path";

async function setup() {
  const authDir = path.join(process.cwd(), "playwright", ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create an invitation with multiple redemptions for test suites
  const { rawToken } = await createPilotInvitation({
    testerName: "Playwright Automated Test Runner",
    testerEmail: "playwright.runner@synthetic-pilot.local",
    testerRole: "E2E_AUTOMATION",
    expiresInHours: 48,
    maxRedemptions: 1000,
    createdBy: "PLAYWRIGHT_SETUP",
  });

  // Redeem token via staging API
  const unlockRes = await fetch("http://localhost:3005/api/pilot/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey: rawToken }),
  });

  const setCookie = unlockRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/nexora_pilot_session=([^;]+)/);
  if (!cookieMatch) {
    throw new Error(`Failed to unlock pilot gate: ${await unlockRes.text()}`);
  }

  const token = cookieMatch[1];
  const storageState = {
    cookies: [
      {
        name: "nexora_pilot_session",
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };

  const statePath = path.join(authDir, "pilot-session.json");
  fs.writeFileSync(statePath, JSON.stringify(storageState, null, 2));
  console.log(`[Playwright Setup] Pilot session saved to ${statePath}`);
}

setup()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
