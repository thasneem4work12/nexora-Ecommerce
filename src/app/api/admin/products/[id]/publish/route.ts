import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { setProductPublishStatus } from "@/services/admin-catalog.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminApi("PUBLISH_PRODUCT");
    const { id } = await params;
    const body = await request.json();
    const published = Boolean(body?.published);

    const updated = await setProductPublishStatus(id, published);

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
        error:
          error instanceof Error
            ? error.message
            : "Failed to update publish status",
      },
      { status: 400 }
    );
  }
}
