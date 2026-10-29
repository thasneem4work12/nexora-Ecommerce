import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.APPROVED_PILOT_HOSTNAME || process.env.BETTER_AUTH_URL || "http://localhost:3005",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3005",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.APPROVED_PILOT_HOSTNAME && !process.env.APPROVED_PILOT_HOSTNAME.includes("*")
      ? [process.env.APPROVED_PILOT_HOSTNAME.trim()]
      : []),
  ],
  advanced: {
    useSecureCookies:
      process.env.NODE_ENV === "production" ||
      process.env.BETTER_AUTH_URL?.startsWith("https://") ||
      process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ||
      (process.env.APPROVED_PILOT_HOSTNAME ? process.env.APPROVED_PILOT_HOSTNAME.startsWith("https://") : false),
    cookiePrefix: "nexora",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  rateLimit: {
    window: 60,
    max: process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "true" ? 120 : 500,
    customRules: {
      "/sign-in/*": {
        window: 60,
        max: process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "true" ? 20 : 100, // Strict 20/min in prod to mitigate brute-force attacks
      },
      "/sign-up/*": {
        window: 60,
        max: process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "true" ? 15 : 100, // Strict 15/min in prod
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: false, // Don't let users set their own role on signup
      },
    },
  },
});
