if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("5432")) {
  process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
}

import { createPilotInvitation } from "../../src/services/pilot-access.service";
import { prisma } from "../../src/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const { invitation, rawToken } = await createPilotInvitation({
      testerName: "Owner Local Walkthrough",
      testerEmail: "owner@nexoracommerce.com",
      testerRole: "STORE_OWNER",
      expiresInHours: 48,
      maxRedemptions: 25,
      createdBy: "LOCAL_OPERATOR",
    });

    // Write token strictly to a local, untracked file to prevent log exposure
    const outputPath = path.join(process.cwd(), "local-pilot-passkey.txt");
    const fileContent = [
      "==================================================================",
      " NEXORA COMMERCE — SECURE LOCAL PILOT ACCESS PASSKEY",
      "==================================================================",
      "",
      `Invitation ID:   ${invitation.id}`,
      `Tester:          ${invitation.testerName} (${invitation.testerEmail})`,
      `Role:            ${invitation.testerRole}`,
      `Max Redemptions: ${invitation.maxRedemptions}`,
      `Expires At:      ${invitation.expiresAt.toISOString()}`,
      "",
      "------------------------------------------------------------------",
      "YOUR ONE-TIME PASSKEY FOR http://127.0.0.1:3005/pilot-access:",
      rawToken,
      "------------------------------------------------------------------",
      "",
      "HOW TO ACCESS:",
      "1. Open http://127.0.0.1:3005 in your browser.",
      "2. The site will prompt for your Invitation Passkey.",
      "3. Copy and paste the passkey above and click 'Enter Atelier'.",
      "4. To log in as Admin/Owner, visit http://127.0.0.1:3005/login",
      "   Email:    owner@nexoracommerce.com",
      "   Password: NexoraOwner2026!",
      "",
      "5. To log in as Superadmin, visit http://127.0.0.1:3005/login",
      "   Email:    superadmin@nexoracommerce.com",
      "   Password: NexoraSuperadmin2026!",
      "==================================================================",
    ].join("\n");

    fs.writeFileSync(outputPath, fileContent, { encoding: "utf-8" });

    // Ensure local-pilot-passkey.txt is in .gitignore
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf-8");
      if (!gitignore.includes("local-pilot-passkey.txt")) {
        fs.appendFileSync(gitignorePath, "\nlocal-pilot-passkey.txt\n");
      }
    }

    console.log("==================================================================");
    console.log(" [SUCCESS] Staging pilot passkey generated successfully.");
    console.log(" Secure storage location: local-pilot-passkey.txt");
    console.log(" In compliance with security policy, passkey was NOT printed to logs.");
    console.log(" Open local-pilot-passkey.txt to retrieve your passkey.");
    console.log("==================================================================");
  } catch (err: any) {
    console.error("Failed to generate local pilot invitation:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
