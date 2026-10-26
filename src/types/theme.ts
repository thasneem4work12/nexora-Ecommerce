import { z } from "zod";

export const THEME_IDS = [
  "editorial-luxury",
  "midnight-noir",
  "modern-minimal",
  "orange-energy",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const themeIdSchema = z.enum(THEME_IDS);

// Safe Hex Color Regex (#RGB or #RRGGBB)
export const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color format (e.g. #FFFFFF or #FFF)");

// Safe URL Schema (must be http, https, or relative path starting with /)
export const safeUrlSchema = z
  .string()
  .refine(
    (url) => {
      if (!url || url.trim() === "") return true;
      if (url.startsWith("/")) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must be a valid relative path or HTTP/HTTPS link" }
  );

export const colorPaletteSchema = z.object({
  canvasPrimary: hexColorSchema,
  canvasSecondary: hexColorSchema,
  canvasSurface: hexColorSchema,
  textPrimary: hexColorSchema,
  textSecondary: hexColorSchema,
  textMuted: hexColorSchema,
  textSubtle: hexColorSchema,
  accentPrimary: hexColorSchema,
  accentPrimaryLight: hexColorSchema,
  accentPrimaryDark: hexColorSchema,
  borderSubtle: hexColorSchema,
  borderDefault: hexColorSchema,
  borderStrong: hexColorSchema,
});

export type ColorPalette = z.infer<typeof colorPaletteSchema>;

export const typographyTokensSchema = z.object({
  fontSerif: z.string(),
  fontSans: z.string(),
  headingFont: z.enum(["serif", "sans"]),
  headingTransform: z.enum(["uppercase", "none", "capitalize"]),
  headingLetterSpacing: z.enum([
    "tracking-tighter",
    "tracking-tight",
    "tracking-normal",
    "tracking-wide",
    "tracking-wider",
    "tracking-widest",
    "tracking-luxury",
  ]),
});

export type TypographyTokens = z.infer<typeof typographyTokensSchema>;

export const borderTokensSchema = z.object({
  buttonRadius: z.enum(["none", "sm", "md", "full"]),
  cardRadius: z.enum(["none", "sm", "md", "lg"]),
  badgeRadius: z.enum(["none", "sm", "md", "full"]),
});

export type BorderTokens = z.infer<typeof borderTokensSchema>;

export const headerLayoutConfigSchema = z.object({
  style: z.enum(["classic", "centered", "minimal", "bold"]),
  isSticky: z.boolean().default(true),
  showAnnouncement: z.boolean().default(true),
  announcementText: z.string().max(200).default("Complimentary Worldwide Delivery on Orders Over $150"),
  announcementLink: safeUrlSchema.optional().nullable(),
});

export type HeaderLayoutConfig = z.infer<typeof headerLayoutConfigSchema>;

export const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "twitter", "facebook", "linkedin", "pinterest", "youtube"]),
  url: safeUrlSchema,
});

export type SocialLink = z.infer<typeof socialLinkSchema>;

export const footerLayoutConfigSchema = z.object({
  style: z.enum(["classic-columns", "dark-luxe", "minimal-clean", "bold-energy"]),
  showGuarantees: z.boolean().default(true),
  copyrightText: z.string().max(200).default("All rights reserved."),
  tagline: z.string().max(300).optional(),
  socialLinks: z.array(socialLinkSchema).default([]),
});

export type FooterLayoutConfig = z.infer<typeof footerLayoutConfigSchema>;

export const productCardConfigSchema = z.object({
  style: z.enum(["editorial", "noir-glow", "minimal-card", "energy-contrast"]),
  aspectRatio: z.enum(["3/4", "1/1", "4/5"]),
  quickAddStyle: z.enum(["overlay", "bottom-bar", "button-icon"]),
  badgeStyle: z.enum(["subtle", "metallic", "pill", "sharp-bold"]),
  showCategory: z.boolean().default(true),
});

export type ProductCardConfig = z.infer<typeof productCardConfigSchema>;

// Section Schemas
export const heroSectionSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  enabled: z.boolean().default(true),
  layout: z.enum(["editorial-split", "cinematic-dark", "minimal-clean", "energy-banner"]).default("editorial-split"),
  badgeText: z.string().max(100).optional(),
  headline: z.string().max(150),
  subheadline: z.string().max(400),
  primaryCtaText: z.string().max(50).default("Explore Collection"),
  primaryCtaLink: safeUrlSchema.default("/products"),
  secondaryCtaText: z.string().max(50).optional(),
  secondaryCtaLink: safeUrlSchema.optional(),
  imageUrl: safeUrlSchema,
  imageAlt: z.string().max(150).default("Collection lookbook"),
  alignment: z.enum(["left", "center"]).default("left"),
});

export const featuredProductsSectionSchema = z.object({
  id: z.string(),
  type: z.literal("featured_products"),
  enabled: z.boolean().default(true),
  title: z.string().max(100).default("Signature Creations"),
  subtitle: z.string().max(200).default("Curated Selection"),
  viewAllText: z.string().max(50).default("View Complete Catalog"),
  maxProducts: z.number().int().min(1).max(12).default(4),
});

export const categoriesSectionSchema = z.object({
  id: z.string(),
  type: z.literal("categories"),
  enabled: z.boolean().default(true),
  title: z.string().max(100).default("The House Disciplines"),
  subtitle: z.string().max(200).default("Core Pillars"),
  items: z
    .array(
      z.object({
        slug: z.string(),
        title: z.string(),
        disciplineLabel: z.string().optional(),
        description: z.string(),
        imageUrl: safeUrlSchema,
      })
    )
    .default([]),
});

export const promotionalBannerSectionSchema = z.object({
  id: z.string(),
  type: z.literal("promotional_banner"),
  enabled: z.boolean().default(true),
  badge: z.string().max(100).default("Private Salon Event"),
  headline: z.string().max(150).default("Mid-Season Acquisition Privilege"),
  description: z.string().max(300).default("Receive private atelier packaging on all archival commissions."),
  buttonText: z.string().max(50).default("Browse Archive"),
  buttonLink: safeUrlSchema.default("/products"),
  backgroundColor: hexColorSchema.optional(),
});

export const brandStorySectionSchema = z.object({
  id: z.string(),
  type: z.literal("brand_story"),
  enabled: z.boolean().default(true),
  badge: z.string().max(100).default("Our Philosophy"),
  quote: z.string().max(250).default("True distinction is never shouted; it is revealed in the stitch."),
  narrative: z
    .string()
    .max(1000)
    .default(
      "Every NEXORA piece is produced in limited micro-batches in heritage workshops across Italy, the UK, and Japan. We reject fast trends in favor of enduring silhouettes."
    ),
  buttonText: z.string().max(50).default("Experience the Craft"),
  buttonLink: safeUrlSchema.default("/products"),
});

export const imageTextSectionSchema = z.object({
  id: z.string(),
  type: z.literal("image_text"),
  enabled: z.boolean().default(true),
  badge: z.string().max(100).default("Master Artistry"),
  title: z.string().max(150).default("Hand-Welted Cordwaining"),
  description: z
    .string()
    .max(800)
    .default("Each pair requires seventy-two hours of patient hand assembly on custom carved wooden lasts."),
  imageUrl: safeUrlSchema,
  imagePosition: z.enum(["left", "right"]).default("left"),
  buttonText: z.string().max(50).default("Discover Complications"),
  buttonLink: safeUrlSchema.default("/products?category=footwear"),
});

export const newsletterSectionSchema = z.object({
  id: z.string(),
  type: z.literal("newsletter"),
  enabled: z.boolean().default(true),
  title: z.string().max(150).default("Atelier Private Dispatches"),
  description: z
    .string()
    .max(300)
    .default("Receive private invitations to seasonal private salons and archival releases."),
  placeholder: z.string().max(100).default("Enter your private email address"),
  buttonText: z.string().max(50).default("Request Invitation"),
});

export const benefitsSectionSchema = z.object({
  id: z.string(),
  type: z.literal("benefits"),
  enabled: z.boolean().default(true),
  items: z
    .array(
      z.object({
        icon: z.enum(["truck", "shield", "refresh", "sparkles", "clock", "award"]),
        title: z.string().max(80),
        description: z.string().max(200),
      })
    )
    .default([]),
});

export const homepageSectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  featuredProductsSectionSchema,
  categoriesSectionSchema,
  promotionalBannerSectionSchema,
  brandStorySectionSchema,
  imageTextSectionSchema,
  newsletterSectionSchema,
  benefitsSectionSchema,
]);

export type HomepageSection = z.infer<typeof homepageSectionSchema>;
export type HomepageSectionConfig = HomepageSection;

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  palette: ColorPalette;
  typography: TypographyTokens;
  borders: BorderTokens;
  header: HeaderLayoutConfig;
  footer: FooterLayoutConfig;
  productCard: ProductCardConfig;
  defaultSections: HomepageSection[];
}

export const storeAppearanceConfigSchema = z.object({
  activeThemeId: themeIdSchema.default("editorial-luxury"),
  storeName: z.string().min(1).max(80).default("NEXORA"),
  storeTagline: z.string().max(120).default("Haute Couture"),
  logoUrl: safeUrlSchema.optional().nullable(),
  faviconUrl: safeUrlSchema.optional().nullable(),
  contactEmail: z.string().email("Invalid contact email").optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  announcementText: z.string().max(200).optional().nullable(),
  announcementEnabled: z.boolean().default(true),
  announcementLink: safeUrlSchema.optional().nullable(),
  primaryColor: hexColorSchema.optional().nullable(),
  secondaryColor: hexColorSchema.optional().nullable(),
  fontPreset: z.enum(["default", "serif", "sans"]).default("default"),
  header: headerLayoutConfigSchema,
  footer: footerLayoutConfigSchema,
  productCard: productCardConfigSchema,
  homepageSections: z.array(homepageSectionSchema),
  hasUnpublishedDraft: z.boolean().default(false),
  hasDraft: z.boolean().default(false),
  isPreview: z.boolean().default(false).optional(),
  publishedAt: z.union([z.string(), z.date()]).optional(),
});

export type StoreAppearanceConfig = z.infer<typeof storeAppearanceConfigSchema>;

export const saveDraftInputSchema = z.object({
  activeThemeId: themeIdSchema.optional(),
  storeName: z.string().min(1).max(80).optional(),
  storeTagline: z.string().max(120).optional(),
  logoUrl: safeUrlSchema.optional().nullable(),
  faviconUrl: safeUrlSchema.optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  announcementText: z.string().max(200).optional().nullable(),
  announcementEnabled: z.boolean().optional(),
  announcementLink: safeUrlSchema.optional().nullable(),
  primaryColor: hexColorSchema.optional().nullable(),
  secondaryColor: hexColorSchema.optional().nullable(),
  fontPreset: z.enum(["default", "serif", "sans"]).optional(),
  header: headerLayoutConfigSchema.partial().optional(),
  footer: footerLayoutConfigSchema.partial().optional(),
  homepageSections: z.array(homepageSectionSchema).optional(),
});

export type SaveDraftInput = z.infer<typeof saveDraftInputSchema>;
