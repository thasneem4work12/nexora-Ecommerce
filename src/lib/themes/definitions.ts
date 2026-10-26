import type { ThemeDefinition, ThemeId } from "@/types/theme";

export const EDITORIAL_LUXURY_THEME: ThemeDefinition = {
  id: "editorial-luxury",
  name: "Editorial Luxury",
  tagline: "Ivory, Cream & Classical Parisian Haute Couture",
  description:
    "An elevated, warm aesthetic balancing combed cashmeres, bronze accents, and editorial serif typography. Designed for traditional high-fashion boutiques and heritage craftspeople.",
  palette: {
    canvasPrimary: "#FAF8F5",
    canvasSecondary: "#F4EFEA",
    canvasSurface: "#FFFFFF",
    textPrimary: "#1A1918",
    textSecondary: "#4A4744",
    textMuted: "#79756F",
    textSubtle: "#A39E96",
    accentPrimary: "#966A38",
    accentPrimaryLight: "#B58A54",
    accentPrimaryDark: "#704D25",
    borderSubtle: "#EBE6DF",
    borderDefault: "#E0D9CF",
    borderStrong: "#C4B9AA",
  },
  typography: {
    fontSerif: '"Playfair Display", Georgia, "Times New Roman", serif',
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headingFont: "serif",
    headingTransform: "none",
    headingLetterSpacing: "tracking-tight",
  },
  borders: {
    buttonRadius: "none",
    cardRadius: "none",
    badgeRadius: "none",
  },
  header: {
    style: "classic",
    isSticky: true,
    showAnnouncement: true,
    announcementText: "Complimentary Worldwide Delivery on Orders Over $150",
    announcementLink: "/products",
  },
  footer: {
    style: "classic-columns",
    showGuarantees: true,
    copyrightText: "© 2026 NEXORA Haute Couture. All rights reserved.",
    tagline: "Dedicated to the uncompromised preservation of heritage garment tailoring and artisanal complications.",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "pinterest", url: "https://pinterest.com" },
      { platform: "linkedin", url: "https://linkedin.com" },
    ],
  },
  productCard: {
    style: "editorial",
    aspectRatio: "3/4",
    quickAddStyle: "overlay",
    badgeStyle: "subtle",
    showCategory: true,
  },
  defaultSections: [
    {
      id: "sec-hero-editorial",
      type: "hero",
      enabled: true,
      layout: "editorial-split",
      badgeText: "Autumn / Winter Atelier Edition",
      headline: "The Architecture of Quiet Luxury",
      subheadline:
        "Sculpted tailoring, rare Mongolian combed cashmeres, and hand-welted cordwaining. Made for those who appreciate distinction without volume.",
      primaryCtaText: "Explore Collection",
      primaryCtaLink: "/products",
      secondaryCtaText: "The Tailored Coat",
      secondaryCtaLink: "/products?category=apparel",
      imageUrl:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=2000",
      imageAlt: "NEXORA Autumn Lookbook",
      alignment: "left",
    },
    {
      id: "sec-featured-editorial",
      type: "featured_products",
      enabled: true,
      title: "Signature Creations",
      subtitle: "Curated Selection",
      viewAllText: "View Complete Catalog",
      maxProducts: 4,
    },
    {
      id: "sec-disciplines-editorial",
      type: "categories",
      enabled: true,
      title: "The House Disciplines",
      subtitle: "Three Pillars",
      items: [
        {
          slug: "apparel",
          title: "Tailored Apparel",
          disciplineLabel: "Discipline I",
          description: "Unstructured blazers, double-faced cashmere coats, and sea-island cotton shirts.",
          imageUrl:
            "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000",
        },
        {
          slug: "footwear",
          title: "Artisanal Footwear",
          disciplineLabel: "Discipline II",
          description: "Goodyear welted wholecuts, hand-painted crust leathers, and sculpted lasts.",
          imageUrl:
            "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000",
        },
        {
          slug: "accessories",
          title: "Fine Leather Goods",
          disciplineLabel: "Discipline III",
          description: "Bridle leather briefcases, hand-rolled silk foulards, and brass accoutrements.",
          imageUrl:
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000",
        },
      ],
    },
    {
      id: "sec-philosophy-editorial",
      type: "brand_story",
      enabled: true,
      badge: "Our Philosophy",
      quote: "True distinction is never shouted; it is revealed in the stitch.",
      narrative:
        "Every NEXORA piece is produced in limited micro-batches in heritage workshops across Italy, the UK, and Japan. We reject fast trends in favor of enduring silhouettes and materials that develop exceptional patina over decades.",
      buttonText: "Experience the Craft",
      buttonLink: "/products",
    },
    {
      id: "sec-benefits-editorial",
      type: "benefits",
      enabled: true,
      items: [
        {
          icon: "truck",
          title: "Complimentary Shipping",
          description: "On all international orders over $150 with insured courier dispatch.",
        },
        {
          icon: "shield",
          title: "Artisanal Provenance",
          description: "Every creation comes with a verified digital certificate of authenticity.",
        },
        {
          icon: "refresh",
          title: "Discreet Returns",
          description: "30-day effortless return privilege with door-to-door concierge pickup.",
        },
      ],
    },
  ],
};

export const MIDNIGHT_NOIR_THEME: ThemeDefinition = {
  id: "midnight-noir",
  name: "Midnight Noir",
  tagline: "Deep Charcoal, Jet Black & Restrained Metallic Gold",
  description:
    "A nocturnal, mysterious luxury aesthetic built for exclusive high-jewelry salons, private complications, and avant-garde evening wear. Rich dark surfaces with metallic luminance.",
  palette: {
    canvasPrimary: "#0B0B0D",
    canvasSecondary: "#141418",
    canvasSurface: "#1B1B22",
    textPrimary: "#F7F7FA",
    textSecondary: "#C5C5D1",
    textMuted: "#8B8B9E",
    textSubtle: "#565666",
    accentPrimary: "#D4AF37", // Metallic Gold
    accentPrimaryLight: "#E6CA65",
    accentPrimaryDark: "#9E7E1D",
    borderSubtle: "#23232C",
    borderDefault: "#2F2F3D",
    borderStrong: "#454559",
  },
  typography: {
    fontSerif: '"Cinzel", "Playfair Display", Georgia, serif',
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFont: "serif",
    headingTransform: "uppercase",
    headingLetterSpacing: "tracking-luxury",
  },
  borders: {
    buttonRadius: "sm",
    cardRadius: "sm",
    badgeRadius: "sm",
  },
  header: {
    style: "centered",
    isSticky: true,
    showAnnouncement: true,
    announcementText: "Private Nocturne Salon — Private Viewings Open Worldwide",
    announcementLink: "/products",
  },
  footer: {
    style: "dark-luxe",
    showGuarantees: true,
    copyrightText: "© 2026 NEXORA NOIR. All rights reserved.",
    tagline: "Architects of the nocturnal aesthetic. Precision, rarity, and quiet metallic elegance.",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "twitter", url: "https://x.com" },
    ],
  },
  productCard: {
    style: "noir-glow",
    aspectRatio: "3/4",
    quickAddStyle: "overlay",
    badgeStyle: "metallic",
    showCategory: true,
  },
  defaultSections: [
    {
      id: "sec-hero-noir",
      type: "hero",
      enabled: true,
      layout: "cinematic-dark",
      badgeText: "Archival Nocturne Release",
      headline: "Mastery Forged in Shadow",
      subheadline:
        "Matte carbon finishes, blackened tungsten hardware, and obsidian lambskins. Created exclusively for after-hours distinction.",
      primaryCtaText: "Enter the Nocturne",
      primaryCtaLink: "/products",
      secondaryCtaText: "View Complications",
      secondaryCtaLink: "/products?category=accessories",
      imageUrl:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=85&w=2000",
      imageAlt: "Midnight Noir Collection",
      alignment: "center",
    },
    {
      id: "sec-featured-noir",
      type: "featured_products",
      enabled: true,
      title: "Archival Pieces",
      subtitle: "Micro-Batch Complications",
      viewAllText: "Access Nocturne Vault",
      maxProducts: 4,
    },
    {
      id: "sec-promo-noir",
      type: "promotional_banner",
      enabled: true,
      badge: "Exclusive Privileges",
      headline: "Nocturne Private Salons",
      description:
        "Private appointment access and bespoke titanium hardware customization for authenticated patrons.",
      buttonText: "Schedule Private Fitting",
      buttonLink: "/account/support",
      backgroundColor: "#1B1B22",
    },
    {
      id: "sec-story-noir",
      type: "brand_story",
      enabled: true,
      badge: "The Atelier Manifesto",
      quote: "When the lights recede, true craftsmanship absorbs the spotlight.",
      narrative:
        "Every piece is precision hand-finished under singular illumination. We combine centuries-old Japanese indigo and blackened calfskins with aerospace tolerances.",
      buttonText: "Explore Provenance",
      buttonLink: "/products",
    },
    {
      id: "sec-newsletter-noir",
      type: "newsletter",
      enabled: true,
      title: "Join the Inner Circle",
      description: "Confidential access to unlisted commissions and private salon events.",
      placeholder: "Your confidential email",
      buttonText: "Request Access",
    },
  ],
};

export const MODERN_MINIMAL_THEME: ThemeDefinition = {
  id: "modern-minimal",
  name: "Modern Minimal",
  tagline: "Pure White, Soft Grey & Modernist Balance",
  description:
    "A clean, contemporary Scandinavian aesthetic defined by spacious grids, soft neutral greys, crisp rounded cards, and unpretentious modern sans-serif typography.",
  palette: {
    canvasPrimary: "#FFFFFF",
    canvasSecondary: "#F8F9FA",
    canvasSurface: "#FFFFFF",
    textPrimary: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    textSubtle: "#D1D5DB",
    accentPrimary: "#2563EB", // Modern Electric Cobalt
    accentPrimaryLight: "#60A5FA",
    accentPrimaryDark: "#1D4ED8",
    borderSubtle: "#F3F4F6",
    borderDefault: "#E5E7EB",
    borderStrong: "#D1D5DB",
  },
  typography: {
    fontSerif: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFont: "sans",
    headingTransform: "none",
    headingLetterSpacing: "tracking-tight",
  },
  borders: {
    buttonRadius: "md",
    cardRadius: "md",
    badgeRadius: "full",
  },
  header: {
    style: "minimal",
    isSticky: true,
    showAnnouncement: false,
    announcementText: "Free carbon-neutral courier delivery on all orders.",
    announcementLink: "/products",
  },
  footer: {
    style: "minimal-clean",
    showGuarantees: true,
    copyrightText: "© 2026 NEXORA STUDIO. All rights reserved.",
    tagline: "Essential forms, sustainable materials, and conscious modern construction.",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "linkedin", url: "https://linkedin.com" },
    ],
  },
  productCard: {
    style: "minimal-card",
    aspectRatio: "1/1",
    quickAddStyle: "bottom-bar",
    badgeStyle: "pill",
    showCategory: true,
  },
  defaultSections: [
    {
      id: "sec-hero-minimal",
      type: "hero",
      enabled: true,
      layout: "minimal-clean",
      badgeText: "Collection 06 / Essentials",
      headline: "Simplicity Without Compromise",
      subheadline:
        "Engineered for functional beauty. Clean silhouettes, organic Japanese poplins, and conscious low-impact dyes.",
      primaryCtaText: "Shop the Essentials",
      primaryCtaLink: "/products",
      secondaryCtaText: "Our Sustainability",
      secondaryCtaLink: "/products",
      imageUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000",
      imageAlt: "Modern Minimal Showcase",
      alignment: "left",
    },
    {
      id: "sec-featured-minimal",
      type: "featured_products",
      enabled: true,
      title: "Core Essentials",
      subtitle: "Functional Design",
      viewAllText: "Browse All Pieces",
      maxProducts: 4,
    },
    {
      id: "sec-imagetext-minimal",
      type: "image_text",
      enabled: true,
      badge: "Conscious Craft",
      title: "Traceable Organic Materials",
      description:
        "We source solely from certified regenerative cooperatives. Every garment includes verifiable provenance tracking from soil to stitch.",
      imageUrl:
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1000",
      imagePosition: "right",
      buttonText: "Read Transparency Report",
      buttonLink: "/products",
    },
    {
      id: "sec-benefits-minimal",
      type: "benefits",
      enabled: true,
      items: [
        {
          icon: "truck",
          title: "Carbon-Neutral Delivery",
          description: "100% verified carbon offset on all domestic and international shipments.",
        },
        {
          icon: "refresh",
          title: "Circular Trade-In",
          description: "Guaranteed buyback credit when you are ready to refresh your wardrobe.",
        },
        {
          icon: "shield",
          title: "Lifetime Repair",
          description: "Complimentary repair service on seams and hardware forever.",
        },
      ],
    },
  ],
};

export const ORANGE_ENERGY_THEME: ThemeDefinition = {
  id: "orange-energy",
  name: "Orange Energy",
  tagline: "Bold Black, Sharp White & Electric Kinetic Orange",
  description:
    "A high-voltage, vibrant contemporary aesthetic designed for luxury streetwear, high-performance apparel, and cutting-edge design studios. Bold contrasts, razor-sharp edges, and electric energy.",
  palette: {
    canvasPrimary: "#000000",
    canvasSecondary: "#0D0D0D",
    canvasSurface: "#171717",
    textPrimary: "#FFFFFF",
    textSecondary: "#E5E5E5",
    textMuted: "#A3A3A3",
    textSubtle: "#525252",
    accentPrimary: "#FF5500", // Electric Kinetic Orange
    accentPrimaryLight: "#FF7733",
    accentPrimaryDark: "#CC4400",
    borderSubtle: "#262626",
    borderDefault: "#333333",
    borderStrong: "#525252",
  },
  typography: {
    fontSerif: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFont: "sans",
    headingTransform: "uppercase",
    headingLetterSpacing: "tracking-wide",
  },
  borders: {
    buttonRadius: "none",
    cardRadius: "none",
    badgeRadius: "none",
  },
  header: {
    style: "bold",
    isSticky: true,
    showAnnouncement: true,
    announcementText: "⚡ FLASH DROP ACTIVE — GLOBAL EXPRESS COURIER DISPATCH WITHIN 24H ⚡",
    announcementLink: "/products",
  },
  footer: {
    style: "bold-energy",
    showGuarantees: true,
    copyrightText: "© 2026 NEXORA KINETIC / TOKYO • LONDON • NYC",
    tagline: "HIGH PERFORMANCE LUXURY APPAREL. NEVER COMPROMISE VELOCITY.",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "twitter", url: "https://x.com" },
      { platform: "youtube", url: "https://youtube.com" },
    ],
  },
  productCard: {
    style: "energy-contrast",
    aspectRatio: "4/5",
    quickAddStyle: "button-icon",
    badgeStyle: "sharp-bold",
    showCategory: true,
  },
  defaultSections: [
    {
      id: "sec-hero-energy",
      type: "hero",
      enabled: true,
      layout: "energy-banner",
      badgeText: "DROP 04 / UNSTOPPABLE",
      headline: "VELOCITY MEETS COUTURE",
      subheadline:
        "Ballistic ripstop, Kevlar reinforcements, and ultra-high-density microfibers. Built for the modern asphalt warrior.",
      primaryCtaText: "ACQUIRE NOW",
      primaryCtaLink: "/products",
      secondaryCtaText: "VIEW DROP LOOKBOOK",
      secondaryCtaLink: "/products?category=apparel",
      imageUrl:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=85&w=2000",
      imageAlt: "Orange Energy Kinetic Lookbook",
      alignment: "left",
    },
    {
      id: "sec-featured-energy",
      type: "featured_products",
      enabled: true,
      title: "HOT COMMISSIONS",
      subtitle: "LIMITED RUN DROPS",
      viewAllText: "VIEW ALL DROPS",
      maxProducts: 4,
    },
    {
      id: "sec-promo-energy",
      type: "promotional_banner",
      enabled: true,
      badge: "SPECIAL DIRECTIVE",
      headline: "SEASONAL EXPEDITION PRIVILEGE",
      description:
        "Every piece ships in custom laser-etched tactical crates with waterproof serialized provenance chips.",
      buttonText: "UNLOCK COMMISSIONS",
      buttonLink: "/products",
      backgroundColor: "#FF5500",
    },
    {
      id: "sec-story-energy",
      type: "brand_story",
      enabled: true,
      badge: "THE DOCTRINE",
      quote: "SPEED IS LUXURY. IMPACT IS EVERYTHING.",
      narrative:
        "We engineer high-tension garments with Zero Failure thresholds. From extreme temperature resilience to urban agility, our gear is battle-tested in the world's most unforgiving metropolitan centers.",
      buttonText: "OUR TECHNICAL SPECS",
      buttonLink: "/products",
    },
    {
      id: "sec-newsletter-energy",
      type: "newsletter",
      enabled: true,
      title: "GET NOTIFIED FIRST",
      description: "Drops sell out within minutes. Subscribe for SMS & private drop coordinates.",
      placeholder: "YOUR EMAIL OR PHONE",
      buttonText: "GET EARLY ACCESS",
    },
  ],
};

export const THEME_REGISTRY: Record<ThemeId, ThemeDefinition> = {
  "editorial-luxury": EDITORIAL_LUXURY_THEME,
  "midnight-noir": MIDNIGHT_NOIR_THEME,
  "modern-minimal": MODERN_MINIMAL_THEME,
  "orange-energy": ORANGE_ENERGY_THEME,
};

export function getThemeDefinition(themeId: string): ThemeDefinition {
  if (themeId in THEME_REGISTRY) {
    return THEME_REGISTRY[themeId as ThemeId];
  }
  return EDITORIAL_LUXURY_THEME;
}

export const DEFAULT_APPEARANCE_CONFIG = {
  activeThemeId: "editorial-luxury" as ThemeId,
  storeName: "NEXORA",
  storeTagline: "Haute Couture",
  logoUrl: null,
  faviconUrl: null,
  contactEmail: "concierge@nexoracommerce.com",
  contactPhone: "+1 (800) 456-7890",
  announcementText: EDITORIAL_LUXURY_THEME.header.announcementText,
  announcementEnabled: EDITORIAL_LUXURY_THEME.header.showAnnouncement,
  announcementLink: EDITORIAL_LUXURY_THEME.header.announcementLink,
  primaryColor: null,
  secondaryColor: null,
  fontPreset: "default" as const,
  header: EDITORIAL_LUXURY_THEME.header,
  footer: EDITORIAL_LUXURY_THEME.footer,
  productCard: EDITORIAL_LUXURY_THEME.productCard,
  homepageSections: EDITORIAL_LUXURY_THEME.defaultSections,
  hasUnpublishedDraft: false,
};
