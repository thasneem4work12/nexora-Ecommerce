import { PrismaClient } from "@prisma/client";
import { hashToken } from "../../src/services/pilot-access.service";
import fs from "fs";

const keyFile = fs.readFileSync("local-pilot-passkey.txt", "utf-8");
const match = keyFile.match(/nxr_pilot_[a-f0-9]+/);
const rawToken = match ? match[0] : "";
const tokenHash = hashToken(rawToken);

console.log("Token:", rawToken);
console.log("Hash:", tokenHash);

const prisma5432 = new PrismaClient({
  datasources: { db: { url: "postgresql://nexora:nexora_password@localhost:5432/nexora_db?schema=public" } }
});

const prisma5433 = new PrismaClient({
  datasources: { db: { url: "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public" } }
});

async function main() {
  const in5432 = await prisma5432.pilotInvitation.findUnique({ where: { tokenHash } }).catch(e => e.message);
  const in5433 = await prisma5433.pilotInvitation.findUnique({ where: { tokenHash } }).catch(e => e.message);

  console.log("Found in 5432 (dev db):", in5432 ? "YES" : "NO");
  console.log("Found in 5433 (staging db):", in5433 ? "YES" : "NO");
}

main().finally(async () => {
  await prisma5432.$disconnect();
  await prisma5433.$disconnect();
});
