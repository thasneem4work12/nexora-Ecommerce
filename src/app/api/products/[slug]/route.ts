import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/services/catalog.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Missing product slug parameter" },
        { status: 400 }
      );
    }

    const product = await getProductBySlug(slug, { includeUnpublished: false });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("API error in /api/products/[slug]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
