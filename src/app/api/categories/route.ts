import { NextResponse } from "next/server";
import { getCategories } from "@/services/catalog.service";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("API error in /api/categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
