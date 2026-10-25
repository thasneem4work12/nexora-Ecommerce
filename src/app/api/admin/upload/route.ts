import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: NextRequest) {
  try {
    // 1. Authorize admin
    await requireAdminApi("CREATE_PRODUCT");

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

    // 5. Generate secure, collision-free filename
    const ext = EXTENSION_MAP[file.type] || "jpg";
    const randomHash = crypto.randomBytes(8).toString("hex");
    const safeFilename = `nexora-${Date.now()}-${randomHash}.${ext}`;

    // 6. Ensure destination directory exists in public/uploads/products
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    // 7. Write file
    const filePath = path.join(uploadDir, safeFilename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/products/${safeFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
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
