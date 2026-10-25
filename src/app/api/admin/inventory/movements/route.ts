import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getInventoryMovements } from "@/services/inventory.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi("VIEW_AUDIT_LOGS");

    const searchParams = request.nextUrl.searchParams;
    const variantId = searchParams.get("variantId") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 25;

    const result = await getInventoryMovements({
      variantId,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 25 : limit,
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
      { success: false, error: "Failed to fetch inventory movements" },
      { status: 500 }
    );
  }
}
