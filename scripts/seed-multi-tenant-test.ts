import { prisma } from "../src/lib/prisma";

async function seedMultiTenant() {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Multi-tenant test seeding is strictly forbidden in production environments.");
    process.exit(1);
  }

  console.log("=== Seeding Multi-Tenant Test Businesses ===");

  // 1. Locate primary admin user or create one if needed
  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [{ role: "SUPERADMIN" }, { role: "OWNER" }],
    },
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        id: "usr_master_admin",
        name: "Platform Master Admin",
        email: "admin@nexoracommerce.com",
        role: "SUPERADMIN",
      },
    });
    console.log("Created master admin user:", adminUser.id);
  } else {
    console.log("Found existing admin user:", adminUser.id, adminUser.email, adminUser.role);
  }

  // 2. Ensure default-store (NEXORA Fashion House) is properly configured
  const nexoraBiz = await prisma.business.upsert({
    where: { id: "default-store" },
    update: {
      slug: "nexora",
      name: "NEXORA Luxury Atelier",
      type: "LUXURY_FASHION",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@nexoracommerce.com",
      description: "Parisian haute couture, bespoke suiting, and heirloom artisan apparel.",
    },
    create: {
      id: "default-store",
      slug: "nexora",
      name: "NEXORA Luxury Atelier",
      type: "LUXURY_FASHION",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@nexoracommerce.com",
      description: "Parisian haute couture, bespoke suiting, and heirloom artisan apparel.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: nexoraBiz.id },
    update: { orderPrefix: "NXR", allowMockPayment: true, inventoryTracking: true },
    create: {
      businessId: nexoraBiz.id,
      orderPrefix: "NXR",
      allowMockPayment: true,
      inventoryTracking: true,
    },
  });

  // Ensure admin user is an OWNER member of default-store
  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: nexoraBiz.id,
        userId: adminUser.id,
      },
    },
    update: { role: "OWNER", title: "Atelier Director" },
    create: {
      businessId: nexoraBiz.id,
      userId: adminUser.id,
      role: "OWNER",
      title: "Atelier Director",
    },
  });

  // Ensure StoreThemeConfig for default-store exists
  await prisma.storeThemeConfig.upsert({
    where: { businessId: nexoraBiz.id },
    update: {
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture & Heritage Tailoring",
      contactEmail: "concierge@nexoracommerce.com",
    },
    create: {
      businessId: nexoraBiz.id,
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture & Heritage Tailoring",
      contactEmail: "concierge@nexoracommerce.com",
    },
  });

  console.log("✓ Default store (nexora) verified and updated.");

  // 3. Create Tenant 2: Lumina Audio & Tech
  const luminaManager = await prisma.user.upsert({
    where: { email: "lumina.manager@test.com" },
    update: { name: "Lumina Operations Manager" },
    create: {
      email: "lumina.manager@test.com",
      name: "Lumina Operations Manager",
      role: "STAFF",
    },
  });

  const luminaBiz = await prisma.business.upsert({
    where: { id: "biz-lumina-tech" },
    update: {
      slug: "lumina-tech",
      name: "Lumina Audio & Tech",
      type: "ELECTRONICS",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@lumina-tech.com",
      description: "High-fidelity audiophile gear, studio reference acoustics, and precision engineering.",
    },
    create: {
      id: "biz-lumina-tech",
      slug: "lumina-tech",
      name: "Lumina Audio & Tech",
      type: "ELECTRONICS",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "concierge@lumina-tech.com",
      description: "High-fidelity audiophile gear, studio reference acoustics, and precision engineering.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: luminaBiz.id },
    update: { orderPrefix: "LUM", allowMockPayment: true, inventoryTracking: true },
    create: {
      businessId: luminaBiz.id,
      orderPrefix: "LUM",
      allowMockPayment: true,
      inventoryTracking: true,
    },
  });

  // Theme config for Lumina Tech: Modern Minimal
  await prisma.storeThemeConfig.upsert({
    where: { businessId: luminaBiz.id },
    update: {
      activeThemeId: "modern-minimal",
      storeName: "Lumina Audio",
      storeTagline: "Studio Reference Acoustics & Engineering",
      contactEmail: "support@lumina-tech.com",
      primaryColor: "#0F172A",
      secondaryColor: "#64748B",
      fontPreset: "modern",
      announcementText: "Complimentary Express Shipping on Studio Monitoring Systems",
      announcementEnabled: true,
    },
    create: {
      businessId: luminaBiz.id,
      activeThemeId: "modern-minimal",
      storeName: "Lumina Audio",
      storeTagline: "Studio Reference Acoustics & Engineering",
      contactEmail: "support@lumina-tech.com",
      primaryColor: "#0F172A",
      secondaryColor: "#64748B",
      fontPreset: "modern",
      announcementText: "Complimentary Express Shipping on Studio Monitoring Systems",
      announcementEnabled: true,
    },
  });

  // Memberships for Lumina
  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: luminaBiz.id, userId: adminUser.id } },
    update: { role: "OWNER", title: "Chief Technology Officer" },
    create: {
      businessId: luminaBiz.id,
      userId: adminUser.id,
      role: "OWNER",
      title: "Chief Technology Officer",
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: luminaBiz.id, userId: luminaManager.id } },
    update: { role: "MANAGER", title: "Audio Lab Director" },
    create: {
      businessId: luminaBiz.id,
      userId: luminaManager.id,
      role: "MANAGER",
      title: "Audio Lab Director",
    },
  });

  // Categories for Lumina
  const luminaCatAudio = await prisma.category.upsert({
    where: { businessId_slug: { businessId: luminaBiz.id, slug: "audio" } },
    update: { name: "Studio Audio & Acoustics" },
    create: {
      businessId: luminaBiz.id,
      name: "Studio Audio & Acoustics",
      slug: "audio",
      description: "Planar magnetic transducers, open-back reference cans, and discrete DAC topologies.",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const luminaCatWorkspace = await prisma.category.upsert({
    where: { businessId_slug: { businessId: luminaBiz.id, slug: "workspace" } },
    update: { name: "Workspace & Peripherals" },
    create: {
      businessId: luminaBiz.id,
      name: "Workspace & Peripherals",
      slug: "workspace",
      description: "Precision CNC milled mechanical peripherals and calibrated studio monitors.",
      imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=1000",
    },
  });

  // Products for Lumina
  const luminaProducts = [
    {
      id: "prod_lum_headphones",
      slug: "acoustic-pro-headphones",
      title: "Acoustic Pro Studio Headphones",
      description: "Handcrafted 50mm beryllium drivers delivering ultra-linear frequency response from 5Hz to 45kHz.",
      categoryId: luminaCatAudio.id,
      categoryName: luminaCatAudio.name,
      basePriceInCents: 49900,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_lum_hp_blk", sku: "LUM-HP-BLK", title: "Matte Black / Closed-Back", priceInCents: 49900, stock: 25 },
        { id: "var_lum_hp_slv", sku: "LUM-HP-SLV", title: "Brushed Silver / Open-Back", priceInCents: 54900, stock: 15 },
      ],
    },
    {
      id: "prod_lum_dac",
      slug: "master-reference-dac",
      title: "Master Reference DAC & Preamp",
      description: "Dual ESS Sabre ES9038PRO chipset with femtosecond clocking and fully balanced discrete Class-A amplification.",
      categoryId: luminaCatAudio.id,
      categoryName: luminaCatAudio.name,
      basePriceInCents: 64900,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_lum_dac_std", sku: "LUM-DAC-STD", title: "Anodized Silver / Standard", priceInCents: 64900, stock: 12 },
      ],
    },
    {
      id: "prod_lum_keyboard",
      slug: "linear-studio-keyboard",
      title: "Linear Mechanical Studio Keyboard",
      description: "Solid brass weight block, gasket mounted plate, and factory-lubed custom linear switches.",
      categoryId: luminaCatWorkspace.id,
      categoryName: luminaCatWorkspace.name,
      basePriceInCents: 22000,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_lum_kb_slt", sku: "LUM-KB-SLT", title: "Stealth Slate / Silent Linear", priceInCents: 22000, stock: 30 },
        { id: "var_lum_kb_wht", sku: "LUM-KB-WHT", title: "Chalk White / Tactile", priceInCents: 22000, stock: 20 },
      ],
    },
    {
      id: "prod_lum_monitors",
      slug: "active-studio-monitors",
      title: "Active Studio Reference Monitors (Pair)",
      description: "Bi-amplified 6.5-inch woven Kevlar woofers paired with silk dome tweeters for surgical near-field imaging.",
      categoryId: luminaCatAudio.id,
      categoryName: luminaCatAudio.name,
      basePriceInCents: 78000,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_lum_mon_wln", sku: "LUM-MON-WLN", title: "American Walnut (Pair)", priceInCents: 78000, stock: 10 },
        { id: "var_lum_mon_obs", sku: "LUM-MON-OBS", title: "Matte Obsidian (Pair)", priceInCents: 78000, stock: 14 },
      ],
    },
  ];

  for (const p of luminaProducts) {
    const prod = await prisma.product.upsert({
      where: { businessId_slug: { businessId: luminaBiz.id, slug: p.slug } },
      update: {
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        category: p.categoryName,
        basePriceInCents: p.basePriceInCents,
        featured: p.featured,
        published: true,
      },
      create: {
        id: p.id,
        businessId: luminaBiz.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        category: p.categoryName,
        basePriceInCents: p.basePriceInCents,
        featured: p.featured,
        published: true,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: prod.id } });
    await prisma.productImage.create({
      data: {
        productId: prod.id,
        url: p.imageUrl,
        alt: p.title,
        position: 0,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: prod.id,
          title: v.title,
          priceInCents: v.priceInCents,
          stock: v.stock,
        },
        create: {
          id: v.id,
          productId: prod.id,
          sku: v.sku,
          title: v.title,
          priceInCents: v.priceInCents,
          stock: v.stock,
        },
      });

      // Seed initial inventory movement if not present
      const movementExists = await prisma.inventoryMovement.findFirst({
        where: { variantId: variant.id, businessId: luminaBiz.id },
      });
      if (!movementExists) {
        await prisma.inventoryMovement.create({
          data: {
            businessId: luminaBiz.id,
            variantId: variant.id,
            type: "RESTOCK",
            quantityChange: v.stock,
            previousStock: 0,
            newStock: v.stock,
            reference: "seed-lumina",
            reason: "Initial inventory allocation for Lumina Tech",
          },
        });
      }
    }
  }

  console.log("✓ Lumina Audio & Tech seeded successfully with 4 products.");

  // 4. Create Tenant 3: Apex Kicks & Streetwear
  const apexStaff = await prisma.user.upsert({
    where: { email: "apex.staff@test.com" },
    update: { name: "Apex Drop Coordinator" },
    create: {
      email: "apex.staff@test.com",
      name: "Apex Drop Coordinator",
      role: "STAFF",
    },
  });

  const apexBiz = await prisma.business.upsert({
    where: { id: "biz-apex-kicks" },
    update: {
      slug: "apex-kicks",
      name: "Apex Kicks & Streetwear",
      type: "STREETWEAR",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "crew@apex-kicks.com",
      description: "Limited edition high-tops, archival streetwear silhouettes, and high-performance sneaker drops.",
    },
    create: {
      id: "biz-apex-kicks",
      slug: "apex-kicks",
      name: "Apex Kicks & Streetwear",
      type: "STREETWEAR",
      status: "ACTIVE",
      currency: "USD",
      contactEmail: "crew@apex-kicks.com",
      description: "Limited edition high-tops, archival streetwear silhouettes, and high-performance sneaker drops.",
    },
  });

  await prisma.businessSettings.upsert({
    where: { businessId: apexBiz.id },
    update: { orderPrefix: "APX", allowMockPayment: true, inventoryTracking: true },
    create: {
      businessId: apexBiz.id,
      orderPrefix: "APX",
      allowMockPayment: true,
      inventoryTracking: true,
    },
  });

  // Theme config for Apex Kicks: Orange Energy
  await prisma.storeThemeConfig.upsert({
    where: { businessId: apexBiz.id },
    update: {
      activeThemeId: "orange-energy",
      storeName: "APEX KICKS",
      storeTagline: "High-Velocity Streetwear & Sneaker Drops",
      contactEmail: "drops@apex-kicks.com",
      primaryColor: "#FF5500",
      secondaryColor: "#111111",
      fontPreset: "bold",
      announcementText: "LIMITED DROP ARCHIVE: ZERO RESTOCK GUARANTEE",
      announcementEnabled: true,
    },
    create: {
      businessId: apexBiz.id,
      activeThemeId: "orange-energy",
      storeName: "APEX KICKS",
      storeTagline: "High-Velocity Streetwear & Sneaker Drops",
      contactEmail: "drops@apex-kicks.com",
      primaryColor: "#FF5500",
      secondaryColor: "#111111",
      fontPreset: "bold",
      announcementText: "LIMITED DROP ARCHIVE: ZERO RESTOCK GUARANTEE",
      announcementEnabled: true,
    },
  });

  // Memberships for Apex Kicks
  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: apexBiz.id, userId: adminUser.id } },
    update: { role: "OWNER", title: "Founder & Creative Lead" },
    create: {
      businessId: apexBiz.id,
      userId: adminUser.id,
      role: "OWNER",
      title: "Founder & Creative Lead",
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: apexBiz.id, userId: apexStaff.id } },
    update: { role: "STAFF", title: "Drop Warehouse Lead" },
    create: {
      businessId: apexBiz.id,
      userId: apexStaff.id,
      role: "STAFF",
      title: "Drop Warehouse Lead",
    },
  });

  // Categories for Apex Kicks
  // Note: Apex uses slug 'apparel' just like NEXORA! This tests @@unique([businessId, slug])
  const apexCatSneakers = await prisma.category.upsert({
    where: { businessId_slug: { businessId: apexBiz.id, slug: "sneakers" } },
    update: { name: "Sneakers & High-Tops" },
    create: {
      businessId: apexBiz.id,
      name: "Sneakers & High-Tops",
      slug: "sneakers",
      description: "Limited tier vulcanized kicks, sculpted carbon-plate midsoles, and archival retros.",
      imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=1000",
    },
  });

  const apexCatApparel = await prisma.category.upsert({
    where: { businessId_slug: { businessId: apexBiz.id, slug: "apparel" } },
    update: { name: "Streetwear & Hoodies" },
    create: {
      businessId: apexBiz.id,
      name: "Streetwear & Hoodies",
      slug: "apparel",
      description: "500 GSM French terry heavyweight pullovers, ripstop cargos, and oversized cuts.",
      imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1000",
    },
  });

  // Products for Apex Kicks
  const apexProducts = [
    {
      id: "prod_apx_quantum",
      slug: "quantum-high-top",
      title: "Apex Quantum High-Top Sneaker",
      description: "Deconstructed premium tumbled leather upper with translucent TPU panels and neon accents.",
      categoryId: apexCatSneakers.id,
      categoryName: apexCatSneakers.name,
      basePriceInCents: 24000,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_apx_qht_09", sku: "APX-QHT-09", title: "US 9 / Infrared & Black", priceInCents: 24000, stock: 18 },
        { id: "var_apx_qht_10", sku: "APX-QHT-10", title: "US 10 / Infrared & Black", priceInCents: 24000, stock: 22 },
        { id: "var_apx_qht_11", sku: "APX-QHT-11", title: "US 11 / Infrared & Black", priceInCents: 24000, stock: 15 },
      ],
    },
    {
      id: "prod_apx_runner",
      slug: "hyper-velocity-runner",
      title: "Hyper Velocity Carbon Runner",
      description: "Ultra-responsive carbon fiber sprint plate encapsulated in bio-based responsive foam.",
      categoryId: apexCatSneakers.id,
      categoryName: apexCatSneakers.name,
      basePriceInCents: 19500,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_apx_hvr_09", sku: "APX-HVR-09", title: "Neon Fire / US 9", priceInCents: 19500, stock: 30 },
        { id: "var_apx_hvr_10", sku: "APX-HVR-10", title: "Neon Fire / US 10", priceInCents: 19500, stock: 25 },
      ],
    },
    {
      id: "prod_apx_hoodie",
      slug: "heavyweight-boxy-hoodie",
      title: "Heavyweight Boxy Hoodie (500 GSM)",
      description: "Double-layered hood, custom garment dye, drop-shoulder vintage silhouette.",
      categoryId: apexCatApparel.id,
      categoryName: apexCatApparel.name,
      basePriceInCents: 13000,
      featured: false,
      imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_apx_hd_m", sku: "APX-HD-M", title: "Washed Charcoal / Medium", priceInCents: 13000, stock: 40 },
        { id: "var_apx_hd_l", sku: "APX-HD-L", title: "Washed Charcoal / Large", priceInCents: 13000, stock: 50 },
      ],
    },
    {
      id: "prod_apx_cargo",
      slug: "technical-ripstop-cargo",
      title: "Technical Ripstop Cargo Pants",
      description: "Weather-resistant nylon ripstop, 8 utility pockets with waterproof zippers, and adjustable cuffs.",
      categoryId: apexCatApparel.id,
      categoryName: apexCatApparel.name,
      basePriceInCents: 16500,
      featured: true,
      imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1000",
      variants: [
        { id: "var_apx_cg_32", sku: "APX-CG-32", title: "Tactical Black / 32", priceInCents: 16500, stock: 20 },
        { id: "var_apx_cg_34", sku: "APX-CG-34", title: "Tactical Black / 34", priceInCents: 16500, stock: 25 },
      ],
    },
  ];

  for (const p of apexProducts) {
    const prod = await prisma.product.upsert({
      where: { businessId_slug: { businessId: apexBiz.id, slug: p.slug } },
      update: {
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        category: p.categoryName,
        basePriceInCents: p.basePriceInCents,
        featured: p.featured,
        published: true,
      },
      create: {
        id: p.id,
        businessId: apexBiz.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        category: p.categoryName,
        basePriceInCents: p.basePriceInCents,
        featured: p.featured,
        published: true,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: prod.id } });
    await prisma.productImage.create({
      data: {
        productId: prod.id,
        url: p.imageUrl,
        alt: p.title,
        position: 0,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: prod.id,
          title: v.title,
          priceInCents: v.priceInCents,
          stock: v.stock,
        },
        create: {
          id: v.id,
          productId: prod.id,
          sku: v.sku,
          title: v.title,
          priceInCents: v.priceInCents,
          stock: v.stock,
        },
      });

      const movementExists = await prisma.inventoryMovement.findFirst({
        where: { variantId: variant.id, businessId: apexBiz.id },
      });
      if (!movementExists) {
        await prisma.inventoryMovement.create({
          data: {
            businessId: apexBiz.id,
            variantId: variant.id,
            type: "RESTOCK",
            quantityChange: v.stock,
            previousStock: 0,
            newStock: v.stock,
            reference: "seed-apex",
            reason: "Initial inventory allocation for Apex Kicks",
          },
        });
      }
    }
  }

  console.log("✓ Apex Kicks & Streetwear seeded successfully with 4 products.");

  // Summary counts
  const totalBusinesses = await prisma.business.count();
  const totalMembers = await prisma.businessMember.count();
  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  const totalVariants = await prisma.productVariant.count();

  console.log("\n=== Multi-Tenant Seeding Summary ===");
  console.log(`Total Businesses: ${totalBusinesses}`);
  console.log(`Total Members:    ${totalMembers}`);
  console.log(`Total Products:   ${totalProducts}`);
  console.log(`Total Categories: ${totalCategories}`);
  console.log(`Total Variants:   ${totalVariants}`);
  console.log("Multi-tenant test businesses setup complete.");
}

seedMultiTenant()
  .catch((err) => {
    console.error("Multi-tenant seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
