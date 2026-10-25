import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  console.log("Current users count:", users);
  console.log("Current products count:", products);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
