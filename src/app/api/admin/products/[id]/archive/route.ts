import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { archiveProduct, restoreProduct } from "@/services/admin-catalog.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminApi("ARCHIVE_PRODUCT");
    const { id } = await params;

    const archived = await archiveProduct(id);

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminApi("ARCHIVE_PRODUCT");
    const { id } = await params;

    const restored = await restoreProduct(id);

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
