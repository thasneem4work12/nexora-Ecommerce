process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
process.env.BETTER_AUTH_SECRET = "nexora_staging_secret_key_at_least_32_characters_long_for_auth";

import * as crypto from "better-auth/crypto";
import { auth } from "../../src/lib/auth";

console.log("Crypto exports:", Object.keys(crypto));
console.log("Auth internal / password:", Object.keys(auth));
