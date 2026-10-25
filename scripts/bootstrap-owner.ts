import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

async function main() {
  const args = process.argv.slice(2);
  let email = process.env.BOOTSTRAP_OWNER_EMAIL || "owner@nexoracommerce.com";
  let password = process.env.BOOTSTRAP_OWNER_PASSWORD || "NexoraOwner2026!";
  let name = process.env.BOOTSTRAP_OWNER_NAME || "Atelier Master (Store Owner)";

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      email = arg.split("=")[1];
    } else if (arg.startsWith("--password=")) {
      password = arg.split("=")[1];
    } else if (arg.startsWith("--name=")) {
      name = arg.split("=")[1];
    }
  }

  if (!email || !password) {
    console.error("Error: --email and --password are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters long.");
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`  NEXORA Commerce — Store Owner Bootstrap`);
  console.log(`========================================`);
  console.log(`Target Email: ${email}`);
  console.log(`Target Name:  ${name}`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`\nUser with email ${email} already exists.`);
    if (existingUser.role === "OWNER") {
      console.log(`✓ User is already an OWNER. No changes necessary.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "OWNER" },
    });
    console.log(`✓ Successfully elevated existing user ${updated.email} to role: ${updated.role}`);
    return;
  }

  // Create new user via Better Auth
  console.log(`\nCreating new user via Better Auth...`);
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

  // Directly assign OWNER role in PostgreSQL
  const ownerUser = await prisma.user.update({
    where: { id: signUpRes.user.id },
    data: { role: "OWNER" },
  });

  console.log(`✓ Successfully bootstrapped initial store owner:`);
  console.log(`  User ID: ${ownerUser.id}`);
  console.log(`  Email:   ${ownerUser.email}`);
  console.log(`  Role:    ${ownerUser.role}`);
  console.log(`\nKeep these credentials secure. Administrative access is granted at /admin.\n`);
}

main()
  .catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
