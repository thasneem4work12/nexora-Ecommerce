import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createOrderFromCheckout,
  getOrderForCustomer,
  getCustomerOrderHistory,
  cancelCustomerOrder,
  generateOrderNumber,
} from "./order.service";

describe("Order Service (Transactional Checkout, Validation & History)", () => {
  let customerUserA: { id: string; email: string };
  let customerUserB: { id: string; email: string };
  let testProductId: string;
  let testVariantId: string;
  let createdOrderId: string;
  const unitPrice = 125000; // $1,250.00
  const initialStock = 8;

  beforeAll(async () => {
    // 1. Create two test customers for authorization testing
    const userA = await prisma.user.create({
      data: {
        id: `cust-a-${Date.now()}`,
        email: `client-a-${Date.now()}@nexoracommerce.com`,
        name: "Lady Eleanor Vance",
        role: "CUSTOMER",
      },
    });
    customerUserA = { id: userA.id, email: userA.email };

    const userB = await prisma.user.create({
      data: {
        id: `cust-b-${Date.now()}`,
        email: `client-b-${Date.now()}@nexoracommerce.com`,
        name: "Lord Marcus Vance",
        role: "CUSTOMER",
      },
    });
    customerUserB = { id: userB.id, email: userB.email };

    // 2. Create test product & variant
    const product = await prisma.product.create({
      data: {
        title: `Artisanal Leather Holdall ${Date.now()}`,
        slug: `leather-holdall-${Date.now()}`,
        description: "Handcrafted Tuscan leather travel bag.",
        category: "Leather Goods",
        basePriceInCents: unitPrice,
        published: true,
        variants: {
          create: {
            sku: `HOLDALL-${Date.now()}`,
            title: "Vintage Cognac",
            priceInCents: unitPrice,
            stock: initialStock,
          },
        },
      },
      include: { variants: true },
    });
    testProductId = product.id;
    testVariantId = product.variants[0].id;
  });

  afterAll(async () => {
    // Clean up created records
    await prisma.stockReservation.deleteMany({
      where: { variantId: testVariantId },
    });
    await prisma.inventoryMovement.deleteMany({
      where: { variantId: testVariantId },
    });
    await prisma.orderItem.deleteMany({
      where: { variantId: testVariantId },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [customerUserA.id, customerUserB.id] } },
    });
    await prisma.productVariant.deleteMany({
      where: { productId: testProductId },
    });
    await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [customerUserA.id, customerUserB.id] } },
    });
  });

  it("should generate a unique order reference code adhering to format NXR-YYYY-XXXXXX", async () => {
    const orderNumber = await generateOrderNumber();
    const currentYear = new Date().getFullYear();
    expect(orderNumber).toMatch(new RegExp(`^NXR-${currentYear}-[0-9A-F]{6}$`));
  });

  it("should create an order with authoritative totals and reserve stock", async () => {
    const order = await createOrderFromCheckout(
      {
        items: [{ variantId: testVariantId, quantity: 2 }],
        shippingAddress: {
          firstName: "Eleanor",
          lastName: "Vance",
          addressLine1: "10 Belgrave Square",
          city: "London",
          postalCode: "SW1X 8PH",
          country: "GB",
        },
        shippingMethod: "STANDARD",
        paymentProvider: "MOCK",
      },
      customerUserA.id
    );

    expect(order.id).toBeDefined();
    expect(order.orderNumber).toBeDefined();
    expect(order.userId).toBe(customerUserA.id);
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("UNPAID");

    // Subtotal: 2 * 125,000 = 250,000
    expect(order.subtotalInCents).toBe(250000);
    // Shipping: Free standard courier for orders >= $2,000 (200,000 cents)
    expect(order.shippingInCents).toBe(0);
    // Tax: 4% Europe rate on 250,000 = 10,000
    expect(order.taxInCents).toBe(10000);
    // Grand Total: 250,000 + 0 + 10,000 = 260,000
    expect(order.totalInCents).toBe(260000);

    // Verify item snapshot
    expect(order.items.length).toBe(1);
    expect(order.items[0].productTitle).toContain("Artisanal Leather Holdall");
    expect(order.items[0].sku).toContain("HOLDALL-");
    expect(order.items[0].priceInCents).toBe(unitPrice);
    expect(order.items[0].quantity).toBe(2);

    // Verify stock was decremented from 8 to 6
    const variant = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variant?.stock).toBe(initialStock - 2);

    createdOrderId = order.id;
  });

  it("should reject checkout when requested quantity exceeds available stock", async () => {
    await expect(
      createOrderFromCheckout(
        {
          items: [{ variantId: testVariantId, quantity: 50 }], // Stock is currently 6
          shippingAddress: {
            firstName: "Eleanor",
            lastName: "Vance",
            addressLine1: "10 Belgrave Square",
            city: "London",
            postalCode: "SW1X 8PH",
            country: "GB",
          },
          shippingMethod: "STANDARD",
          paymentProvider: "MOCK",
        },
        customerUserA.id
      )
    ).rejects.toThrow(/Insufficient stock/);
  });

  it("should strictly reject archived or unpublished creations", async () => {
    // Temporarily unpublish product
    await prisma.product.update({
      where: { id: testProductId },
      data: { published: false },
    });

    await expect(
      createOrderFromCheckout(
        {
          items: [{ variantId: testVariantId, quantity: 1 }],
          shippingAddress: {
            firstName: "Eleanor",
            lastName: "Vance",
            addressLine1: "10 Belgrave Square",
            city: "London",
            postalCode: "SW1X 8PH",
            country: "GB",
          },
          shippingMethod: "STANDARD",
          paymentProvider: "MOCK",
        },
        customerUserA.id
      )
    ).rejects.toThrow(/unavailable or archived/);

    // Restore publication
    await prisma.product.update({
      where: { id: testProductId },
      data: { published: true },
    });
  });

  it("should prevent overselling during concurrent simultaneous checkouts for the final piece", async () => {
    // 1. Setup isolated variant with exactly 1 piece in stock
    const rareProd = await prisma.product.create({
      data: {
        title: `One-of-a-kind Diamond Tiara ${Date.now()}`,
        slug: `diamond-tiara-${Date.now()}`,
        description: "Solitary museum piece.",
        category: "Jewellery",
        basePriceInCents: 5000000,
        published: true,
        variants: {
          create: {
            sku: `TIARA-SOLITARY-${Date.now()}`,
            title: "Platinum & Diamond",
            priceInCents: 5000000,
            stock: 1, // Only 1 unit in stock
          },
        },
      },
      include: { variants: true },
    });

    const solitaryVariant = rareProd.variants[0];

    try {
      // 2. Fire two concurrent checkout submissions requesting 1 piece simultaneously
      const [orderRes1, orderRes2] = await Promise.allSettled([
        createOrderFromCheckout(
          {
            items: [{ variantId: solitaryVariant.id, quantity: 1 }],
            shippingAddress: {
              firstName: "Client Alpha",
              lastName: "Alpha",
              addressLine1: "1 Avenue Montaigne",
              city: "Paris",
              postalCode: "75008",
              country: "FR",
            },
            shippingMethod: "WHITE_GLOVE",
            paymentProvider: "MOCK",
          },
          customerUserA.id
        ),
        createOrderFromCheckout(
          {
            items: [{ variantId: solitaryVariant.id, quantity: 1 }],
            shippingAddress: {
              firstName: "Client Beta",
              lastName: "Beta",
              addressLine1: "5th Avenue",
              city: "New York",
              postalCode: "10022",
              country: "US",
            },
            shippingMethod: "WHITE_GLOVE",
            paymentProvider: "MOCK",
          },
          customerUserB.id
        ),
      ]);

      const fulfilled = [orderRes1, orderRes2].filter((r) => r.status === "fulfilled");
      const rejected = [orderRes1, orderRes2].filter(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult[];

      // Exactly ONE checkout must succeed, and ONE must be blocked
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      expect(rejected[0].reason.message).toMatch(/Insufficient stock/);

      // Verify stock in database is exactly 0 and NEVER dropped into negative values
      const dbVar = await prisma.productVariant.findUnique({
        where: { id: solitaryVariant.id },
      });
      expect(dbVar?.stock).toBe(0);
    } finally {
      // Cleanup solitary test records
      await prisma.stockReservation.deleteMany({
        where: { variantId: solitaryVariant.id },
      });
      await prisma.inventoryMovement.deleteMany({
        where: { variantId: solitaryVariant.id },
      });
      await prisma.orderItem.deleteMany({
        where: { variantId: solitaryVariant.id },
      });
      await prisma.productVariant.deleteMany({
        where: { productId: rareProd.id },
      });
      await prisma.product.delete({ where: { id: rareProd.id } }).catch(() => {});
    }
  });

  it("should prevent unauthorized customers from accessing another customer's order", async () => {
    // User A attempts to view their own order -> Succeeded
    const orderForA = await getOrderForCustomer(createdOrderId, {
      userId: customerUserA.id,
    });
    expect(orderForA).toBeDefined();
    expect(orderForA?.id).toBe(createdOrderId);

    // User B attempts to access User A's order -> Must throw Access Denied
    await expect(
      getOrderForCustomer(createdOrderId, {
        userId: customerUserB.id,
      })
    ).rejects.toThrow(/Access denied/);
  });

  it("should retrieve historical orders for an authenticated customer", async () => {
    const history = await getCustomerOrderHistory(customerUserA.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history.some((o) => o.id === createdOrderId)).toBe(true);
  });

  it("should allow a customer to cancel an eligible order and release reserved stock", async () => {
    const variantBefore = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });

    const cancelledOrder = await cancelCustomerOrder(
      createdOrderId,
      customerUserA.id,
      "Decided on a bespoke customized sizing"
    );

    expect(cancelledOrder.status).toBe("CANCELLED");
    expect(cancelledOrder.cancelReason).toBe("Decided on a bespoke customized sizing");
    expect(cancelledOrder.cancelledAt).toBeInstanceOf(Date);

    // Verify stock was restored (+2)
    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantAfter?.stock).toBe(variantBefore!.stock + 2);
  });
});
