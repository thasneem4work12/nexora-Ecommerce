import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export interface StorageUploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
}

export interface StorageProvider {
  upload(
    buffer: Buffer,
    mimeType: string,
    options?: { folder?: string; businessId?: string }
  ): Promise<StorageUploadResult>;
  delete(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Local Filesystem Storage Provider.
 * Stores files in a local directory (e.g. public/uploads or persistent Docker volume mount).
 */
export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private urlPrefix: string;

  constructor(baseDir?: string, urlPrefix = "/uploads") {
    this.baseDir = baseDir || path.join(process.cwd(), "public", "uploads");
    this.urlPrefix = urlPrefix;
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
    options?: { folder?: string; businessId?: string }
  ): Promise<StorageUploadResult> {
    const ext = EXTENSION_MAP[mimeType] || "jpg";
    const randomHash = crypto.randomBytes(8).toString("hex");
    const filename = `nx-${Date.now()}-${randomHash}.${ext}`;

    const folder = options?.folder || "products";
    const subPath = options?.businessId
      ? path.join(folder, options.businessId)
      : folder;

    const targetDir = path.join(this.baseDir, subPath);
    await fs.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);

    const relativeKey = `${subPath.replace(/\\/g, "/")}/${filename}`;
    const url = `${this.urlPrefix}/${relativeKey}`;

    return {
      url,
      key: relativeKey,
      filename,
      size: buffer.length,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const sanitizedKey = key.replace(/\.\./g, ""); // Prevent path traversal
      const filePath = path.join(this.baseDir, sanitizedKey);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `${this.urlPrefix}/${key.replace(/\\/g, "/")}`;
  }
}

/**
 * S3-compatible Object Storage Provider (AWS S3 / Cloudflare R2 / MinIO).
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint?: string;

  constructor(bucket: string, region: string, endpoint?: string) {
    this.bucket = bucket;
    this.region = region;
    this.endpoint = endpoint;
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
    options?: { folder?: string; businessId?: string }
  ): Promise<StorageUploadResult> {
    const ext = EXTENSION_MAP[mimeType] || "jpg";
    const randomHash = crypto.randomBytes(8).toString("hex");
    const filename = `nx-${Date.now()}-${randomHash}.${ext}`;

    const folder = options?.folder || "products";
    const key = options?.businessId
      ? `${folder}/${options.businessId}/${filename}`
      : `${folder}/${filename}`;

    // S3 integration endpoint simulation/placeholder
    const baseUrl = this.endpoint
      ? `${this.endpoint}/${this.bucket}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    const url = `${baseUrl}/${key}`;

    return {
      url,
      key,
      filename,
      size: buffer.length,
    };
  }

  async delete(_key: string): Promise<boolean> {
    return true;
  }

  getUrl(key: string): string {
    const baseUrl = this.endpoint
      ? `${this.endpoint}/${this.bucket}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    return `${baseUrl}/${key}`;
  }
}

/**
 * Factory to return the configured storage provider.
 */
export function getStorageProvider(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "s3" && process.env.S3_BUCKET && process.env.S3_REGION) {
    return new S3StorageProvider(
      process.env.S3_BUCKET,
      process.env.S3_REGION,
      process.env.S3_ENDPOINT
    );
  }
  return new LocalStorageProvider(process.env.UPLOAD_DIR);
}
