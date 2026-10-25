import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import type {
  User,
  Product,
  ProductVariant,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from "@prisma/client";
import {
  updateAdminOrderStatus,
  getAdminOrderMetrics,
} from "./admin-order.service";
import {
  updateOrderShipment,
  validateTrackingUrl,
  computeOrderDeliveryTimeline,
} from "./shipment.service";
import {
  requestOrderCancellation,
  reviewOrderCancellation,
} from "./cancellation.service";
import {
  createReturnRequest,
  reviewReturnRequest,
  recordManualRefund,
} from "./return.service";
import {
  createSupportTicket,
  addTicketMessage,
  getSupportTicketById,
} from "./support-ticket.service";
import {
  sendTransactionalNotification,
  generateLuxuryEmailHtml,
} from "./notification.service";
import {
  getAdminCustomers,
  getAdminCustomerById,
} from "./admin-customer.service";
import { getOrderForCustomer } from "./order.service";

describe("NEXORA Commerce — Phase 5 Order Lifecycle, Operations & Support Engine", () => {
  let customerUser1: User;
  let customerUser2: User;
  let adminStaffUser: User;
  let testProduct: Product & { variants: ProductVariant[] };
  let testVariant1: ProductVariant;
  let testVariant2: ProductVariant;
  const uniqueTestId = `p5_${Date.now()}`;

  beforeAll(async () => {
    // 1. Create Customer 1
    customerUser1 = await prisma.user.create({
      data: {
        name: "Lady Genevieve Vance",
        email: `genevieve_${uniqueTestId}@nexora-test.luxury`,
        role: "CUSTOMER",
      },
    });

    // 2. Create Customer 2
    customerUser2 = await prisma.user.create({
      data: {
        name: "Lord Julian Sterling",
        email: `julian_${uniqueTestId}@nexora-test.luxury`,
        role: "CUSTOMER",
      },
    });

    // 3. Create Admin Staff Member
    adminStaffUser = await prisma.user.create({
      data: {
        name: "Henrietta Croft (Concierge)",
        email: `henrietta_${uniqueTestId}@nexora.com`,
        role: "STAFF",
      },
    });

    // 4. Create Test Product & Variants
    testProduct = await prisma.product.create({
      data: {
        title: `Phase 5 Bespoke Capelet ${uniqueTestId}`,
        slug: `phase-5-capelet-${uniqueTestId}`,
        description: "Artisanal cashmere capelet for lifecycle verification.",
        category: "Outerwear",
        basePriceInCents: 150000,
        published: true,
        variants: {
          create: [
            {
              sku: `CAP-BLK-${uniqueTestId}`,
              title: "Noir / Taille Unique",
              priceInCents: 150000,
              stock: 10,
            },
            {
              sku: `CAP-IVR-${uniqueTestId}`,
              title: "Ivoire / Taille Unique",
              priceInCents: 160000,
              stock: 8,
            },
          ],
        },
      },
      include: { variants: true },
    });

    testVariant1 = testProduct.variants[0];
    testVariant2 = testProduct.variants[1];
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.ticketMessage.deleteMany({
      where: { senderId: { in: [customerUser1.id, customerUser2.id, adminStaffUser.id] } },
    });
    await prisma.supportTicket.deleteMany({
      where: { userId: { in: [customerUser1.id, customerUser2.id] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [customerUser1.id, customerUser2.id] } },
    });
    await prisma.returnRequest.deleteMany({
      where: { userId: { in: [customerUser1.id, customerUser2.id] } },
    });
    await prisma.shipment.deleteMany({
      where: { order: { userId: { in: [customerUser1.id, customerUser2.id] } } },
    });
    await prisma.stockReservation.deleteMany({
      where: { order: { userId: { in: [customerUser1.id, customerUser2.id] } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: [customerUser1.id, customerUser2.id] } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: { in: [customerUser1.id, customerUser2.id] } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [customerUser1.id, customerUser2.id] } },
    });
    await prisma.inventoryMovement.deleteMany({
      where: { variantId: { in: [testVariant1.id, testVariant2.id] } },
    });
    await prisma.productVariant.deleteMany({
      where: { productId: testProduct.id },
    });
    await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [customerUser1.id, customerUser2.id, adminStaffUser.id] } },
    });
  });

  // Helper to create an order quickly
  async function createTestOrder(params: {
    userId: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    totalInCents?: number;
    items?: Array<{ variantId: string; quantity: number; priceInCents: number }>;
  }) {
    const orderNumber = `NXR-P5-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const items = params.items || [
      { variantId: testVariant1.id, quantity: 2, priceInCents: 150000 },
    ];
    const totalInCents = params.totalInCents || 300000;

    return await prisma.order.create({
      data: {
        orderNumber,
        userId: params.userId,
        status: params.status || "PENDING",
        paymentStatus: params.paymentStatus || "UNPAID",
        fulfillmentStatus: params.fulfillmentStatus || "UNFULFILLED",
        currency: "USD",
        subtotalInCents: totalInCents,
        totalInCents,
        shippingMethod: "EXPRESS",
        items: {
          create: items.map((i) => ({
            productId: testProduct.id,
            variantId: i.variantId,
            productTitle: testProduct.title,
            variantTitle: "Noir",
            sku: `SKU-${Date.now()}`,
            priceInCents: i.priceInCents,
            quantity: i.quantity,
            subtotalInCents: i.priceInCents * i.quantity,
          })),
        },
      },
      include: { items: true, shipments: true },
    });
  }

  describe("1. Order Lifecycle & Fulfillment Transitions", () => {
    it("should reject invalid transitions: moving an unpaid order directly to fulfillment", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PENDING",
        paymentStatus: "UNPAID",
      });

      await expect(
        updateAdminOrderStatus(order.id, "PROCESSING")
      ).rejects.toThrow(/because payment status is "UNPAID"/);

      await expect(
        updateAdminOrderStatus(order.id, "SHIPPED")
      ).rejects.toThrow(/because payment status is "UNPAID"/);
    });

    it("should reject fraudulent manual marking of an unpaid order as PAID", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PENDING",
        paymentStatus: "UNPAID",
      });

      await expect(
        updateAdminOrderStatus(order.id, "PAID")
      ).rejects.toThrow(/Orders cannot be manually marked as PAID/);
    });

    it("should allow valid fulfillment lifecycle progression for a confirmed paid order", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PAID",
        paymentStatus: "PAID",
        fulfillmentStatus: "UNFULFILLED",
      });

      // Advance to PROCESSING
      const processing = await updateAdminOrderStatus(order.id, "PROCESSING", "Commencing atelier cutting");
      expect(processing.status).toBe("PROCESSING");
      expect(processing.fulfillmentStatus).toBe("PROCESSING");

      // Advance to PACKED
      const packed = await updateAdminOrderStatus(order.id, "PACKED", "Quality inspection verified");
      expect(packed.status).toBe("PACKED");
      expect(packed.fulfillmentStatus).toBe("PACKED");

      // Advance to SHIPPED
      const shipped = await updateAdminOrderStatus(order.id, "SHIPPED", "Handed to courier");
      expect(shipped.status).toBe("SHIPPED");
      expect(shipped.fulfillmentStatus).toBe("SHIPPED");

      // Advance to DELIVERED
      const delivered = await updateAdminOrderStatus(order.id, "DELIVERED", "Delivered with signature");
      expect(delivered.status).toBe("DELIVERED");
      expect(delivered.fulfillmentStatus).toBe("DELIVERED");
    });

    it("should strictly prevent cancelling a dispatched or delivered order without return workflow", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "SHIPPED",
        paymentStatus: "PAID",
        fulfillmentStatus: "SHIPPED",
      });

      await expect(
        updateAdminOrderStatus(order.id, "CANCELLED")
      ).rejects.toThrow(/Cancellation is forbidden; please initiate a Return Request/);
    });
  });

  describe("2. Customer Order Privacy & Isolation", () => {
    it("should allow customers to view their own order", async () => {
      const order = await createTestOrder({ userId: customerUser1.id });
      const fetched = await getOrderForCustomer(order.id, { userId: customerUser1.id });
      expect(fetched?.id).toBe(order.id);
    });

    it("should strictly deny access when Customer 2 attempts to query Customer 1's order", async () => {
      const order = await createTestOrder({ userId: customerUser1.id });
      await expect(
        getOrderForCustomer(order.id, { userId: customerUser2.id })
      ).rejects.toThrow(/Access denied: You are not authorized/);
    });

    it("should allow store administrators to view any order", async () => {
      const order = await createTestOrder({ userId: customerUser1.id });
      const fetched = await getOrderForCustomer(order.id, { isAdmin: true });
      expect(fetched?.id).toBe(order.id);
    });
  });

  describe("3. Shipping, Tracking & Timeline Verification", () => {
    it("should validate and reject malicious or unsafe tracking URLs", () => {
      expect(validateTrackingUrl("https://www.dhl.com/track/123")).toBe("https://www.dhl.com/track/123");
      expect(validateTrackingUrl("http://tracking.boutiquecourier.com/consignment/456")).toBe("http://tracking.boutiquecourier.com/consignment/456");
      expect(() => validateTrackingUrl("javascript:alert('xss')")).toThrow(/Invalid tracking link protocol/);
      expect(() => validateTrackingUrl("data:text/html,<script>alert(1)</script>")).toThrow(/Invalid tracking link protocol/);
      expect(() => validateTrackingUrl("not-a-valid-url")).toThrow(/Invalid tracking URL format/);
      expect(validateTrackingUrl("   ")).toBeNull();
    });

    it("should create and update shipment details, updating fulfillment status to SHIPPED", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PAID",
        paymentStatus: "PAID",
      });

      const shipment = await updateOrderShipment({
        orderId: order.id,
        carrier: "DHL Express",
        trackingNumber: "DHL-987654321",
        trackingUrl: "https://www.dhl.com/track/987654321",
        status: "IN_TRANSIT",
        notes: "Fragile silk garment wrap",
      });

      expect(shipment.carrier).toBe("DHL Express");
      expect(shipment.trackingNumber).toBe("DHL-987654321");
      expect(shipment.trackingUrl).toBe("https://www.dhl.com/track/987654321");
      expect(shipment.status).toBe("IN_TRANSIT");

      const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(refreshedOrder?.status).toBe("SHIPPED");
      expect(refreshedOrder?.fulfillmentStatus).toBe("SHIPPED");
    });

    it("should compute accurate multi-step customer delivery timeline", async () => {
      const timeline = computeOrderDeliveryTimeline({
        status: "SHIPPED",
        fulfillmentStatus: "SHIPPED",
        createdAt: new Date("2026-10-20T10:00:00Z"),
        paidAt: new Date("2026-10-20T10:05:00Z"),
        shipments: [
          {
            status: "IN_TRANSIT",
            carrier: "FedEx International",
            trackingNumber: "FX-11223344",
            trackingUrl: "https://fedex.com/track/FX-11223344",
            shippedAt: new Date("2026-10-21T14:00:00Z"),
          },
        ],
      });

      expect(timeline.carrier).toBe("FedEx International");
      expect(timeline.trackingNumber).toBe("FX-11223344");
      expect(timeline.steps.find((s) => s.id === "ORDER_PLACED")?.completed).toBe(true);
      expect(timeline.steps.find((s) => s.id === "PAYMENT_CONFIRMED")?.completed).toBe(true);
      expect(timeline.steps.find((s) => s.id === "DISPATCHED")?.completed).toBe(true);
      expect(timeline.steps.find((s) => s.id === "DELIVERED")?.completed).toBe(false);
    });
  });

  describe("4. Cancellation Workflows & Stock Restoration", () => {
    it("should immediately cancel an unpaid order and release reservations", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PENDING",
        paymentStatus: "UNPAID",
      });

      // Add a reservation
      await prisma.stockReservation.create({
        data: {
          orderId: order.id,
          variantId: testVariant1.id,
          quantity: 2,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
      });

      const result = await requestOrderCancellation({
        orderId: order.id,
        userId: customerUser1.id,
        requestedBy: "CUSTOMER",
        reason: "Ordered wrong size",
      });

      expect(result.success).toBe(true);
      expect(result.immediateCancellation).toBe(true);

      const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
      expect(refreshed?.status).toBe("CANCELLED");
      expect(refreshed?.cancelReason).toContain("Ordered wrong size");

      const reservation = await prisma.stockReservation.findFirst({ where: { orderId: order.id } });
      expect(reservation?.status).toBe("RELEASED");
    });

    it("should submit a pending review request for a paid order, then safely approve and flag for refund", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PAID",
        paymentStatus: "PAID",
        fulfillmentStatus: "UNFULFILLED",
      });

      // Customer requests cancellation
      const customerReq = await requestOrderCancellation({
        orderId: order.id,
        userId: customerUser1.id,
        requestedBy: "CUSTOMER",
        reason: "Traveling abroad unexpectedly",
      });

      expect(customerReq.success).toBe(true);
      expect(customerReq.pendingAdminReview).toBe(true);

      const pendingOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(pendingOrder?.cancellationRequested).toBe(true);

      // Admin approves cancellation
      const initialStock = (await prisma.productVariant.findUnique({ where: { id: testVariant1.id } }))?.stock || 0;

      const review = await reviewOrderCancellation({
        orderId: order.id,
        adminUserId: adminStaffUser.id,
        decision: "APPROVED",
        adminNotes: "Client called concierge desk to confirm departure",
      });

      expect(review.success).toBe(true);
      expect(review.decision).toBe("APPROVED");
      expect(review.refundRequired).toBe(true);

      const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(finalOrder?.status).toBe("CANCELLED");
      expect(finalOrder?.refundRequired).toBe(true);
      expect(finalOrder?.refundAmountInCents).toBe(order.totalInCents);

      // Stock should have been restored (+2 items)
      const afterStock = (await prisma.productVariant.findUnique({ where: { id: testVariant1.id } }))?.stock || 0;
      expect(afterStock).toBe(initialStock + 2);
    });

    it("should handle duplicate cancellation requests idempotently", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "CANCELLED",
        paymentStatus: "UNPAID",
      });

      const secondAttempt = await requestOrderCancellation({
        orderId: order.id,
        userId: customerUser1.id,
        requestedBy: "CUSTOMER",
        reason: "Duplicate cancellation trigger",
      });

      expect(secondAttempt.success).toBe(true);
      expect(secondAttempt.alreadyCancelled).toBe(true);
    });
  });

  describe("5. Returns & Manual Refunds Foundation", () => {
    it("should strictly reject return request if order is not delivered", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "PROCESSING",
        paymentStatus: "PAID",
      });

      await expect(
        createReturnRequest({
          orderId: order.id,
          userId: customerUser1.id,
          requestedQuantity: 1,
          reason: "Fabric too heavy",
        })
      ).rejects.toThrow(/Returns are only permitted for delivered orders/);
    });

    it("should reject return quantity exceeding purchased item quantity", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "DELIVERED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        items: [{ variantId: testVariant1.id, quantity: 2, priceInCents: 150000 }],
      });

      const orderItem = order.items[0];

      await expect(
        createReturnRequest({
          orderId: order.id,
          orderItemId: orderItem.id,
          userId: customerUser1.id,
          requestedQuantity: 5, // Purchased only 2!
          reason: "Too many items",
        })
      ).rejects.toThrow(/exceeds purchased quantity/);
    });

    it("should create, review, and complete a return request, restocking inventory with audit record", async () => {
      const order = await createTestOrder({
        userId: customerUser1.id,
        status: "DELIVERED",
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        items: [{ variantId: testVariant1.id, quantity: 2, priceInCents: 150000 }],
      });

      const orderItem = order.items[0];

      // Customer creates return request
      const returnReq = await createReturnRequest({
        orderId: order.id,
        orderItemId: orderItem.id,
        userId: customerUser1.id,
        requestedQuantity: 1,
        reason: "Slight seam variance upon unboxing",
      });

      expect(returnReq.status).toBe("PENDING");
      expect(returnReq.returnNumber).toMatch(/^RET-/);

      // Check order status changed to RETURN_REQUESTED
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe("RETURN_REQUESTED");

      // Admin completes inspection and restocks
      const stockBefore = (await prisma.productVariant.findUnique({ where: { id: testVariant1.id } }))?.stock || 0;

      const completed = await reviewReturnRequest({
        returnRequestId: returnReq.id,
        adminUserId: adminStaffUser.id,
        status: "COMPLETED",
        resolutionNotes: "Garment returned in pristine condition. Tags attached.",
        refundStatus: "PENDING_MANUAL_REVIEW",
        refundAmountInCents: 150000,
        restockInventory: true,
      });

      expect(completed.status).toBe("COMPLETED");
      expect(completed.refundStatus).toBe("PENDING_MANUAL_REVIEW");

      // Verify stock was restored (+1)
      const stockAfter = (await prisma.productVariant.findUnique({ where: { id: testVariant1.id } }))?.stock || 0;
      expect(stockAfter).toBe(stockBefore + 1);

      // Verify audit movement was logged
      const movement = await prisma.inventoryMovement.findFirst({
        where: { reference: returnReq.id, type: "RETURN" },
      });
      expect(movement).toBeDefined();
      expect(movement?.quantityChange).toBe(1);

      // Reconcile manual refund
      const refundResult = await recordManualRefund({
        orderId: order.id,
        adminUserId: adminStaffUser.id,
        refundAmountInCents: 150000,
        reconciliationReference: "BANK-WIRE-REF-987123",
        notes: "Processed via Treasury wire reversal",
      });

      expect(refundResult.paymentStatus).toBe("REFUNDED");
      expect(refundResult.refundAmountInCents).toBe(150000);
      expect(refundResult.notes).toContain("BANK-WIRE-REF-987123");
    });
  });

  describe("6. Customer Support Ticket Architecture", () => {
    it("should allow a customer to create a support ticket linked to an order", async () => {
      const order = await createTestOrder({ userId: customerUser1.id });

      const ticket = await createSupportTicket({
        userId: customerUser1.id,
        orderId: order.id,
        subject: "Delivery window inquiry",
        description: "Will the consignment require an adult signature upon arrival?",
        priority: "NORMAL",
      });

      expect(ticket.ticketNumber).toMatch(/^TCK-/);
      expect(ticket.status).toBe("OPEN");
      expect(ticket.subject).toBe("Delivery window inquiry");
    });

    it("should strictly prevent customer from linking a ticket to another customer's order", async () => {
      const orderOfCustomer1 = await createTestOrder({ userId: customerUser1.id });

      await expect(
        createSupportTicket({
          userId: customerUser2.id, // Customer 2 tries to link to Customer 1's order
          orderId: orderOfCustomer1.id,
          subject: "Rogue ticket attempt",
          description: "Should fail authorization",
        })
      ).rejects.toThrow(/Specified order does not exist or does not belong to your account/);
    });

    it("should mask staff internal notes when viewed by the customer", async () => {
      const ticket = await createSupportTicket({
        userId: customerUser1.id,
        subject: "Concierge gift wrapping request",
        description: "Please include a gold embossed greeting card.",
      });

      // 1. Customer adds public message
      await addTicketMessage({
        ticketId: ticket.id,
        senderId: customerUser1.id,
        senderRole: "CUSTOMER",
        message: "The inscription should read: 'With highest regards'.",
      });

      // 2. Staff adds internal note (hidden from customer)
      await addTicketMessage({
        ticketId: ticket.id,
        senderId: adminStaffUser.id,
        senderRole: "STAFF",
        message: "INTERNAL NOTE: Verified VIP client. Dispatch complimentary ribbon.",
        isInternalNote: true,
      });

      // 3. Staff adds public response
      await addTicketMessage({
        ticketId: ticket.id,
        senderId: adminStaffUser.id,
        senderRole: "STAFF",
        message: "It will be our pleasure. The gold embossed card has been prepared.",
        isInternalNote: false,
      });

      // Customer fetches ticket: must NOT see internal note!
      const customerView = await getSupportTicketById(ticket.id, customerUser1.id, "CUSTOMER");
      expect(customerView?.messages.length).toBe(3); // Initial description + 1 customer message + 1 staff public response
      expect(customerView?.messages.some((m) => m.isInternalNote)).toBe(false);

      // Staff fetches ticket: DOES see internal note!
      const staffView = await getSupportTicketById(ticket.id, adminStaffUser.id, "STAFF");
      expect(staffView?.messages.length).toBe(4);
      expect(staffView?.messages.some((m) => m.isInternalNote)).toBe(true);
    });

    it("should strictly reject customer from adding an internal note or messaging another's ticket", async () => {
      const ticket = await createSupportTicket({
        userId: customerUser1.id,
        subject: "Customer 1 Ticket",
        description: "Private message",
      });

      // Customer 1 cannot forge an internal note
      await expect(
        addTicketMessage({
          ticketId: ticket.id,
          senderId: customerUser1.id,
          senderRole: "CUSTOMER",
          message: "Forge internal note",
          isInternalNote: true,
        })
      ).rejects.toThrow(/Customers cannot create internal notes/);

      // Customer 2 cannot message Customer 1's ticket
      await expect(
        addTicketMessage({
          ticketId: ticket.id,
          senderId: customerUser2.id,
          senderRole: "CUSTOMER",
          message: "Intrude on Customer 1 ticket",
        })
      ).rejects.toThrow(/You can only message your own support tickets/);
    });
  });

  describe("7. Transactional Notifications & Email Templates", () => {
    it("should generate a luxury branded HTML email template without errors", () => {
      const html = generateLuxuryEmailHtml({
        headline: "Order Dispatched",
        previewText: "Your piece is en route",
        clientName: "Lady Genevieve",
        bodyContent: "<p>Dispatched via DHL Express.</p>",
        actionText: "View Tracking",
        actionUrl: "https://dhl.com/track/123",
      });

      expect(html).toContain("NEXORA");
      expect(html).toContain("Order Dispatched");
      expect(html).toContain("Lady Genevieve");
      expect(html).toContain("View Tracking");
      expect(html).toContain("https://dhl.com/track/123");
    });

    it("should record transactional notification with outbox delivery status", async () => {
      const result = await sendTransactionalNotification({
        userId: customerUser1.id,
        type: "ORDER_PLACED",
        title: "Order Placed Successfully",
        message: "Your reservation has been recorded.",
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();

      const record = await prisma.notification.findUnique({
        where: { id: result.notificationId },
      });
      expect(record?.deliveryStatus).toBe("SENT");
      expect(record?.emailSubject).toBe("Order Placed Successfully");
    });
  });

  describe("8. Customer Administration & Authoritative Statistics", () => {
    it("should compute customer lifetime spend and order count authoritatively from PostgreSQL", async () => {
      // Create 2 paid orders and 1 cancelled order for Customer 2
      await createTestOrder({
        userId: customerUser2.id,
        status: "DELIVERED",
        paymentStatus: "PAID",
        totalInCents: 200000,
      });

      await createTestOrder({
        userId: customerUser2.id,
        status: "SHIPPED",
        paymentStatus: "PAID",
        totalInCents: 350000,
      });

      await createTestOrder({
        userId: customerUser2.id,
        status: "CANCELLED",
        paymentStatus: "UNPAID",
        totalInCents: 150000,
      });

      const customerProfile = await getAdminCustomerById(customerUser2.id);
      expect(customerProfile).toBeDefined();
      expect(customerProfile?.name).toBe("Lord Julian Sterling");
      // Paid total: 200,000 + 350,000 = 550,000. Cancelled order must NOT be included!
      expect(customerProfile?.totalSpendInCents).toBe(550000);
      expect(customerProfile?.orderCount).toBe(3);
    });

    it("should list admin customers with search and pagination", async () => {
      const result = await getAdminCustomers({
        search: "Sterling",
        limit: 10,
      });

      expect(result.customers.length).toBeGreaterThanOrEqual(1);
      const found = result.customers.find((c) => c.id === customerUser2.id);
      expect(found).toBeDefined();
      expect(found?.totalSpendInCents).toBe(550000);
    });
  });

  describe("9. Operational Dashboard Metrics", () => {
    it("should compute comprehensive real-time metrics across orders, fulfillment, support, and returns", async () => {
      const metrics = await getAdminOrderMetrics();

      expect(metrics.totalOrders).toBeGreaterThan(0);
      expect(metrics.paidOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.ordersAwaitingFulfillment).toBeGreaterThanOrEqual(0);
      expect(metrics.shippedOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.completedOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.openSupportTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.pendingReturnRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.confirmedRevenueInCents).toBeGreaterThan(0);
    });
  });
});
