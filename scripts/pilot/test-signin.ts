process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
process.env.BETTER_AUTH_SECRET = "nexora_staging_secret_key_at_least_32_characters_long_for_auth";

import { auth } from "../../src/lib/auth";

async function main() {
  console.log("=== Testing Sign-In for Existing Accounts ===");
  try {
    const ownerRes = await auth.api.signInEmail({
      body: {
        email: "owner@nexoracommerce.com",
        password: "NexoraOwner2026!",
      },
    });
    console.log("[PASS] owner@nexoracommerce.com signed in successfully! User ID:", ownerRes.user.id);
  } catch (err: any) {
    console.error("[FAIL] owner@nexoracommerce.com sign-in failed:", err.message || err);
  }

  try {
    const superRes = await auth.api.signInEmail({
      body: {
        email: "superadmin@nexoracommerce.com",
        password: "NexoraSuperadmin2026!",
      },
    });
    console.log("[PASS] superadmin@nexoracommerce.com signed in successfully! User ID:", superRes.user.id);
  } catch (err: any) {
    console.error("[FAIL] superadmin@nexoracommerce.com sign-in failed:", err.message || err);
  }
}

main().catch(console.error);
