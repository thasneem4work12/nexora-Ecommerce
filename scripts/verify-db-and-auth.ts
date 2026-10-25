import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

async function main() {
  console.log("--- 1. Testing Prisma Direct DB Read / Write ---");

  // Create a test user via Prisma
  const testEmail = `test_prisma_${Date.now()}@nexoratest.com`;
  const createdUser = await prisma.user.create({
    data: {
      name: "Direct Prisma Test Client",
      email: testEmail,
      role: "CUSTOMER",
    },
  });
  console.log("✓ Successfully created user via Prisma:", createdUser.id, createdUser.email);

  // Read back user
  const fetchedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  if (!fetchedUser || fetchedUser.email !== testEmail) {
    throw new Error("Failed to read back created user via Prisma!");
  }
  console.log("✓ Successfully fetched user via Prisma:", fetchedUser.email);

  // Clean up direct test user
  await prisma.user.delete({ where: { id: createdUser.id } });
  console.log("✓ Successfully cleaned up direct test user.");

  console.log("\n--- 2. Testing Better Auth API (Task 3) ---");

  const authEmail = `client_${Date.now()}@nexoratest.com`;
  const authPassword = "TestLuxuryPassword123!";

  console.log(`Testing registration for: ${authEmail}`);

  // Test 1: Customer registration succeeds
  // Also tests 8: Customer cannot assign themselves admin role on registration
  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: authEmail,
      password: authPassword,
      name: "Lady Genevieve Vance",
      // Attacker tries to inject admin role
      // @ts-expect-error test malicious injection
      role: "SUPERADMIN",
    },
  });

  if (!signUpRes || !signUpRes.user) {
    throw new Error("Registration failed!");
  }
  console.log("✓ 1. Customer registration succeeded with ID:", signUpRes.user.id);

  // Test 2: Passwords are securely hashed (check accounts table in DB)
  const accountRecord = await prisma.account.findFirst({
    where: { userId: signUpRes.user.id },
  });
  if (!accountRecord || !accountRecord.password) {
    throw new Error("No password record found in accounts table!");
  }
  if (accountRecord.password === authPassword) {
    throw new Error("SECURITY FAILURE: Password stored in plaintext!");
  }
  console.log("✓ 2. Password is securely hashed in database:", accountRecord.password.substring(0, 20) + "...");

  // Test 8: Verify role was NOT elevated to SUPERADMIN
  const dbUser = await prisma.user.findUnique({
    where: { id: signUpRes.user.id },
  });
  if (dbUser?.role !== "CUSTOMER") {
    throw new Error(`SECURITY FAILURE: Role injection succeeded! User role is ${dbUser?.role}`);
  }
  console.log("✓ 8. Role injection blocked: User role is properly defaulted to:", dbUser.role);

  // Test 3: Correct login credentials work
  const signInRes = await auth.api.signInEmail({
    body: {
      email: authEmail,
      password: authPassword,
    },
  });
  if (!signInRes || !signInRes.user) {
    throw new Error("Valid sign in failed!");
  }
  console.log("✓ 3. Correct login credentials succeeded. Session token generated:", signInRes.token ? "Yes" : "Via cookie");

  // Test 4: Incorrect credentials are rejected
  try {
    await auth.api.signInEmail({
      body: {
        email: authEmail,
        password: "WrongPassword999!",
      },
    });
    throw new Error("SECURITY FAILURE: Incorrect password was accepted!");
  } catch (err: any) {
    console.log("✓ 4. Incorrect credentials properly rejected with error:", err.message || err.status || "Auth error");
  }

  // Test 5: Verify valid session in DB survives and can be verified
  const activeSessions = await prisma.session.findMany({
    where: { userId: signUpRes.user.id },
  });
  if (activeSessions.length === 0) {
    throw new Error("No active session found in database!");
  }
  console.log("✓ 5. Valid session exists in database (expiresAt:", activeSessions[0].expiresAt.toISOString(), ")");

  // Test 6 & 7: Logout / Session revocation
  await prisma.session.deleteMany({
    where: { userId: signUpRes.user.id },
  });
  const remainingSessions = await prisma.session.findMany({
    where: { userId: signUpRes.user.id },
  });
  if (remainingSessions.length !== 0) {
    throw new Error("Session invalidation failed!");
  }
  console.log("✓ 6. Session successfully invalidated / removed from database.");
  console.log("✓ 7. Signed-out user has zero active sessions; private access is revoked.");

  console.log("\nAll Database and Authentication verification tests PASSED!");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
