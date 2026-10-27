import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public",
    },
  },
});

async function run() {
  console.log("=== Testing Background Worker On Staging DB ===");

  // 1. Get business, user, and variant
  const business = await prisma.business.findFirst({ where: { slug: "nexora" } });
  if (!business) throw new Error("Staging business 'nexora' not found");

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: "worker-test-user",
        email: "worker-test-owner@example.com",
        name: "Worker Test User",
        emailVerified: true,
      },
    });
  }

  const variant = await prisma.productVariant.findFirst({
    where: { product: { businessId: business.id } },
  });
  if (!variant) throw new Error("No variant found in staging db");

  console.log(`Using variant ${variant.id} (SKU: ${variant.sku}, Stock: ${variant.stock})`);

  // Create temporary test order
  const testOrder = await prisma.order.create({
    data: {
      businessId: business.id,
      orderNumber: `ORD-WORKER-${Date.now()}`,
      status: "PENDING",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      guestEmail: "worker-test@example.com",
      totalInCents: 10000,
      subtotalInCents: 10000,
      shippingInCents: 0,
      taxInCents: 0,
      currency: "USD",
    },
  });

  // 2. Insert an expired reservation (expiresAt 10 minutes ago)
  const expiredAt = new Date(Date.now() - 10 * 60 * 1000);
  const testReservation = await prisma.stockReservation.create({
    data: {
      orderId: testOrder.id,
      businessId: business.id,
      variantId: variant.id,
      quantity: 1,
      status: "PENDING",
      expiresAt: expiredAt,
    },
  });
  console.log(`Created expired reservation ${testReservation.id} (status: PENDING, expired: ${expiredAt.toISOString()})`);

  // 3. Insert a queued notification outbox item
  const testNotification = await prisma.notification.create({
    data: {
      businessId: business.id,
      userId: user.id,
      type: "ORDER_PLACED",
      title: "Worker Test Notification",
      message: "Order has been placed",
      deliveryStatus: "QUEUED",
      emailTo: "worker-test@example.com",
      emailSubject: "Worker Test Notification",
    },
  });
  console.log(`Created queued notification ${testNotification.id}`);

  // 4. Insert an expired trial SaaS subscription
  const plan = await prisma.saaSPlan.findFirst({ where: { code: "starter" }, include: { prices: true } });
  if (!plan || !plan.prices.length) throw new Error("Starter plan not found in staging");

  const subBusiness = await prisma.business.create({
    data: {
      slug: `worker-sub-test-${Date.now()}`,
      name: "Worker Sub Test Store",
      currency: "USD",
    },
  });

  const trialEndedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const testSub = await prisma.saaSSubscription.create({
    data: {
      businessId: subBusiness.id,
      planId: plan.id,
      priceId: plan.prices[0].id,
      status: "TRIALING",
      trialEndsAt: trialEndedAt,
      currentPeriodStartsAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      currentPeriodEndsAt: trialEndedAt,
    },
  });
  console.log(`Created expired trial subscription ${testSub.id} for business ${subBusiness.slug}`);

  console.log("\nWaiting 14 seconds for worker container cycle to process tasks...");
  await new Promise((resolve) => setTimeout(resolve, 14000));

  // 5. Verify results
  const updatedReservation = await prisma.stockReservation.findUnique({
    where: { id: testReservation.id },
  });
  console.log(`Reservation ${testReservation.id} status after worker sweep: ${updatedReservation?.status}`);

  const updatedNotification = await prisma.notification.findUnique({
    where: { id: testNotification.id },
  });
  console.log(`Notification ${testNotification.id} deliveryStatus after worker sweep: ${updatedNotification?.deliveryStatus}`);

  const updatedSub = await prisma.saaSSubscription.findUnique({
    where: { id: testSub.id },
  });
  console.log(`Subscription ${testSub.id} status after worker sweep: ${updatedSub?.status}`);

  const success =
    updatedReservation?.status === "EXPIRED" &&
    updatedNotification?.deliveryStatus === "SENT" &&
    (updatedSub?.status === "EXPIRED" || updatedSub?.status === "CANCELLED" || updatedSub?.status === "PAST_DUE");

  if (success) {
    console.log("\n>>> WORKER STAGING VERIFICATION PASSED: All 3 tasks executed automatically by worker container! <<<");
  } else {
    console.error("\n>>> WORKER STAGING VERIFICATION FAILED: One or more tasks were not processed! <<<");
  }

  // Cleanup test entities
  await prisma.stockReservation.delete({ where: { id: testReservation.id } }).catch(() => {});
  await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
  await prisma.notification.delete({ where: { id: testNotification.id } }).catch(() => {});
  await prisma.saaSSubscription.delete({ where: { id: testSub.id } }).catch(() => {});
  await prisma.business.delete({ where: { id: subBusiness.id } }).catch(() => {});

  await prisma.$disconnect();

  if (!success) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
