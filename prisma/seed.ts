import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedVariant {
  id: string;
  sku: string;
  title: string;
  size?: string;
  color?: string;
  priceInCents: number;
  stock: number;
  lowStockThreshold?: number;
}

interface SeedProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  basePriceInCents: number;
  featured: boolean;
  published: boolean;
  images: { url: string; alt: string; position: number }[];
  variants: SeedVariant[];
}

const CATEGORIES = [
  {
    id: "cat_apparel",
    name: "Apparel",
    slug: "apparel",
    description:
      "Handcrafted outerwear, bespoke suiting, and heirloom knitwear fashioned from rare natural fibers.",
    imageUrl:
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "cat_footwear",
    name: "Footwear",
    slug: "footwear",
    description:
      "Goodyear-welted cordwaining, hand-burnished French box calf, and sculpted cedar shoe lasts.",
    imageUrl:
      "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "cat_accessories",
    name: "Accessories",
    slug: "accessories",
    description:
      "Full-grain bridle leather portmanteaus, 18-momme mulberry silk foulards, and hand-finished brass.",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000",
  },
];

const PRODUCTS: SeedProduct[] = [
  {
    id: "prod_01",
    slug: "double-breasted-cashmere-trench",
    title: "Double-Breasted Cashmere Trench",
    description:
      "Meticulously tailored from 100% Mongolian combed cashmere. Features horn buttons, belted waist silhouette, structured storm flap, and silk-cupro lining. Designed for discerning cold-weather elegance.",
    categorySlug: "apparel",
    categoryName: "Apparel",
    basePriceInCents: 145000, // $1,450.00
    featured: true,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
        alt: "Double-Breasted Cashmere Trench in Camel",
        position: 0,
      },
      {
        url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=1000",
        alt: "Cashmere Trench Editorial Model Shot",
        position: 1,
      },
    ],
    variants: [
      {
        id: "var_01_camel_s",
        sku: "NEX-CT-CML-S",
        title: "Camel / Small",
        size: "S",
        color: "Camel",
        priceInCents: 145000,
        stock: 5,
        lowStockThreshold: 2,
      },
      {
        id: "var_01_camel_m",
        sku: "NEX-CT-CML-M",
        title: "Camel / Medium",
        size: "M",
        color: "Camel",
        priceInCents: 145000,
        stock: 8,
        lowStockThreshold: 3,
      },
      {
        id: "var_01_camel_l",
        sku: "NEX-CT-CML-L",
        title: "Camel / Large",
        size: "L",
        color: "Camel",
        priceInCents: 145000,
        stock: 2,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_02",
    slug: "hand-welted-wholecut-calfskin-oxfords",
    title: "Hand-Welted Wholecut Calfskin Oxfords",
    description:
      "Crafted from a single piece of flawless French box calf leather. Goodyear welted by master cordwainers with bark-tanned leather soles and beveled waists.",
    categorySlug: "footwear",
    categoryName: "Footwear",
    basePriceInCents: 68000, // $680.00
    featured: true,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000",
        alt: "Hand-Welted Wholecut Calfskin Oxfords in Obsidian Black",
        position: 0,
      },
      {
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=1000",
        alt: "Calfskin Oxfords Leather Detail",
        position: 1,
      },
    ],
    variants: [
      {
        id: "var_02_blk_41",
        sku: "NEX-OX-BLK-41",
        title: "Obsidian Black / EU 41",
        size: "EU 41",
        color: "Obsidian Black",
        priceInCents: 68000,
        stock: 4,
        lowStockThreshold: 2,
      },
      {
        id: "var_02_blk_42",
        sku: "NEX-OX-BLK-42",
        title: "Obsidian Black / EU 42",
        size: "EU 42",
        color: "Obsidian Black",
        priceInCents: 68000,
        stock: 6,
        lowStockThreshold: 2,
      },
      {
        id: "var_02_blk_43",
        sku: "NEX-OX-BLK-43",
        title: "Obsidian Black / EU 43",
        size: "EU 43",
        color: "Obsidian Black",
        priceInCents: 68000,
        stock: 3,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_03",
    slug: "artisanal-tuscan-bridle-leather-briefcase",
    title: "Artisanal Tuscan Bridle Leather Briefcase",
    description:
      "Vegetable-tanned full-grain leather hand-dyed in Florence. Finished with solid brass hardware, padded laptop partition, and reinforced saddle stitching.",
    categorySlug: "accessories",
    categoryName: "Accessories",
    basePriceInCents: 92000, // $920.00
    featured: true,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000",
        alt: "Artisanal Tuscan Bridle Leather Briefcase Front Profile",
        position: 0,
      },
      {
        url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=1000",
        alt: "Tuscan Leather Texture and Brass Buckle",
        position: 1,
      },
    ],
    variants: [
      {
        id: "var_03_cognac",
        sku: "NEX-BC-CGN-OS",
        title: "Cognac Brown / One Size",
        size: "One Size",
        color: "Cognac Brown",
        priceInCents: 92000,
        stock: 7,
        lowStockThreshold: 2,
      },
      {
        id: "var_03_espresso",
        sku: "NEX-BC-ESP-OS",
        title: "Deep Espresso / One Size",
        size: "One Size",
        color: "Deep Espresso",
        priceInCents: 92000,
        stock: 4,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_04",
    slug: "mulberry-silk-twill-atelier-scarf",
    title: "Mulberry Silk Twill Atelier Scarf",
    description:
      "Printed on 18-momme pure mulberry silk with hand-rolled edges. Depicts architectural geometry inspired by classic European colonnades.",
    categorySlug: "accessories",
    categoryName: "Accessories",
    basePriceInCents: 24000, // $240.00
    featured: false,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&q=80&w=1000",
        alt: "Mulberry Silk Twill Atelier Scarf Drape",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_04_navy_gold",
        sku: "NEX-SC-NVG-OS",
        title: "Navy & Bronze / 90x90cm",
        size: "90x90cm",
        color: "Navy / Bronze",
        priceInCents: 24000,
        stock: 12,
        lowStockThreshold: 4,
      },
    ],
  },
  {
    id: "prod_05",
    slug: "structured-virgin-wool-blazer",
    title: "Structured Virgin Wool Blazer",
    description:
      "Full canvas construction using Super 150s virgin wool from Biella, Italy. Half-lined with mother-of-pearl buttons and hand-sewn pick stitching.",
    categorySlug: "apparel",
    categoryName: "Apparel",
    basePriceInCents: 110000, // $1,100.00
    featured: true,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000",
        alt: "Structured Virgin Wool Blazer in Charcoal Melange",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_05_charcoal_38",
        sku: "NEX-BZ-CHR-38",
        title: "Charcoal Melange / US 38",
        size: "US 38",
        color: "Charcoal",
        priceInCents: 110000,
        stock: 3,
        lowStockThreshold: 2,
      },
      {
        id: "var_05_charcoal_40",
        sku: "NEX-BZ-CHR-40",
        title: "Charcoal Melange / US 40",
        size: "US 40",
        color: "Charcoal",
        priceInCents: 110000,
        stock: 5,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_06",
    slug: "burnished-calf-leather-chelsea-boots",
    title: "Burnished Calf Leather Chelsea Boots",
    description:
      "Hand-antiqued Italian calfskin with elasticated gussets and Goodyear welt construction. Equipped with studded rubber soles for all-weather traction.",
    categorySlug: "footwear",
    categoryName: "Footwear",
    basePriceInCents: 59000, // $590.00
    featured: false,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=1000",
        alt: "Burnished Calf Leather Chelsea Boots in Chestnut Brown",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_06_chestnut_42",
        sku: "NEX-CH-CSH-42",
        title: "Chestnut Brown / EU 42",
        size: "EU 42",
        color: "Chestnut",
        priceInCents: 59000,
        stock: 6,
        lowStockThreshold: 2,
      },
      {
        id: "var_06_chestnut_43",
        sku: "NEX-CH-CSH-43",
        title: "Chestnut Brown / EU 43",
        size: "EU 43",
        color: "Chestnut",
        priceInCents: 59000,
        stock: 4,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_07",
    slug: "sea-island-cotton-french-cuff-dress-shirt",
    title: "Sea Island Cotton French-Cuff Dress Shirt",
    description:
      "Spun from ultra-long staple West Indian Sea Island cotton. Finished with genuine mother-of-pearl buttons, split back yoke, and structured spread collar.",
    categorySlug: "apparel",
    categoryName: "Apparel",
    basePriceInCents: 38000, // $380.00
    featured: false,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000",
        alt: "Sea Island Cotton French-Cuff Dress Shirt in Crisp White",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_07_white_155",
        sku: "NEX-SH-WHT-155",
        title: "Optical White / 15.5",
        size: "15.5",
        color: "Optical White",
        priceInCents: 38000,
        stock: 9,
        lowStockThreshold: 3,
      },
      {
        id: "var_07_white_160",
        sku: "NEX-SH-WHT-160",
        title: "Optical White / 16.0",
        size: "16.0",
        color: "Optical White",
        priceInCents: 38000,
        stock: 7,
        lowStockThreshold: 3,
      },
    ],
  },
  {
    id: "prod_08",
    slug: "suede-penny-loafers-beveled-waist",
    title: "Suede Penny Loafers with Beveled Waist",
    description:
      "Supple English Charles F. Stead snuff suede with hand-stitched apron and channelled leather soles with fiddleback waist sculpting.",
    categorySlug: "footwear",
    categoryName: "Footwear",
    basePriceInCents: 52000, // $520.00
    featured: false,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1000",
        alt: "Suede Penny Loafers in Snuff Brown",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_08_snuff_41",
        sku: "NEX-LF-SNF-41",
        title: "Snuff Brown / EU 41",
        size: "EU 41",
        color: "Snuff Brown",
        priceInCents: 52000,
        stock: 5,
        lowStockThreshold: 2,
      },
      {
        id: "var_08_snuff_42",
        sku: "NEX-LF-SNF-42",
        title: "Snuff Brown / EU 42",
        size: "EU 42",
        color: "Snuff Brown",
        priceInCents: 52000,
        stock: 8,
        lowStockThreshold: 2,
      },
    ],
  },
  {
    id: "prod_09",
    slug: "hand-forged-sterling-silver-cufflinks",
    title: "Hand-Forged Sterling Silver Cufflinks",
    description:
      "Handcrafted in 925 sterling silver with guilloché engraving and whaleback toggles. Hand-polished to an opulent mirror sheen.",
    categorySlug: "accessories",
    categoryName: "Accessories",
    basePriceInCents: 32000, // $320.00
    featured: false,
    published: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1590548784585-643d2b9f2925?auto=format&fit=crop&q=80&w=1000",
        alt: "Sterling Silver Guilloché Cufflinks",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_09_silver_os",
        sku: "NEX-CF-SLV-OS",
        title: "Sterling Silver / One Size",
        size: "One Size",
        color: "Silver",
        priceInCents: 32000,
        stock: 14,
        lowStockThreshold: 4,
      },
    ],
  },
  {
    id: "prod_archive_01",
    slug: "bespoke-vicuna-overcoat-private-archive",
    title: "Bespoke Vicuña Overcoat (Private Archive)",
    description:
      "Exclusive Peruvian royal vicuña textile reserved for private commission clients. Not available for public storefront purchase.",
    categorySlug: "apparel",
    categoryName: "Apparel",
    basePriceInCents: 4500000, // $45,000.00
    featured: false,
    published: false, // Testing unpublished security
    images: [
      {
        url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
        alt: "Private Archive Vicuna Overcoat",
        position: 0,
      },
    ],
    variants: [
      {
        id: "var_archive_vicuna_40",
        sku: "NEX-VICUNA-40",
        title: "Natural Vicuña / US 40",
        size: "US 40",
        color: "Natural Vicuña",
        priceInCents: 4500000,
        stock: 1,
        lowStockThreshold: 1,
      },
    ],
  },
];

async function seed() {
  console.log("Starting NEXORA database seeding...");

  // 0. Ensure default business exists
  await prisma.business.upsert({
    where: { id: "default-store" },
    update: {},
    create: {
      id: "default-store",
      slug: "nexora",
      name: "NEXORA Haute Couture",
      type: "LUXURY_FASHION",
      status: "ACTIVE",
      currency: "USD",
    },
  });

  // 1. Seed Categories (idempotent upsert)
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: {
        businessId_slug: {
          businessId: "default-store",
          slug: cat.slug,
        },
      },
      update: {
        name: cat.name,
        description: cat.description,
        imageUrl: cat.imageUrl,
      },
      create: {
        id: cat.id,
        businessId: "default-store",
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
      },
    });
    console.log(`✓ Category seeded: ${cat.name} (${cat.slug})`);
  }

  // 2. Seed Products, Images, and Variants (idempotent upsert)
  for (const prod of PRODUCTS) {
    const category = await prisma.category.findUnique({
      where: {
        businessId_slug: {
          businessId: "default-store",
          slug: prod.categorySlug,
        },
      },
    });

    const product = await prisma.product.upsert({
      where: {
        businessId_slug: {
          businessId: "default-store",
          slug: prod.slug,
        },
      },
      update: {
        title: prod.title,
        description: prod.description,
        category: prod.categoryName,
        categoryId: category?.id,
        basePriceInCents: prod.basePriceInCents,
        featured: prod.featured,
        published: prod.published,
      },
      create: {
        id: prod.id,
        businessId: "default-store",
        title: prod.title,
        slug: prod.slug,
        description: prod.description,
        category: prod.categoryName,
        categoryId: category?.id,
        basePriceInCents: prod.basePriceInCents,
        featured: prod.featured,
        published: prod.published,
      },
    });

    // Seed Images
    // Clean existing images for this product to prevent duplicate ordering on re-seed
    await prisma.productImage.deleteMany({
      where: { productId: product.id },
    });

    for (const img of prod.images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: img.url,
          alt: img.alt,
          position: img.position,
        },
      });
    }

    // Seed Variants
    for (const v of prod.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: product.id,
          title: v.title,
          size: v.size,
          color: v.color,
          priceInCents: v.priceInCents,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold ?? 5,
        },
        create: {
          id: v.id,
          productId: product.id,
          sku: v.sku,
          title: v.title,
          size: v.size,
          color: v.color,
          priceInCents: v.priceInCents,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold ?? 5,
        },
      });
    }

    console.log(
      `✓ Product seeded: ${prod.title} [${prod.published ? "PUBLISHED" : "UNPUBLISHED"}] with ${prod.variants.length} variant(s)`
    );
  }

  const categoryCount = await prisma.category.count();
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const imageCount = await prisma.productImage.count();

  console.log("\n--- Seeding Summary ---");
  console.log(`Categories in DB: ${categoryCount}`);
  console.log(`Products in DB:   ${productCount}`);
  console.log(`Variants in DB:   ${variantCount}`);
  console.log(`Images in DB:     ${imageCount}`);
  console.log("Seeding complete successfully.");
}

seed()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
