process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
process.env.BETTER_AUTH_SECRET = "nexora_staging_secret_key_at_least_32_characters_long_for_auth";

import { PrismaClient, Role, BusinessRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../../src/lib/auth";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

interface AccountSpec {
  email: string;
  name: string;
  password: string;
  role: Role;
  businesses?: { slug: string; role: BusinessRole }[];
}

const ACCOUNTS_TO_PROVISION: AccountSpec[] = [
  {
    email: "owner@nexoracommerce.com",
    name: "Atelier Master (Store Owner)",
    password: "NexoraOwner2026!",
    role: Role.OWNER,
    businesses: [
      { slug: "nexora", role: BusinessRole.OWNER },
      { slug: "lumina-tech", role: BusinessRole.OWNER },
      { slug: "apex-kicks", role: BusinessRole.OWNER },
    ],
  },
  {
    email: "superadmin@nexoracommerce.com",
    name: "Platform Superadmin",
    password: "NexoraSuperadmin2026!",
    role: Role.SUPERADMIN,
  },
  {
    email: "admin@nexoracommerce.com",
    name: "Platform Master Admin",
    password: "NexoraAdmin2026!",
    role: Role.SUPERADMIN,
    businesses: [
      { slug: "nexora", role: BusinessRole.OWNER },
      { slug: "lumina-tech", role: BusinessRole.OWNER },
      { slug: "apex-kicks", role: BusinessRole.OWNER },
    ],
  },
  {
    email: "lumina.manager@test.com",
    name: "Marcus Vance (Lumina Manager)",
    password: "NexoraStaff2026!",
    role: Role.STAFF,
    businesses: [
      { slug: "lumina-tech", role: BusinessRole.MANAGER },
    ],
  },
  {
    email: "apex.manager@test.com",
    name: "Tariq King (Apex Kicks Manager)",
    password: "NexoraStaff2026!",
    role: Role.STAFF,
    businesses: [
      { slug: "apex-kicks", role: BusinessRole.MANAGER },
    ],
  },
  {
    email: "customer@nexoratest.com",
    name: "Lady Genevieve Vance",
    password: "CustomerPassword123!",
    role: Role.CUSTOMER,
  },
  {
    email: "customer.luxury@example.com",
    name: "Elena Rostova",
    password: "CustomerPassword123!",
    role: Role.CUSTOMER,
  },
];

async function main() {
  console.log("=== Provisioning and Fixing All Role Accounts in Staging DB ===");

  for (const spec of ACCOUNTS_TO_PROVISION) {
    console.log(`\nProcessing: ${spec.email} (${spec.role})...`);

    // 1. Upsert User
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        name: spec.name,
        role: spec.role,
        emailVerified: true,
      },
      create: {
        email: spec.email,
        name: spec.name,
        role: spec.role,
        emailVerified: true,
      },
    });

    // 2. Hash password with Better Auth
    const hashedPassword = await hashPassword(spec.password);

    // 3. Upsert Account credential record
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          password: hashedPassword,
          accountId: user.id,
        },
      });
      console.log(`  ✓ Updated password credential in Account table for ${spec.email}`);
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });
      console.log(`  ✓ Created new password credential in Account table for ${spec.email}`);
    }

    // 4. Ensure Business Memberships
    if (spec.businesses && spec.businesses.length > 0) {
      for (const b of spec.businesses) {
        const business = await prisma.business.findUnique({
          where: { slug: b.slug },
        });

        if (business) {
          await prisma.businessMember.upsert({
            where: {
              businessId_userId: {
                businessId: business.id,
                userId: user.id,
              },
            },
            update: {
              role: b.role,
            },
            create: {
              businessId: business.id,
              userId: user.id,
              role: b.role,
            },
          });
          console.log(`  ✓ Linked to business: ${b.slug} as ${b.role}`);
        } else {
          console.log(`  ⚠ Business with slug '${b.slug}' not found!`);
        }
      }
    }
  }

  console.log("\n=== Verifying Sign-In via Better Auth API for ALL Provisioned Accounts ===");
  let allPassed = true;

  for (const spec of ACCOUNTS_TO_PROVISION) {
    try {
      const signInRes = await auth.api.signInEmail({
        body: {
          email: spec.email,
          password: spec.password,
        },
      });

      if (signInRes && signInRes.user) {
        console.log(`  ✓ [PASS] ${spec.email} signed in successfully! (User ID: ${signInRes.user.id}, Role: ${spec.role})`);
      } else {
        console.error(`  ✗ [FAIL] ${spec.email} signInEmail returned empty result!`);
        allPassed = false;
      }
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${spec.email} signInEmail failed:`, err.message || err);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("\n🎉 ALL ACCOUNTS VERIFIED AND FUNCTIONING 100%!");
  } else {
    console.error("\n❌ Some accounts failed verification. Check logs above.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
