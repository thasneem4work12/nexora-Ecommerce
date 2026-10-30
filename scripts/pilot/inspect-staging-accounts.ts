import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public",
    },
  },
});

async function main() {
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      businessMembers: {
        include: { business: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("=== Staging Test Accounts Overview ===");
  console.log(`Total users found: ${users.length}`);
  users.forEach((u) => {
    console.log(`\nUser: ${u.email}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Businesses: ${u.businessMembers.map((m) => `${m.business.slug} (${m.role})`).join(", ") || "none"}`);
  });

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log("\n=== Staging Businesses ===");
  businesses.forEach((b) => {
    console.log(`- ${b.name} (slug: ${b.slug}, id: ${b.id}, status: ${b.status}, currency: ${b.currency})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
