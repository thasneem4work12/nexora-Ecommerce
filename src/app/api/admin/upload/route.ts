import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { isValidImageSignature } from "@/lib/image-utils";
import { getStorageProvider } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: NextRequest) {
  try {
    // 1. Authorize admin
    const { businessId } = await requireAdminApi(request, "CREATE_PRODUCT");

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 5MB limit. Uploaded file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type "${file.type}". Allowed formats: JPEG, PNG, WebP, AVIF.`,
        },
        { status: 400 }
      );
    }

    // 5. Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Inspect magic bytes signature to prevent MIME spoofing
    if (!isValidImageSignature(buffer, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Security rejection: File content signature does not match declared image MIME type.",
        },
        { status: 400 }
      );
    }

    // 7. Store file via storage provider abstraction
    const storage = getStorageProvider();
    const uploadResult = await storage.upload(buffer, file.type, {
      folder: "products",
      businessId,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.filename,
      key: uploadResult.key,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Image upload failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during image upload." },
      { status: 500 }
    );
  }
}
