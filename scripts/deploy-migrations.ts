import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { logger } from "../src/lib/logger";

/**
 * Production & Staging Migration Deployment Controller
 * Enforces non-destructive, transaction-safe migration execution via `prisma migrate deploy`.
 */
async function runDeploymentMigrations() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) {
    logger.error("DATABASE_URL is missing. Aborting migration.");
    process.exit(1);
  }

  // Obfuscate credentials for logging
  const maskedUrl = targetUrl.replace(/:[^:@]+@/, ":****@");
  logger.info(`Starting migration deployment against: ${maskedUrl}`);

  const prisma = new PrismaClient();

  try {
    // 1. Connectivity test
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connectivity established.");

    // 2. Execute pending migrations transactionally
    logger.info("Applying pending Prisma migrations via prisma migrate deploy...");
    const deployOutput = execSync("npx prisma migrate deploy", {
      encoding: "utf-8",
      env: { ...process.env },
    });
    logger.info("Prisma migrate deploy output:\n" + deployOutput.trim());

    // 3. Post-migration data integrity verification
    const [businessCount, productCount, orderCount] = await Promise.all([
      prisma.business.count(),
      prisma.product.count(),
      prisma.order.count(),
    ]);

    logger.info("Post-migration integrity verification passed.", {
      businessCount,
      productCount,
      orderCount,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Migration deployment failed!", { error: errorMsg });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runDeploymentMigrations();
}
