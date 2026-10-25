import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

/**
 * Validates password strength for executive administrative accounts.
 * Enforces: >= 12 chars, uppercase, lowercase, number, and special character.
 */
function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: "Password must be at least 12 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one digit." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)." };
  }
  return { valid: true };
}

async function main() {
  const args = process.argv.slice(2);
  let email = process.env.BOOTSTRAP_OWNER_EMAIL || "";
  let password = process.env.BOOTSTRAP_OWNER_PASSWORD || "";
  let name = process.env.BOOTSTRAP_OWNER_NAME || "Atelier Master (Store Owner)";
  let forcePromote = false;

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      email = arg.split("=")[1]?.trim() || "";
    } else if (arg.startsWith("--password=")) {
      password = arg.split("=")[1]?.trim() || "";
    } else if (arg.startsWith("--name=")) {
      name = arg.split("=")[1]?.trim() || "";
    } else if (arg === "--force-promote") {
      forcePromote = true;
    }
  }

  // Security Check: No default or hardcoded credentials permitted
  if (!email || !password) {
    console.error("\n=======================================================");
    console.error("  SECURITY NOTICE: Explicit Credentials Required");
    console.error("=======================================================");
    console.error("Owner creation requires explicit, secure parameters to prevent");
    console.error("unintended default credentials or privilege escalation.\n");
    console.error("Usage:");
    console.error('  npm run admin:bootstrap -- --email=admin@yourboutique.com --password=YourStrongPassword123! [--name="Atelier Director"] [--force-promote]');
    console.error("\nAlternatively, define environment variables:");
    console.error("  BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD\n");
    process.exit(1);
  }

  // Enforce password policy
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.valid) {
    console.error(`\nSecurity Error: ${passwordCheck.message}\n`);
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`  NEXORA Commerce — Secure Owner Bootstrap`);
  console.log(`========================================`);
  console.log(`Target Email: ${email}`);
  console.log(`Target Name:  ${name}`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`\nUser with email "${email}" already exists in PostgreSQL.`);
    if (existingUser.role === "OWNER") {
      console.log(`✓ User is already verified with role OWNER. No modification needed.\n`);
      return;
    }

    // Guard against unintended privilege escalation: require explicit --force-promote flag
    if (!forcePromote) {
      console.error(
        `\nSecurity Warning: User exists with role "${existingUser.role}".`
      );
      console.error(
        `Automatic elevation to OWNER is blocked to prevent accidental privilege escalation.`
      );
      console.error(
        `To intentionally elevate this existing account, rerun with the --force-promote flag.\n`
      );
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "OWNER" },
    });
    console.log(`✓ Explicitly elevated existing user ${updated.email} to role: ${updated.role}\n`);
    return;
  }

  // Create new user securely via Better Auth
  console.log(`\nRegistering new store director profile via Better Auth...`);
  const signUpRes = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  if (!signUpRes || !signUpRes.user) {
    throw new Error("Failed to create user through Better Auth API.");
  }

  // Authoritatively assign OWNER role in PostgreSQL
  const ownerUser = await prisma.user.update({
    where: { id: signUpRes.user.id },
    data: { role: "OWNER" },
  });

  console.log(`✓ Successfully bootstrapped initial store owner:`);
  console.log(`  User ID: ${ownerUser.id}`);
  console.log(`  Email:   ${ownerUser.email}`);
  console.log(`  Role:    ${ownerUser.role}`);
  console.log(`\nAdministrative credentials verified. Access command center at /admin.\n`);
}

main()
  .catch((err) => {
    console.error("Bootstrap execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
