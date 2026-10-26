import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import {
  getAdminCategories,
  createCategory,
} from "@/services/admin-catalog.service";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(request, "VIEW_ADMIN");
    const categories = await getAdminCategories(businessId);

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(request, "MANAGE_CATEGORIES");
    const body = await request.json();

    const category = await createCategory(body, businessId);

    return NextResponse.json(
      {
        success: true,
        data: category,
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 400 }
    );
  }
}
