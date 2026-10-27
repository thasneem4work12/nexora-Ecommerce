import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for uptime monitoring and container orchestrators.
 * Does not expose sensitive configuration.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "nexora-commerce",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
