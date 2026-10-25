import { NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/services/admin-catalog.service";

export async function GET() {
  try {
    await requireAdminApi("VIEW_ADMIN");
    const metrics = await getDashboardMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard metrics." },
      { status: 500 }
    );
  }
}
