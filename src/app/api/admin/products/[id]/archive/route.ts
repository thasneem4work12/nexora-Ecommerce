import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { archiveProduct, restoreProduct } from "@/services/admin-catalog.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAdminApi(request, "ARCHIVE_PRODUCT");
    const { id } = await params;

    const archived = await archiveProduct(id, businessId);

    return NextResponse.json({
      success: true,
      data: archived,
      message: "Product archived successfully. Historical records preserved.",
    });
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
        error: error instanceof Error ? error.message : "Failed to archive product",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAdminApi(request, "ARCHIVE_PRODUCT");
    const { id } = await params;

    const restored = await restoreProduct(id, businessId);

    return NextResponse.json({
      success: true,
      data: restored,
      message: "Product restored successfully.",
    });
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
        error: error instanceof Error ? error.message : "Failed to restore product",
      },
      { status: 400 }
    );
  }
}
