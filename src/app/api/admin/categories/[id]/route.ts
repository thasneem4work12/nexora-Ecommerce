import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import {
  updateCategory,
  deleteCategory,
} from "@/services/admin-catalog.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminApi("MANAGE_CATEGORIES");
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCategory(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
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
        error: error instanceof Error ? error.message : "Failed to update category",
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
    await requireAdminApi("MANAGE_CATEGORIES");
    const { id } = await params;

    const deleted = await deleteCategory(id);

    return NextResponse.json({
      success: true,
      data: deleted,
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
        error: error instanceof Error ? error.message : "Failed to delete category",
      },
      { status: 400 }
    );
  }
}
