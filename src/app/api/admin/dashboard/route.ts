import { NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/services/admin-catalog.service";
import { getAdminOrderMetrics } from "@/services/admin-order.service";

export async function GET() {
  try {
    await requireAdminApi("VIEW_ADMIN");
    const [catalogMetrics, orderMetrics] = await Promise.all([
      getDashboardMetrics(),
      getAdminOrderMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...catalogMetrics,
        orders: orderMetrics,
      },
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
