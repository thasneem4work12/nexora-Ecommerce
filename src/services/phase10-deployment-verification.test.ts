import { describe, it, expect } from "vitest";
import { validateEnv } from "@/lib/env-validator";
import { LocalStorageProvider, S3StorageProvider } from "@/lib/storage";
import { runWorkerCycle } from "../../scripts/worker";
import fs from "fs/promises";
import path from "path";

describe("NEXORA Commerce — Phase 10 Deployment & Infrastructure Verification Suite", () => {
  // =========================================================================
  // TASK 4 & 5: ENVIRONMENT SEPARATION & CONFIGURATION VALIDATION
  // =========================================================================
  describe("Task 4 & 5 — Environment Separation & Startup Configuration Validation", () => {
    it("validates safe development and staging configurations", () => {
      const config = validateEnv();
      expect(config.DATABASE_URL).toBeDefined();
      expect(config.BETTER_AUTH_SECRET).toBeDefined();
      expect(config.BETTER_AUTH_URL).toBeDefined();
    });

    it("strictly forbids mock payments in production environments", () => {
      const originalEnv = { ...process.env };
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        process.env.ALLOW_MOCK_PAYMENT = "true";
        process.env.DATABASE_URL = "postgresql://nexora:pass@localhost:5432/db";
        process.env.BETTER_AUTH_SECRET = "secure_random_production_secret_key_at_least_32_chars";
        process.env.BETTER_AUTH_URL = "https://app.nexoracommerce.com";
        process.env.NEXT_PUBLIC_APP_URL = "https://app.nexoracommerce.com";

        // Must throw critical configuration error
        expect(() => validateEnv(true)).toThrow(/Mock payments are strictly forbidden in production/i);
      } finally {
        process.env = originalEnv;
      }
    });

    it("enforces minimum 32-character secret length for Better Auth in production", () => {
      const originalEnv = { ...process.env };
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        process.env.ALLOW_MOCK_PAYMENT = "false";
        process.env.DATABASE_URL = "postgresql://nexora:pass@localhost:5432/db";
        process.env.BETTER_AUTH_SECRET = "short_secret"; // < 32 chars
        process.env.BETTER_AUTH_URL = "https://app.nexoracommerce.com";
        process.env.NEXT_PUBLIC_APP_URL = "https://app.nexoracommerce.com";

        expect(() => validateEnv(true)).toThrow(/BETTER_AUTH_SECRET must be at least 32 characters/i);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  // =========================================================================
  // TASK 8: OBJECT STORAGE ABSTRACTION & TENANT-AWARE STORAGE
  // =========================================================================
  describe("Task 8 — Object Storage Abstraction & Tenant File Isolation", () => {
    it("stores files in tenant-scoped directories and generates valid URLs", async () => {
      const tempStorageDir = path.join(process.cwd(), "public", "test-uploads");
      const provider = new LocalStorageProvider(tempStorageDir, "/test-uploads");

      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG
      const uploadResult = await provider.upload(testBuffer, "image/jpeg", {
        folder: "products",
        businessId: "biz_test_tenant_alpha",
      });

      expect(uploadResult.url).toContain("/test-uploads/products/biz_test_tenant_alpha/");
      expect(uploadResult.filename).toMatch(/^nx-\d+-[a-f0-9]+\.jpg$/);
      expect(uploadResult.size).toBe(testBuffer.length);

      // Verify file exists on disk in tenant directory
      const diskPath = path.join(tempStorageDir, "products", "biz_test_tenant_alpha", uploadResult.filename);
      const exists = await fs.stat(diskPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Clean up test file and directory
      await provider.delete(uploadResult.key);
      await fs.rm(tempStorageDir, { recursive: true, force: true });
    });

    it("prevents path traversal attacks during file deletion", async () => {
      const provider = new LocalStorageProvider();
      const deleteResult = await provider.delete("../../etc/passwd");
      expect(deleteResult).toBe(false);
    });

    it("generates correct URLs for S3StorageProvider", () => {
      const s3Provider = new S3StorageProvider("nexora-bucket", "eu-central-1");
      const url = s3Provider.getUrl("products/biz_123/image.webp");
      expect(url).toBe("https://nexora-bucket.s3.eu-central-1.amazonaws.com/products/biz_123/image.webp");
    });
  });

  // =========================================================================
  // TASK 7: DURABLE BACKGROUND WORKERS & SWEEPERS
  // =========================================================================
  describe("Task 7 — Durable Background Worker Execution Cycle", () => {
    it("executes complete worker cycle without unhandled exceptions", async () => {
      const stats = await runWorkerCycle();
      expect(typeof stats.reservationsRecovered).toBe("number");
      expect(typeof stats.notificationsProcessed).toBe("number");
      expect(typeof stats.notificationsSucceeded).toBe("number");
      expect(typeof stats.notificationsFailed).toBe("number");
      expect(typeof stats.expiredTrials).toBe("number");
      expect(typeof stats.cancelledSubscriptions).toBe("number");
      expect(typeof stats.pastDueSubscriptions).toBe("number");
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
