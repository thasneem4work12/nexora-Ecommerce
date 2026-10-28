import { revokePilotInvitation, revokePilotSession } from "../src/services/pilot-access.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  let invitationId: string | undefined;
  let sessionId: string | undefined;
  let reason = "Manual administrator revocation via CLI";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--invitation" && args[i + 1]) {
      invitationId = args[i + 1];
      i++;
    } else if (args[i] === "--session" && args[i + 1]) {
      sessionId = args[i + 1];
      i++;
    } else if (args[i] === "--reason" && args[i + 1]) {
      reason = args[i + 1];
      i++;
    }
  }

  if (!invitationId && !sessionId) {
    console.error("Usage: npx ts-node scripts/revoke-pilot-invitation.ts [--invitation <id>] [--session <id>] [--reason <reason>]");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log("       NEXORA COMMERCE — REVOKE PILOT ACCESS INVITATION/SESSION   ");
  console.log("==================================================================");

  try {
    if (invitationId) {
      const ok = await revokePilotInvitation(invitationId, reason);
      if (ok) {
        console.log(`\n[SUCCESS] Invitation ${invitationId} and all child sessions revoked.`);
      } else {
        console.error(`\n[FAILED] Failed to revoke invitation ${invitationId}.`);
      }
    }

    if (sessionId) {
      const ok = await revokePilotSession(sessionId);
      if (ok) {
        console.log(`\n[SUCCESS] Session ${sessionId} revoked immediately.`);
      } else {
        console.error(`\n[FAILED] Failed to revoke session ${sessionId}.`);
      }
    }
  } catch (error) {
    console.error("\n[ERROR] Revocation error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
