import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  console.log("Current users count:", users);
  console.log("Current products count:", products);
  console.log("Current categories count:", await prisma.category.count());
  console.log("Current variants count:", await prisma.productVariant.count());
  console.log("Current orders count:", await prisma.order.count());
  console.log("Current inventory movements count:", await prisma.inventoryMovement.count());
  console.log("Current return requests count:", await prisma.returnRequest.count());
  console.log("Current support tickets count:", await prisma.supportTicket.count());
  console.log("Current theme configs count:", await prisma.storeThemeConfig.count());
  console.log("Current businesses count:", await prisma.business.count());
  console.log("Current business members count:", await prisma.businessMember.count());
  console.log("Current business settings count:", await prisma.businessSettings.count());
  
  const defaultBusiness = await prisma.business.findUnique({
    where: { id: "default-store" },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
          categories: true,
          members: true,
        },
      },
    },
  });
  console.log("Default store relations count:", defaultBusiness?._count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
