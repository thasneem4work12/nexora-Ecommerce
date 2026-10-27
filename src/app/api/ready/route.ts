import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness probe verifying PostgreSQL database connectivity.
 * Fails safely with HTTP 503 if the database is unreachable,
 * without disclosing connection strings or internal errors.
 */
export async function GET() {
  try {
    // Ping PostgreSQL authoritatively
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Database readiness check failed", {
      category: "HEALTH_CHECK",
      error,
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
