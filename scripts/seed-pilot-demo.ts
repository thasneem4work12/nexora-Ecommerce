import { PrismaClient, OrderStatus, FulfillmentStatus, PaymentStatus, TicketStatus, TicketPriority, Role, SaaSSubscriptionStatus, SaaSInvoiceStatus, SaaSPaymentStatus, SaaSBillingInterval } from "@prisma/client";
import { seedSaaSPlans } from "./seed-saas-plans";

const prisma = new PrismaClient();

export async function seedPilotDemo() {
  console.log("===================================================================");
  console.log("       NEXORA COMMERCE — ZERO-COST PILOT DEMO DATA SEEDER           ");
  console.log("===================================================================");

  // 1. Seed Base SaaS Plans
  console.log("\n[1/7] Ensuring SaaS Plans (Starter, Growth, Enterprise)...");
  await seedSaaSPlans();

  // 2. Ensure Superadmin & Demo Customers
  console.log("\n[2/7] Seeding Administrative and Demo Customer Users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@nexoracommerce.com" },
    update: {
      name: "Platform Master Admin",
      role: Role.SUPERADMIN,
    },
    create: {
      id: "usr_master_admin",
      name: "Platform Master Admin",
      email: "admin@nexoracommerce.com",
      role: Role.SUPERADMIN,
    },
  });

  const customerLuxury = await prisma.user.upsert({
    where: { email: "customer.luxury@example.com" },
    update: { name: "Elena Rostova", role: Role.CUSTOMER },
    create: {
      id: "usr_cust_luxury",
      name: "Elena Rostova",
      email: "customer.luxury@example.com",
      role: Role.CUSTOMER,
    },
  });

  const customerTech = await prisma.user.upsert({
    where: { email: "tester.tech@example.com" },
    update: { name: "David Miller", role: Role.CUSTOMER },
    create: {
      id: "usr_cust_tech",
      name: "David Miller",
      email: "tester.tech@example.com",
      role: Role.CUSTOMER,
    },
  });

  const customerStreet = await prisma.user.upsert({
    where: { email: "tester.street@example.com" },
    update: { name: "Jordan Reed", role: Role.CUSTOMER },
    create: {
      id: "usr_cust_street",
      name: "Jordan Reed",
      email: "tester.street@example.com",
      role: Role.CUSTOMER,
    },
  });

  // Seed Addresses for Demo Customers
  const addrLuxury = await prisma.address.upsert({
    where: { id: "addr_luxury_demo" },
    update: {},
    create: {
      id: "addr_luxury_demo",
      userId: customerLuxury.id,
      firstName: "Elena",
      lastName: "Rostova",
      addressLine1: "15 Avenue Montaigne",
      addressLine2: "Suite 4B",
      city: "Paris",
      stateOrProvince: "Île-de-France",
      postalCode: "75008",
      country: "FR",
      phone: "+33 1 42 68 00 00",
    },
  });

  const addrTech = await prisma.address.upsert({
    where: { id: "addr_tech_demo" },
    update: {},
    create: {
      id: "addr_tech_demo",
      userId: customerTech.id,
      firstName: "David",
      lastName: "Miller",
      addressLine1: "500 Howard Street",
      city: "San Francisco",
      stateOrProvince: "CA",
      postalCode: "94105",
      country: "US",
      phone: "+1 415 555 0192",
    },
  });

  const addrStreet = await prisma.address.upsert({
    where: { id: "addr_street_demo" },
    update: {},
    create: {
      id: "addr_street_demo",
      userId: customerStreet.id,
      firstName: "Jordan",
      lastName: "Reed",
      addressLine1: "128 Mercer St",
      city: "New York",
      stateOrProvince: "NY",
      postalCode: "10012",
      country: "US",
      phone: "+1 212 555 0184",
    },
  });

  // 3. Seed Businesses & Themes
  console.log("\n[3/7] Setting up 3 Pilot Demo Businesses & Brand Themes...");

  // Business 1: NEXORA Luxury Atelier
  const bizNexora = await prisma.business.upsert({
    where: { id: "default-store" },
    update: {
      slug: "nexora",
      name: "NEXORA Luxury Atelier",
      type: "LUXURY_FASHION",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@nexoracommerce.com",
      description: "Haute couture, bespoke tailoring, and heirloom artisan accessories.",
    },
    create: {
      id: "default-store",
      slug: "nexora",
      name: "NEXORA Luxury Atelier",
      type: "LUXURY_FASHION",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@nexoracommerce.com",
      description: "Haute couture, bespoke tailoring, and heirloom artisan accessories.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: bizNexora.id },
    update: { orderPrefix: "NXR", allowMockPayment: true, inventoryTracking: true },
    create: { businessId: bizNexora.id, orderPrefix: "NXR", allowMockPayment: true, inventoryTracking: true },
  });

  await prisma.storeThemeConfig.upsert({
    where: { businessId: bizNexora.id },
    update: {
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture & Heritage Tailoring",
      contactEmail: "concierge@nexoracommerce.com",
      announcementEnabled: true,
      announcementText: "Complimentary Global Courier Delivery on Curated Orders",
    },
    create: {
      businessId: bizNexora.id,
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture & Heritage Tailoring",
      contactEmail: "concierge@nexoracommerce.com",
      announcementEnabled: true,
      announcementText: "Complimentary Global Courier Delivery on Curated Orders",
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: bizNexora.id, userId: adminUser.id } },
    update: { role: Role.OWNER, title: "Managing Director" },
    create: { businessId: bizNexora.id, userId: adminUser.id, role: Role.OWNER, title: "Managing Director" },
  });

  // Business 2: Lumina Audio & Tech
  const bizLumina = await prisma.business.upsert({
    where: { id: "biz-lumina-tech" },
    update: {
      slug: "lumina-tech",
      name: "Lumina Audio & Tech",
      type: "ELECTRONICS",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "contact@lumina-tech.com",
      description: "Studio reference acoustics, planar magnetic transducers, and precision workspace gear.",
    },
    create: {
      id: "biz-lumina-tech",
      slug: "lumina-tech",
      name: "Lumina Audio & Tech",
      type: "ELECTRONICS",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "contact@lumina-tech.com",
      description: "Studio reference acoustics, planar magnetic transducers, and precision workspace gear.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: bizLumina.id },
    update: { orderPrefix: "LUM", allowMockPayment: true, inventoryTracking: true },
    create: { businessId: bizLumina.id, orderPrefix: "LUM", allowMockPayment: true, inventoryTracking: true },
  });

  await prisma.storeThemeConfig.upsert({
    where: { businessId: bizLumina.id },
    update: {
      activeThemeId: "modern-minimal",
      storeName: "Lumina Audio",
      storeTagline: "Studio Reference Acoustics & Engineering",
      contactEmail: "support@lumina-tech.com",
      primaryColor: "#0F172A",
      secondaryColor: "#64748B",
      announcementEnabled: true,
      announcementText: "Complimentary Calibration Cables with Reference Studio Monitors",
    },
    create: {
      businessId: bizLumina.id,
      activeThemeId: "modern-minimal",
      storeName: "Lumina Audio",
      storeTagline: "Studio Reference Acoustics & Engineering",
      contactEmail: "support@lumina-tech.com",
      primaryColor: "#0F172A",
      secondaryColor: "#64748B",
      announcementEnabled: true,
      announcementText: "Complimentary Calibration Cables with Reference Studio Monitors",
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: bizLumina.id, userId: adminUser.id } },
    update: { role: Role.OWNER, title: "Founder & Chief Architect" },
    create: { businessId: bizLumina.id, userId: adminUser.id, role: Role.OWNER, title: "Founder & Chief Architect" },
  });

  // Business 3: Apex Kicks & Streetwear
  const bizApex = await prisma.business.upsert({
    where: { id: "biz-apex-kicks" },
    update: {
      slug: "apex-kicks",
      name: "Apex Kicks & Streetwear",
      type: "STREETWEAR",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "crew@apex-kicks.com",
      description: "Limited drops, archival retros, and heavyweight streetwear silhouettes.",
    },
    create: {
      id: "biz-apex-kicks",
      slug: "apex-kicks",
      name: "Apex Kicks & Streetwear",
      type: "STREETWEAR",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "crew@apex-kicks.com",
      description: "Limited drops, archival retros, and heavyweight streetwear silhouettes.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: bizApex.id },
    update: { orderPrefix: "APX", allowMockPayment: true, inventoryTracking: true },
    create: { businessId: bizApex.id, orderPrefix: "APX", allowMockPayment: true, inventoryTracking: true },
  });

  await prisma.storeThemeConfig.upsert({
    where: { businessId: bizApex.id },
    update: {
      activeThemeId: "orange-energy",
      storeName: "APEX KICKS",
      storeTagline: "High-Velocity Streetwear & Sneaker Drops",
      contactEmail: "drops@apex-kicks.com",
      primaryColor: "#FF5500",
      secondaryColor: "#111111",
      announcementEnabled: true,
      announcementText: "FLASH DROP ARCHIVE: LIMITED ALLOCATION PER IP",
    },
    create: {
      businessId: bizApex.id,
      activeThemeId: "orange-energy",
      storeName: "APEX KICKS",
      storeTagline: "High-Velocity Streetwear & Sneaker Drops",
      contactEmail: "drops@apex-kicks.com",
      primaryColor: "#FF5500",
      secondaryColor: "#111111",
      announcementEnabled: true,
      announcementText: "FLASH DROP ARCHIVE: LIMITED ALLOCATION PER IP",
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: bizApex.id, userId: adminUser.id } },
    update: { role: Role.OWNER, title: "Creative Lead" },
    create: { businessId: bizApex.id, userId: adminUser.id, role: Role.OWNER, title: "Creative Lead" },
  });

  // 4. Seed Product Catalogs (with healthy, low, and out-of-stock items)
  console.log("\n[4/7] Seeding Diverse Catalog Products & Variants...");

  // NEXORA Categories & Products
  const catNexoraApparel = await prisma.category.upsert({
    where: { businessId_slug: { businessId: bizNexora.id, slug: "apparel" } },
    update: { name: "Apparel" },
    create: {
      id: "cat_apparel",
      businessId: bizNexora.id,
      name: "Apparel",
      slug: "apparel",
      description: "Handcrafted outerwear and bespoke tailored pieces.",
      imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const catNexoraFootwear = await prisma.category.upsert({
    where: { businessId_slug: { businessId: bizNexora.id, slug: "footwear" } },
    update: { name: "Footwear" },
    create: {
      id: "cat_footwear",
      businessId: bizNexora.id,
      name: "Footwear",
      slug: "footwear",
      description: "Goodyear-welted cordwaining and French calfskin boots.",
      imageUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const prodTrench = await prisma.product.upsert({
    where: { businessId_slug: { businessId: bizNexora.id, slug: "double-breasted-cashmere-trench" } },
    update: { title: "Double-Breasted Cashmere Trench", published: true, featured: true },
    create: {
      id: "prod_01",
      businessId: bizNexora.id,
      slug: "double-breasted-cashmere-trench",
      title: "Double-Breasted Cashmere Trench",
      description: "100% Mongolian combed cashmere trench with silk cupro lining and buffalo horn buttons.",
      categoryId: catNexoraApparel.id,
      category: "Apparel",
      basePriceInCents: 145000,
      featured: true,
      published: true,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodTrench.id } });
  await prisma.productImage.create({
    data: {
      productId: prodTrench.id,
      url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
      alt: "Double-Breasted Cashmere Trench in Camel",
      position: 0,
    },
  });

  const varTrenchM = await prisma.productVariant.upsert({
    where: { sku: "NXR-TR-CAM-M" },
    update: { stock: 18 },
    create: {
      id: "var_01_m",
      productId: prodTrench.id,
      sku: "NXR-TR-CAM-M",
      title: "Camel / Medium",
      priceInCents: 145000,
      stock: 18,
      lowStockThreshold: 5,
    },
  });

  const varTrenchL = await prisma.productVariant.upsert({
    where: { sku: "NXR-TR-CAM-L" },
    update: { stock: 3 }, // LOW STOCK test scenario
    create: {
      id: "var_01_l",
      productId: prodTrench.id,
      sku: "NXR-TR-CAM-L",
      title: "Camel / Large",
      priceInCents: 145000,
      stock: 3,
      lowStockThreshold: 5,
    },
  });

  const prodOxfords = await prisma.product.upsert({
    where: { businessId_slug: { businessId: bizNexora.id, slug: "hand-welted-wholecut-calfskin-oxfords" } },
    update: { title: "Hand-Welted Wholecut Calfskin Oxfords", published: true },
    create: {
      id: "prod_02",
      businessId: bizNexora.id,
      slug: "hand-welted-wholecut-calfskin-oxfords",
      title: "Hand-Welted Wholecut Calfskin Oxfords",
      description: "Goodyear-welted wholecut crafted from full-grain French box calf.",
      categoryId: catNexoraFootwear.id,
      category: "Footwear",
      basePriceInCents: 68000,
      featured: true,
      published: true,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodOxfords.id } });
  await prisma.productImage.create({
    data: {
      productId: prodOxfords.id,
      url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000",
      alt: "Hand-Welted Wholecut Calfskin Oxfords in Obsidian Black",
      position: 0,
    },
  });

  const varBoot42 = await prisma.productVariant.upsert({
    where: { sku: "NEX-OX-BLK-42" },
    update: { stock: 0 }, // OUT OF STOCK test scenario
    create: {
      id: "var_02_blk_42",
      productId: prodOxfords.id,
      sku: "NEX-OX-BLK-42",
      title: "Obsidian Black / EU 42",
      priceInCents: 68000,
      stock: 0,
      lowStockThreshold: 5,
    },
  });

  const varBoot43 = await prisma.productVariant.upsert({
    where: { sku: "NEX-OX-BLK-43" },
    update: { stock: 12 },
    create: {
      id: "var_02_blk_43",
      productId: prodOxfords.id,
      sku: "NEX-OX-BLK-43",
      title: "Obsidian Black / EU 43",
      priceInCents: 68000,
      stock: 12,
      lowStockThreshold: 5,
    },
  });

  // Lumina Audio Categories & Products
  const catLuminaAudio = await prisma.category.upsert({
    where: { businessId_slug: { businessId: bizLumina.id, slug: "audio" } },
    update: { name: "Studio Audio & Acoustics" },
    create: {
      businessId: bizLumina.id,
      name: "Studio Audio & Acoustics",
      slug: "audio",
      description: "Planar magnetic transducers and discrete DAC topologies.",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const prodHeadphones = await prisma.product.upsert({
    where: { businessId_slug: { businessId: bizLumina.id, slug: "acoustic-pro-headphones" } },
    update: { title: "Acoustic Pro Studio Headphones", published: true },
    create: {
      id: "prod_lum_headphones",
      businessId: bizLumina.id,
      slug: "acoustic-pro-headphones",
      title: "Acoustic Pro Studio Headphones",
      description: "Handcrafted 50mm beryllium drivers delivering ultra-linear frequency response.",
      categoryId: catLuminaAudio.id,
      category: "Studio Audio & Acoustics",
      basePriceInCents: 49900,
      featured: true,
      published: true,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodHeadphones.id } });
  await prisma.productImage.create({
    data: {
      productId: prodHeadphones.id,
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
      alt: "Acoustic Pro Studio Headphones",
      position: 0,
    },
  });

  const varHpBlk = await prisma.productVariant.upsert({
    where: { sku: "LUM-HP-BLK" },
    update: { stock: 22 },
    create: {
      id: "var_lum_hp_blk",
      productId: prodHeadphones.id,
      sku: "LUM-HP-BLK",
      title: "Matte Black / Closed-Back",
      priceInCents: 49900,
      stock: 22,
      lowStockThreshold: 5,
    },
  });

  // Apex Kicks Categories & Products
  const catApexKicks = await prisma.category.upsert({
    where: { businessId_slug: { businessId: bizApex.id, slug: "sneakers" } },
    update: { name: "Sneakers & High-Tops" },
    create: {
      businessId: bizApex.id,
      name: "Sneakers & High-Tops",
      slug: "sneakers",
      description: "Limited tier vulcanized kicks and carbon-plate runners.",
      imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const prodSneaker = await prisma.product.upsert({
    where: { businessId_slug: { businessId: bizApex.id, slug: "quantum-high-top" } },
    update: { title: "Apex Quantum High-Top Sneaker", published: true },
    create: {
      id: "prod_apx_quantum",
      businessId: bizApex.id,
      slug: "quantum-high-top",
      title: "Apex Quantum High-Top Sneaker",
      description: "Deconstructed tumbled leather upper with translucent TPU panels and neon accents.",
      categoryId: catApexKicks.id,
      category: "Sneakers & High-Tops",
      basePriceInCents: 24000,
      featured: true,
      published: true,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: prodSneaker.id } });
  await prisma.productImage.create({
    data: {
      productId: prodSneaker.id,
      url: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=1000",
      alt: "Apex Quantum High-Top Sneaker",
      position: 0,
    },
  });

  const varSneaker10 = await prisma.productVariant.upsert({
    where: { sku: "APX-QHT-10" },
    update: { stock: 15 },
    create: {
      id: "var_apx_qht_10",
      productId: prodSneaker.id,
      sku: "APX-QHT-10",
      title: "US 10 / Infrared & Black",
      priceInCents: 24000,
      stock: 15,
      lowStockThreshold: 5,
    },
  });

  // 5. Seed Multi-Store Demo Orders & Payments
  console.log("\n[5/7] Seeding Synthetic Orders Across Distinct Lifecycle States...");

  // Order 1: Delivered Luxury Order (NEXORA)
  const order1 = await prisma.order.upsert({
    where: { orderNumber: "NXR-PILOT-1001" },
    update: { status: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.PAID },
    create: {
      id: "ord_pilot_1001",
      businessId: bizNexora.id,
      orderNumber: "NXR-PILOT-1001",
      userId: customerLuxury.id,
      status: OrderStatus.DELIVERED,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      currency: "USD",
      subtotalInCents: 145000,
      shippingInCents: 0,
      taxInCents: 0,
      totalInCents: 145000,
      shippingAddressId: addrLuxury.id,
      billingAddressId: addrLuxury.id,
      shippingMethod: "EXPRESS_COURIER",
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.deleteMany({ where: { orderId: order1.id } });
  await prisma.orderItem.create({
    data: {
      id: "item_pilot_1001",
      orderId: order1.id,
      productId: prodTrench.id,
      variantId: varTrenchM.id,
      productTitle: "Double-Breasted Cashmere Trench",
      variantTitle: "Camel / Medium",
      sku: "NXR-TR-CAM-M",
      priceInCents: 145000,
      quantity: 1,
      subtotalInCents: 145000,
    },
  });

  await prisma.payment.deleteMany({ where: { orderId: order1.id } });
  await prisma.payment.create({
    data: {
      id: "pay_pilot_1001",
      businessId: bizNexora.id,
      orderId: order1.id,
      provider: "MOCK",
      status: PaymentStatus.PAID,
      amountInCents: 145000,
      currency: "USD",
      providerPaymentId: "mock_tx_luxury_1001",
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Order 2: Shipped Tech Order (Lumina)
  const order2 = await prisma.order.upsert({
    where: { orderNumber: "LUM-PILOT-2001" },
    update: { status: OrderStatus.SHIPPED, paymentStatus: PaymentStatus.PAID },
    create: {
      id: "ord_pilot_2001",
      businessId: bizLumina.id,
      orderNumber: "LUM-PILOT-2001",
      userId: customerTech.id,
      status: OrderStatus.SHIPPED,
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
      paymentStatus: PaymentStatus.PAID,
      currency: "USD",
      subtotalInCents: 49900,
      shippingInCents: 1500,
      taxInCents: 0,
      totalInCents: 51400,
      shippingAddressId: addrTech.id,
      billingAddressId: addrTech.id,
      shippingMethod: "EXPEDITED",
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.deleteMany({ where: { orderId: order2.id } });
  await prisma.orderItem.create({
    data: {
      id: "item_pilot_2001",
      orderId: order2.id,
      productId: prodHeadphones.id,
      variantId: varHpBlk.id,
      productTitle: "Acoustic Pro Studio Headphones",
      variantTitle: "Matte Black / Closed-Back",
      sku: "LUM-HP-BLK",
      priceInCents: 49900,
      quantity: 1,
      subtotalInCents: 49900,
    },
  });

  await prisma.shipment.deleteMany({ where: { orderId: order2.id } });
  await prisma.shipment.create({
    data: {
      id: "ship_pilot_2001",
      orderId: order2.id,
      carrier: "FedEx Express",
      trackingNumber: "FDX-PILOT-998822",
      status: "IN_TRANSIT",
      shippedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Order 3: Pending Order (Apex Kicks)
  const order3 = await prisma.order.upsert({
    where: { orderNumber: "APX-PILOT-3001" },
    update: { status: OrderStatus.PENDING, paymentStatus: PaymentStatus.UNPAID },
    create: {
      id: "ord_pilot_3001",
      businessId: bizApex.id,
      orderNumber: "APX-PILOT-3001",
      userId: customerStreet.id,
      status: OrderStatus.PENDING,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      paymentStatus: PaymentStatus.UNPAID,
      currency: "USD",
      subtotalInCents: 24000,
      shippingInCents: 1000,
      taxInCents: 0,
      totalInCents: 25000,
      shippingAddressId: addrStreet.id,
      billingAddressId: addrStreet.id,
      shippingMethod: "STANDARD",
    },
  });

  await prisma.orderItem.deleteMany({ where: { orderId: order3.id } });
  await prisma.orderItem.create({
    data: {
      id: "item_pilot_3001",
      orderId: order3.id,
      productId: prodSneaker.id,
      variantId: varSneaker10.id,
      productTitle: "Apex Quantum High-Top Sneaker",
      variantTitle: "US 10 / Infrared & Black",
      sku: "APX-QHT-10",
      priceInCents: 24000,
      quantity: 1,
      subtotalInCents: 24000,
    },
  });

  // 6. Seed Support Tickets & Realistic Dialogue
  console.log("\n[6/7] Seeding Customer Concierge & Support Tickets...");

  const ticket1 = await prisma.supportTicket.upsert({
    where: { ticketNumber: "TCK-NXR-001" },
    update: { status: TicketStatus.IN_PROGRESS },
    create: {
      id: "tck_pilot_001",
      businessId: bizNexora.id,
      ticketNumber: "TCK-NXR-001",
      userId: customerLuxury.id,
      orderId: order1.id,
      subject: "Bespoke Sizing Consultation: Cashmere Trench",
      description: "Inquiry regarding sleeve tailoring measurements prior to seasonal styling.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      assignedStaffId: adminUser.id,
    },
  });

  await prisma.ticketMessage.deleteMany({ where: { ticketId: ticket1.id } });
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: ticket1.id,
        senderId: customerLuxury.id,
        senderRole: Role.CUSTOMER,
        message: "Hello Concierge, could you advise whether the trench sleeve cuff allows 2cm let-out without disturbing the interior cupro seam?",
      },
      {
        ticketId: ticket1.id,
        senderId: adminUser.id,
        senderRole: Role.STAFF,
        message: "Dear Ms. Rostova, yes. Our master tailor has left a generous 3.5cm inlay inside the cuff. Your local atelier can make this adjustment with ease.",
      },
    ],
  });

  const ticket2 = await prisma.supportTicket.upsert({
    where: { ticketNumber: "TCK-LUM-001" },
    update: { status: TicketStatus.RESOLVED },
    create: {
      id: "tck_pilot_002",
      businessId: bizLumina.id,
      ticketNumber: "TCK-LUM-001",
      userId: customerTech.id,
      orderId: order2.id,
      subject: "Optical & USB-C Input Sampling Rates",
      description: "Checking if optical input accepts native 192kHz/24bit without jitter reduction buffering.",
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.NORMAL,
      assignedStaffId: adminUser.id,
    },
  });

  await prisma.ticketMessage.deleteMany({ where: { ticketId: ticket2.id } });
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: ticket2.id,
        senderId: customerTech.id,
        senderRole: Role.CUSTOMER,
        message: "Does the DAC stream 192/24 over TOSLINK without sample rate conversion?",
      },
      {
        ticketId: ticket2.id,
        senderId: adminUser.id,
        senderRole: Role.STAFF,
        message: "Yes David, bit-perfect playback up to 192kHz/24bit is fully supported over optical with zero downsampling.",
      },
    ],
  });

  // 7. Seed Active SaaS Subscriptions for Demo Tenants
  console.log("\n[7/7] Seeding Active SaaS Subscriptions and Mock Invoices...");

  const planPro = await prisma.saaSPlan.findFirst({
    where: { OR: [{ code: "enterprise" }, { code: "pro" }] },
    include: { prices: true },
  });
  const planGrowth = await prisma.saaSPlan.findUnique({
    where: { code: "growth" },
    include: { prices: true },
  });
  const planStarter = await prisma.saaSPlan.findUnique({
    where: { code: "starter" },
    include: { prices: true },
  });

  const now = new Date();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  if (planPro && planPro.prices.length > 0) {
    const price = planPro.prices[0];
    await prisma.saaSSubscription.upsert({
      where: { businessId: bizNexora.id },
      update: {
        status: SaaSSubscriptionStatus.ACTIVE,
        planId: planPro.id,
        priceId: price.id,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextYear,
      },
      create: {
        id: "sub_nexora_pilot",
        businessId: bizNexora.id,
        planId: planPro.id,
        priceId: price.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextYear,
      },
    });
  }

  if (planGrowth && planGrowth.prices.length > 0) {
    const price = planGrowth.prices[0];
    await prisma.saaSSubscription.upsert({
      where: { businessId: bizLumina.id },
      update: {
        status: SaaSSubscriptionStatus.ACTIVE,
        planId: planGrowth.id,
        priceId: price.id,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextMonth,
      },
      create: {
        id: "sub_lumina_pilot",
        businessId: bizLumina.id,
        planId: planGrowth.id,
        priceId: price.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextMonth,
      },
    });
  }

  if (planStarter && planStarter.prices.length > 0) {
    const price = planStarter.prices[0];
    await prisma.saaSSubscription.upsert({
      where: { businessId: bizApex.id },
      update: {
        status: SaaSSubscriptionStatus.ACTIVE,
        planId: planStarter.id,
        priceId: price.id,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextMonth,
      },
      create: {
        id: "sub_apex_pilot",
        businessId: bizApex.id,
        planId: planStarter.id,
        priceId: price.id,
        status: SaaSSubscriptionStatus.ACTIVE,
        billingInterval: price.interval,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: nextMonth,
      },
    });
  }

  // Summary Metrics
  const countBiz = await prisma.business.count();
  const countUsers = await prisma.user.count();
  const countProducts = await prisma.product.count();
  const countVariants = await prisma.productVariant.count();
  const countOrders = await prisma.order.count();
  const countTickets = await prisma.supportTicket.count();
  const countSubs = await prisma.saaSSubscription.count();

  console.log("\n===================================================================");
  console.log("            PILOT DEMO SEEDING COMPLETED SUCCESSFULLY               ");
  console.log("===================================================================");
  console.log(`Active Businesses:     ${countBiz} (nexora, lumina-tech, apex-kicks)`);
  console.log(`Total Users:           ${countUsers} (Superadmin, Store Owners, Customers)`);
  console.log(`Catalog Products:      ${countProducts}`);
  console.log(`Catalog Variants:      ${countVariants} (including in-stock, low-stock, out-of-stock)`);
  console.log(`Demo Orders:           ${countOrders} (Delivered, Shipped, Pending)`);
  console.log(`Support Tickets:       ${countTickets}`);
  console.log(`SaaS Subscriptions:    ${countSubs}`);
  console.log("===================================================================\n");
}

if (require.main === module) {
  seedPilotDemo()
    .catch((err) => {
      console.error("FATAL: Pilot seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
