import { PrismaClient } from "@prisma/client";
import { auth } from "../../src/lib/auth";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public",
    },
  },
});

async function main() {
  const checkAccounts = [
    { email: "owner@nexoracommerce.com", pass: "NexoraOwner2026!", expectedRole: "OWNER" },
    { email: "superadmin@nexoracommerce.com", pass: "NexoraSuperadmin2026!", expectedRole: "SUPERADMIN" },
    { email: "admin@nexoracommerce.com", pass: "NexoraOwner2026!", expectedRole: "SUPERADMIN" },
    { email: "lumina.manager@test.com", pass: "NexoraOwner2026!", expectedRole: "STAFF" },
    { email: "customer@nexoratest.com", pass: "CustomerPassword123!", expectedRole: "CUSTOMER" },
    { email: "customer.luxury@example.com", pass: "CustomerPassword123!", expectedRole: "CUSTOMER" },
  ];

  console.log("=== Checking User Accounts in Staging DB ===");
  for (const acc of checkAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { accounts: true, businessMembers: { include: { business: true } } },
    });

    if (!user) {
      console.log(`[NOT FOUND] ${acc.email}`);
    } else {
      console.log(`[FOUND] ${acc.email} | Role: ${user.role} | Accounts: ${user.accounts.length}`);
      user.accounts.forEach((a) => {
        console.log(`    provider: ${a.providerId}, hasPassword: ${!!a.password}`);
      });
      console.log(`    Businesses: ${user.businessMembers.map((m) => `${m.business.slug}:${m.role}`).join(", ") || "none"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
