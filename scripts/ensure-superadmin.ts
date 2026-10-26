import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

async function main() {
  const email = "superadmin@nexoracommerce.com";
  const password = "NexoraSuperadmin2026!";
  const name = "Platform Superadmin";

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const signUpRes = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!signUpRes || !signUpRes.user) {
      throw new Error("Failed to sign up superadmin");
    }

    user = await prisma.user.update({
      where: { id: signUpRes.user.id },
      data: { role: "SUPERADMIN" },
    });
    console.log("Created superadmin user:", user.email, user.role);
  } else {
    // Ensure role is SUPERADMIN
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "SUPERADMIN" },
    });
    console.log("Updated superadmin user:", user.email, user.role);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
