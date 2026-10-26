import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getInventoryItems } from "@/services/inventory.service";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(request, "VIEW_INVENTORY");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getInventoryItems({
      search,
      lowStockOnly,
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
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
