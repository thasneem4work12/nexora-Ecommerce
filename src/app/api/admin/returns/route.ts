import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getReturnRequests } from "@/services/return.service";
import type { ReturnStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(request, "VIEW_ORDERS");

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") as ReturnStatus) || undefined;
    const orderId = searchParams.get("orderId") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getReturnRequests({
      status,
      orderId,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      businessId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch return requests" },
      { status: 500 }
    );
  }
}
