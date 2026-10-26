import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import {
  getAdminProducts,
  createProduct,
} from "@/services/admin-catalog.service";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(request, "VIEW_PRODUCTS");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const rawStatus = searchParams.get("status");
    const status =
      rawStatus === "published" || rawStatus === "draft" || rawStatus === "archived"
        ? rawStatus
        : undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 15;

    const result = await getAdminProducts({
      businessId,
      search,
      categoryId,
      status,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 15 : limit,
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
    console.error("Admin products GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireAdminApi(request, "CREATE_PRODUCT");
    const body = await request.json();

    const product = await createProduct(body, user.id, businessId);

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Admin product POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create product",
      },
      { status: 400 }
    );
  }
}
