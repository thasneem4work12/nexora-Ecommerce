import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getAdminCustomers, type GetAdminCustomersParams } from "@/services/admin-customer.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi("VIEW_CUSTOMERS");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as GetAdminCustomersParams["sortBy"]) || "newest";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getAdminCustomers({
      search,
      sortBy,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
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
      { success: false, error: "Failed to fetch customer directory" },
      { status: 500 }
    );
  }
}
