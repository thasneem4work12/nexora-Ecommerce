import { PrismaClient } from "@prisma/client";

async function main() {
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

  console.log("--- DEV DATABASE (port 5432) ---");
  const devBusinesses = await devPrisma.business.count();
  const devProducts = await devPrisma.product.count();
  const devVariants = await devPrisma.productVariant.count();
  const devCategories = await devPrisma.category.count();
  const devPlans = await devPrisma.saaSPlan.count();
  const devSubscriptions = await devPrisma.saaSSubscription.count();
  console.log({
    businesses: devBusinesses,
    products: devProducts,
    variants: devVariants,
    categories: devCategories,
    saasPlans: devPlans,
    saasSubscriptions: devSubscriptions,
  });

  console.log("--- STAGING DATABASE (port 5433) ---");
  const stagingBusinesses = await stagingPrisma.business.count();
  const stagingProducts = await stagingPrisma.product.count();
  const stagingVariants = await stagingPrisma.productVariant.count();
  const stagingCategories = await stagingPrisma.category.count();
  const stagingPlans = await stagingPrisma.saaSPlan.count();
  const stagingSubscriptions = await stagingPrisma.saaSSubscription.count();
  console.log({
    businesses: stagingBusinesses,
    products: stagingProducts,
    variants: stagingVariants,
    categories: stagingCategories,
    saasPlans: stagingPlans,
    saasSubscriptions: stagingSubscriptions,
  });

  await devPrisma.$disconnect();
  await stagingPrisma.$disconnect();
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
