import { createPilotInvitation } from "../src/services/pilot-access.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  let testerName = "";
  let testerEmail: string | undefined;
  let testerRole = "EXTERNAL_TESTER";
  let expiresInHours = 48;
  let maxRedemptions = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      testerName = args[i + 1];
      i++;
    } else if (args[i] === "--email" && args[i + 1]) {
      testerEmail = args[i + 1];
      i++;
    } else if (args[i] === "--role" && args[i + 1]) {
      testerRole = args[i + 1];
      i++;
    } else if (args[i] === "--hours" && args[i + 1]) {
      expiresInHours = parseInt(args[i + 1], 10) || 48;
      i++;
    } else if (args[i] === "--redemptions" && args[i + 1]) {
      maxRedemptions = parseInt(args[i + 1], 10) || 1;
      i++;
    }
  }

  if (!testerName) {
    console.error("Usage: npx ts-node scripts/create-pilot-invitation.ts --name <Tester Name> [--email <Email>] [--hours <Hours>] [--redemptions <Count>]");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log("       NEXORA COMMERCE — CREATE INDIVIDUAL PILOT INVITATION       ");
  console.log("==================================================================");

  try {
    const { invitation, rawToken } = await createPilotInvitation({
      testerName,
      testerEmail,
      testerRole,
      expiresInHours,
      maxRedemptions,
      createdBy: "CLI_OPERATOR",
    });

    console.log("\n[SUCCESS] Individual pilot invitation generated:\n");
    console.log(`  Invitation ID:   ${invitation.id}`);
    console.log(`  Tester Name:     ${invitation.testerName}`);
    console.log(`  Tester Email:    ${invitation.testerEmail || "(none)"}`);
    console.log(`  Tester Role:     ${invitation.testerRole}`);
    console.log(`  Max Redemptions: ${invitation.maxRedemptions} (Single-use)`);
    console.log(`  Expires At:      ${invitation.expiresAt.toISOString()}`);
    console.log("\n------------------------------------------------------------------");
    console.log("  ONE-TIME INVITATION TOKEN (Distribute securely to tester):");
    console.log(`  ${rawToken}`);
    console.log("------------------------------------------------------------------");
    console.log("  NOTE: Token hash is securely stored in PostgreSQL (SHA-256).");
    console.log("  Raw token cannot be retrieved again.\n");
  } catch (error) {
    console.error("\n[ERROR] Failed to create invitation:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
