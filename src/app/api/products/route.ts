import { NextRequest, NextResponse } from "next/server";
import { getPublishedProducts } from "@/services/catalog.service";
import type { ProductSortOption } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const sort = (searchParams.get("sort") as ProductSortOption) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 12;
    const featuredOnly = searchParams.get("featured") === "true";

    const result = await getPublishedProducts({
      category,
      search,
      sort,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 12 : limit,
      featuredOnly,
      includeUnpublished: false, // Strict customer security
    });

    return NextResponse.json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("API error in /api/products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
