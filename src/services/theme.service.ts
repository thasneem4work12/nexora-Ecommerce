import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_APPEARANCE_CONFIG,
  THEME_REGISTRY,
} from "@/lib/themes/definitions";
import {
  ThemeId,
  themeIdSchema,
  saveDraftInputSchema,
  SaveDraftInput,
  StoreAppearanceConfig,
  HomepageSection,
  ColorPalette,
  TypographyTokens,
  BorderTokens,
} from "@/types/theme";

const DEFAULT_BUSINESS_ID = "default-store";

/**
 * Resolves full appearance configuration, merging active theme defaults,
 * published database overrides, and optional draft/preview overrides.
 */
export async function getStoreAppearance(options?: {
  previewThemeId?: string | null;
  previewDraft?: boolean;
  businessId?: string;
}): Promise<StoreAppearanceConfig & { isPreview?: boolean; hasDraft?: boolean }> {
  const businessId = options?.businessId || DEFAULT_BUSINESS_ID;

  let dbRecord = null;
  try {
    dbRecord = await prisma.storeThemeConfig.findUnique({
      where: { businessId },
    });
  } catch (error) {
    console.error("[ThemeService] Error fetching store appearance from DB, falling back to default:", error);
  }

  // Determine whether to use draft config
  const hasDraft = Boolean(dbRecord?.draftConfig);
  const useDraft = Boolean(options?.previewDraft && dbRecord?.draftConfig);
  const draftData = useDraft ? (dbRecord?.draftConfig as Record<string, unknown>) : null;

  // Determine effective theme ID
  let effectiveThemeId: ThemeId = "editorial-luxury";
  if (options?.previewThemeId && themeIdSchema.safeParse(options.previewThemeId).success) {
    effectiveThemeId = options.previewThemeId as ThemeId;
  } else if (draftData?.activeThemeId && themeIdSchema.safeParse(draftData.activeThemeId).success) {
    effectiveThemeId = draftData.activeThemeId as ThemeId;
  } else if (dbRecord?.activeThemeId && themeIdSchema.safeParse(dbRecord.activeThemeId).success) {
    effectiveThemeId = dbRecord.activeThemeId as ThemeId;
  }

  const themeDef = THEME_REGISTRY[effectiveThemeId] || THEME_REGISTRY["editorial-luxury"];

  // Merge values: Theme defaults -> DB Published -> Draft (if requested)
  const storeName = (draftData?.storeName as string) ?? dbRecord?.storeName ?? DEFAULT_APPEARANCE_CONFIG.storeName;
  const storeTagline = (draftData?.storeTagline as string) ?? dbRecord?.storeTagline ?? DEFAULT_APPEARANCE_CONFIG.storeTagline;
  const logoUrl = (draftData?.logoUrl as string) ?? dbRecord?.logoUrl ?? null;
  const faviconUrl = (draftData?.faviconUrl as string) ?? dbRecord?.faviconUrl ?? null;
  const contactEmail = (draftData?.contactEmail as string) ?? dbRecord?.contactEmail ?? DEFAULT_APPEARANCE_CONFIG.contactEmail;
  const contactPhone = (draftData?.contactPhone as string) ?? dbRecord?.contactPhone ?? DEFAULT_APPEARANCE_CONFIG.contactPhone;

  const announcementEnabled = (draftData?.announcementEnabled as boolean) ?? dbRecord?.announcementEnabled ?? themeDef.header.showAnnouncement;
  const announcementText = (draftData?.announcementText as string) ?? dbRecord?.announcementText ?? themeDef.header.announcementText;
  const announcementLink = (draftData?.announcementLink as string) ?? dbRecord?.announcementLink ?? themeDef.header.announcementLink;

  const primaryColor = (draftData?.primaryColor as string) ?? dbRecord?.primaryColor ?? null;
  const secondaryColor = (draftData?.secondaryColor as string) ?? dbRecord?.secondaryColor ?? null;
  const fontPreset = (draftData?.fontPreset as string) ?? dbRecord?.fontPreset ?? "default";

  // Dynamic header and footer configs
  const rawHeader = (draftData?.headerConfig ?? dbRecord?.headerConfig) as Record<string, unknown> | null;
  const header = {
    ...themeDef.header,
    ...(rawHeader || {}),
    showAnnouncement: announcementEnabled,
    announcementText: announcementText ?? themeDef.header.announcementText,
    announcementLink: announcementLink ?? themeDef.header.announcementLink,
  };

  const rawFooter = (draftData?.footerConfig ?? dbRecord?.footerConfig) as Record<string, unknown> | null;
  const footer = {
    ...themeDef.footer,
    ...(rawFooter || {}),
  };

  // Homepage sections
  const rawSections = (draftData?.homepageSections ?? dbRecord?.homepageSections) as Array<unknown> | null;
  const homepageSections = Array.isArray(rawSections) && rawSections.length > 0
    ? (rawSections as unknown as HomepageSection[])
    : themeDef.defaultSections;

  const resolvedConfig: StoreAppearanceConfig & { isPreview?: boolean; hasDraft?: boolean } = {
    activeThemeId: effectiveThemeId,
    storeName,
    storeTagline,
    logoUrl,
    faviconUrl,
    contactEmail,
    contactPhone,
    announcementText,
    announcementEnabled,
    announcementLink,
    primaryColor,
    secondaryColor,
    fontPreset: (fontPreset as "default" | "serif" | "sans") || "default",
    header,
    footer,
    productCard: themeDef.productCard,
    homepageSections,
    hasUnpublishedDraft: hasDraft,
    hasDraft,
    isPreview: Boolean(options?.previewThemeId || useDraft),
  };

  return resolvedConfig;
}

/**
 * Saves a draft appearance without modifying the published storefront.
 */
export async function saveDraftAppearance(
  input: SaveDraftInput,
  businessId = DEFAULT_BUSINESS_ID
): Promise<{ success: boolean; draft: Record<string, unknown> }> {
  const validated = saveDraftInputSchema.parse(input);

  const existing = await prisma.storeThemeConfig.findUnique({
    where: { businessId },
  });

  const existingDraft = (existing?.draftConfig as Record<string, unknown>) || {};
  const mergedDraft = {
    ...existingDraft,
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  await prisma.storeThemeConfig.upsert({
    where: { businessId },
    update: {
      draftConfig: mergedDraft as Prisma.InputJsonValue,
    },
    create: {
      businessId,
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture",
      draftConfig: mergedDraft as Prisma.InputJsonValue,
    },
  });

  return { success: true, draft: mergedDraft };
}

/**
 * Publishes the current draft to the live storefront.
 */
export async function publishAppearance(
  businessId = DEFAULT_BUSINESS_ID
): Promise<StoreAppearanceConfig> {
  const config = await prisma.storeThemeConfig.findUnique({
    where: { businessId },
  });

  if (!config) {
    // Upsert default
    await prisma.storeThemeConfig.create({
      data: {
        businessId,
        activeThemeId: "editorial-luxury",
        storeName: "NEXORA",
        storeTagline: "Haute Couture",
      },
    });
    return getStoreAppearance({ businessId });
  }

  const draft = config.draftConfig as {
    activeThemeId?: ThemeId;
    storeName?: string;
    storeTagline?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    announcementText?: string | null;
    announcementEnabled?: boolean;
    announcementLink?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    fontPreset?: "default" | "serif" | "sans";
    headerConfig?: unknown;
    footerConfig?: unknown;
    homepageSections?: unknown;
  } | null;

  if (draft) {
    // If draft specifies a new active theme, adopt theme defaults for sections/header/footer if not explicitly customized
    const themeDef = draft.activeThemeId
      ? THEME_REGISTRY[draft.activeThemeId as ThemeId] || THEME_REGISTRY["editorial-luxury"]
      : THEME_REGISTRY[config.activeThemeId as ThemeId] || THEME_REGISTRY["editorial-luxury"];

    await prisma.storeThemeConfig.update({
      where: { businessId },
      data: {
        activeThemeId: draft.activeThemeId ?? config.activeThemeId,
        storeName: draft.storeName ?? config.storeName,
        storeTagline: draft.storeTagline ?? config.storeTagline,
        logoUrl: draft.logoUrl !== undefined ? draft.logoUrl : config.logoUrl,
        faviconUrl: draft.faviconUrl !== undefined ? draft.faviconUrl : config.faviconUrl,
        contactEmail: draft.contactEmail ?? config.contactEmail,
        contactPhone: draft.contactPhone ?? config.contactPhone,
        announcementText: draft.announcementText !== undefined ? draft.announcementText : config.announcementText,
        announcementEnabled: draft.announcementEnabled !== undefined ? draft.announcementEnabled : config.announcementEnabled,
        announcementLink: draft.announcementLink !== undefined ? draft.announcementLink : config.announcementLink,
        primaryColor: draft.primaryColor !== undefined ? draft.primaryColor : config.primaryColor,
        secondaryColor: draft.secondaryColor !== undefined ? draft.secondaryColor : config.secondaryColor,
        fontPreset: draft.fontPreset ?? config.fontPreset,
        headerConfig: (draft.headerConfig ?? config.headerConfig ?? themeDef.header) as Prisma.InputJsonValue,
        footerConfig: (draft.footerConfig ?? config.footerConfig ?? themeDef.footer) as Prisma.InputJsonValue,
        homepageSections: (draft.homepageSections ?? config.homepageSections ?? themeDef.defaultSections) as Prisma.InputJsonValue,
        draftConfig: Prisma.DbNull,
        publishedAt: new Date(),
      },
    });
  }

  // Revalidate storefront pages
  try {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/account");
  } catch (err) {
    console.warn("[ThemeService] Revalidation notice:", err);
  }

  return getStoreAppearance({ businessId });
}

/**
 * Discards any pending draft changes.
 */
export async function discardDraftAppearance(
  businessId = DEFAULT_BUSINESS_ID
): Promise<StoreAppearanceConfig> {
  await prisma.storeThemeConfig.updateMany({
    where: { businessId },
    data: {
      draftConfig: Prisma.DbNull,
    },
  });

  return getStoreAppearance({ businessId });
}

/**
 * Restores the live storefront and draft to safe default Editorial Luxury settings.
 */
export async function restoreDefaultAppearance(
  businessId = DEFAULT_BUSINESS_ID
): Promise<StoreAppearanceConfig> {
  const defaultTheme = THEME_REGISTRY["editorial-luxury"];

  await prisma.storeThemeConfig.upsert({
    where: { businessId },
    update: {
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture",
      logoUrl: null,
      faviconUrl: null,
      contactEmail: "concierge@nexoracommerce.com",
      contactPhone: "+1 (800) 456-7890",
      announcementText: defaultTheme.header.announcementText,
      announcementEnabled: defaultTheme.header.showAnnouncement,
      announcementLink: defaultTheme.header.announcementLink,
      primaryColor: null,
      secondaryColor: null,
      fontPreset: "default",
      headerConfig: defaultTheme.header as unknown as Prisma.InputJsonValue,
      footerConfig: defaultTheme.footer as unknown as Prisma.InputJsonValue,
      homepageSections: defaultTheme.defaultSections as unknown as Prisma.InputJsonValue,
      draftConfig: Prisma.DbNull,
      publishedAt: new Date(),
    },
    create: {
      businessId,
      activeThemeId: "editorial-luxury",
      storeName: "NEXORA",
      storeTagline: "Haute Couture",
      contactEmail: "concierge@nexoracommerce.com",
      contactPhone: "+1 (800) 456-7890",
      announcementText: defaultTheme.header.announcementText,
      announcementEnabled: defaultTheme.header.showAnnouncement,
      announcementLink: defaultTheme.header.announcementLink,
      headerConfig: defaultTheme.header as unknown as Prisma.InputJsonValue,
      footerConfig: defaultTheme.footer as unknown as Prisma.InputJsonValue,
      homepageSections: defaultTheme.defaultSections as unknown as Prisma.InputJsonValue,
    },
  });

  try {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/account");
  } catch (err) {
    console.warn("[ThemeService] Revalidation notice:", err);
  }

  return getStoreAppearance({ businessId });
}

/**
 * Generates dynamic CSS variables string for HTML injection.
 * Overrides theme defaults if custom primary/secondary colors are supplied.
 */
export function generateThemeCssVars(
  palette: ColorPalette,
  typography: TypographyTokens,
  borders: BorderTokens,
  overrides?: { primaryColor?: string | null; secondaryColor?: string | null }
): string {
  const primaryAccent = overrides?.primaryColor || palette.accentPrimary;
  const secondaryAccent = overrides?.secondaryColor || palette.accentPrimaryLight;

  const radiusMap: Record<string, string> = {
    none: "0px",
    sm: "2px",
    md: "6px",
    lg: "12px",
    full: "9999px",
  };

  return `
    :root {
      --canvas-primary: ${palette.canvasPrimary};
      --canvas-secondary: ${palette.canvasSecondary};
      --canvas-surface: ${palette.canvasSurface};
      --text-primary: ${palette.textPrimary};
      --text-secondary: ${palette.textSecondary};
      --text-muted: ${palette.textMuted};
      --text-subtle: ${palette.textSubtle};
      --accent-bronze: ${primaryAccent};
      --accent-bronze-light: ${secondaryAccent};
      --accent-bronze-dark: ${palette.accentPrimaryDark};
      --accent-primary: ${primaryAccent};
      --accent-primary-light: ${secondaryAccent};
      --accent-primary-dark: ${palette.accentPrimaryDark};
      --border-subtle: ${palette.borderSubtle};
      --border-default: ${palette.borderDefault};
      --border-strong: ${palette.borderStrong};
      --font-serif: ${typography.fontSerif};
      --font-sans: ${typography.fontSans};
      --radius-btn: ${radiusMap[borders.buttonRadius] || "0px"};
      --radius-card: ${radiusMap[borders.cardRadius] || "0px"};
      --radius-badge: ${radiusMap[borders.badgeRadius] || "0px"};
    }
  `.trim();
}
