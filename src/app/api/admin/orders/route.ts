import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getAdminOrders, getAdminOrderMetrics } from "@/services/admin-order.service";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi("VIEW_ORDERS");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as OrderStatus) || undefined;
    const paymentStatus = (searchParams.get("paymentStatus") as PaymentStatus) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const [ordersResult, metrics] = await Promise.all([
      getAdminOrders({
        search,
        status,
        paymentStatus,
        page: isNaN(page) ? 1 : page,
        limit: isNaN(limit) ? 20 : limit,
      }),
      getAdminOrderMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      ...ordersResult,
      metrics,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
