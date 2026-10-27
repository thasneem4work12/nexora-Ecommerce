import { z } from "zod";

/**
 * NEXORA Commerce — Unified Environment Variable Validation Schema
 * Enforces strict environment separation, credential formatting, and fail-fast startup checks.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is mandatory")
      .refine(
        (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
        "DATABASE_URL must be a valid PostgreSQL connection URI"
      ),
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is mandatory"),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid absolute URL"),
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid absolute URL"),
    ALLOW_MOCK_PAYMENT: z.enum(["true", "false"]).default("false"),
    MOCK_PAYMENT_SECRET: z.string().optional(),
    PAYHERE_SANDBOX: z.enum(["true", "false"]).default("true"),
    PAYHERE_MERCHANT_ID: z.string().optional(),
    PAYHERE_MERCHANT_SECRET: z.string().optional(),
    SAAS_BILLING_WEBHOOK_SECRET: z.string().optional(),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("./public/uploads"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Strict Production Security Guards
    if (data.NODE_ENV === "production") {
      if (data.ALLOW_MOCK_PAYMENT === "true") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ALLOW_MOCK_PAYMENT"],
          message: "CRITICAL: Mock payments are strictly forbidden in production (NODE_ENV=production).",
        });
      }
      if (data.BETTER_AUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET must be at least 32 characters in production environments.",
        });
      }
      if (!data.SAAS_BILLING_WEBHOOK_SECRET || data.SAAS_BILLING_WEBHOOK_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SAAS_BILLING_WEBHOOK_SECRET"],
          message: "SAAS_BILLING_WEBHOOK_SECRET must be at least 32 characters in production.",
        });
      }
    }

    // 2. Storage driver requirements
    if (data.STORAGE_DRIVER === "s3") {
      if (!data.S3_BUCKET || !data.S3_REGION || !data.S3_ACCESS_KEY_ID || !data.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STORAGE_DRIVER"],
          message: "S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required when STORAGE_DRIVER=s3.",
        });
      }
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

let cachedEnv: ValidatedEnv | null = null;

/**
 * Validates and returns the authoritative environment configuration.
 * Throws a formatted diagnostic error if required environment variables are missing or insecure.
 */
export function validateEnv(forceReload = false): ValidatedEnv {
  if (!forceReload && cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - [${err.path.join(".") || "GLOBAL"}]: ${err.message}`)
      .join("\n");

    const errorMessage = `\n=======================================================\n` +
      `[CRITICAL CONFIGURATION ERROR] Missing or Invalid Environment Configuration:\n` +
      `${errorDetails}\n` +
      `=======================================================\n`;

    // Only throw in runtime, not during static build inspection unless mandatory
    if (process.env.NODE_ENV !== "test") {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
