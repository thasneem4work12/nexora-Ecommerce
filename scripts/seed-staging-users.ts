import { PrismaClient } from "@prisma/client";

const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexora:nexora_password@localhost:5432/nexora_db?schema=public",
    },
  },
});

const stagingPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public",
    },
  },
});

async function main() {
  console.log("=== Syncing Seed Users & Accounts from Dev DB to Staging DB ===");

  const users = await devPrisma.user.findMany({
    include: {
      accounts: true,
      businessMembers: true,
    },
  });

  console.log(`Found ${users.length} users in Dev DB.`);

  for (const user of users) {
    const existing = await stagingPrisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      await stagingPrisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      console.log(`+ Created staging user: ${user.email} (${user.role})`);
    }

    for (const acc of user.accounts) {
      const existingAcc = await stagingPrisma.account.findUnique({ where: { id: acc.id } });
      if (!existingAcc) {
        await stagingPrisma.account.create({
          data: {
            id: acc.id,
            userId: acc.userId,
            accountId: acc.accountId,
            providerId: acc.providerId,
            accessToken: acc.accessToken,
            refreshToken: acc.refreshToken,
            accessTokenExpiresAt: acc.accessTokenExpiresAt,
            refreshTokenExpiresAt: acc.refreshTokenExpiresAt,
            scope: acc.scope,
            password: acc.password,
            createdAt: acc.createdAt,
            updatedAt: acc.updatedAt,
          },
        });
        console.log(`  + Linked account: ${acc.providerId} (${acc.accountId})`);
      }
    }

    // Connect user to staging business memberships if business exists
    for (const mem of user.businessMembers) {
      const stagingBusiness = await stagingPrisma.business.findUnique({ where: { id: mem.businessId } });
      if (stagingBusiness) {
        const existingMem = await stagingPrisma.businessMember.findUnique({
          where: { businessId_userId: { businessId: mem.businessId, userId: mem.userId } },
        });
        if (!existingMem) {
          await stagingPrisma.businessMember.create({
            data: {
              id: mem.id,
              businessId: mem.businessId,
              userId: mem.userId,
              role: mem.role,
              createdAt: mem.createdAt,
              updatedAt: mem.updatedAt,
            },
          });
          console.log(`  + Added business membership: ${mem.role} in ${stagingBusiness.name}`);
        }
      }
    }
  }

  // Ensure 'nexora' store in staging has owner@nexoracommerce.com as OWNER member
  const nexoraStore = await stagingPrisma.business.findFirst({ where: { slug: "nexora" } });
  const ownerUser = await stagingPrisma.user.findUnique({ where: { email: "owner@nexoracommerce.com" } });
  if (nexoraStore && ownerUser) {
    const mem = await stagingPrisma.businessMember.findFirst({
      where: { businessId: nexoraStore.id, userId: ownerUser.id },
    });
    if (!mem) {
      await stagingPrisma.businessMember.create({
        data: {
          businessId: nexoraStore.id,
          userId: ownerUser.id,
          role: "OWNER",
        },
      });
      console.log(`+ Assigned OWNER role for ${ownerUser.email} on ${nexoraStore.name}`);
    }
  }

  // Also sync other businesses like apex-kicks and lumina-tech for multi-tenant tests if needed
  const devBusinesses = await devPrisma.business.findMany({
    where: { slug: { in: ["apex-kicks", "lumina-tech"] } },
    include: {
      settings: true,
      themeConfig: true,
      members: true,
    },
  });

  for (const b of devBusinesses) {
    const existingB = await stagingPrisma.business.findUnique({ where: { slug: b.slug } });
    if (!existingB) {
      await stagingPrisma.business.create({
        data: {
          id: b.id,
          slug: b.slug,
          name: b.name,
          type: b.type,
          status: b.status,
          currency: b.currency,
          description: b.description,
          members: {
            create: b.members.map((m) => ({
              userId: m.userId,
              role: m.role,
            })),
          },
          settings: undefined,
          themeConfig: undefined,
        },
      });
      console.log(`+ Seeded multi-tenant business: ${b.name} (${b.slug})`);
    }
  }

  await devPrisma.$disconnect();
  await stagingPrisma.$disconnect();
  console.log("=== User and Tenant Seeding Complete ===");
}

main().catch((err) => {
  console.error("Failed to seed staging users:", err);
  process.exit(1);
});
