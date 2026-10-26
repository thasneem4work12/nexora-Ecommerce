import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getStoreAppearance,
  saveDraftAppearance,
  publishAppearance,
  discardDraftAppearance,
  restoreDefaultAppearance,
  generateThemeCssVars,
} from "./theme.service";
import {
  hexColorSchema,
  safeUrlSchema,
} from "@/types/theme";
import { THEME_REGISTRY } from "@/lib/themes/definitions";
import { hasPermission } from "@/lib/admin-auth";

describe("Store Theme Engine & Appearance Studio Service", () => {
  const TEST_BUSINESS_ID = `test-store-${Date.now()}`;

  beforeAll(async () => {
    // Clean up any test configuration if exists
    await prisma.storeThemeConfig.deleteMany({
      where: { businessId: TEST_BUSINESS_ID },
    });
  });

  afterAll(async () => {
    await prisma.storeThemeConfig.deleteMany({
      where: { businessId: TEST_BUSINESS_ID },
    });
  });

  describe("Theme Fallback & Defaults", () => {
    it("returns default Editorial Luxury appearance when no database record exists", async () => {
      const appearance = await getStoreAppearance({
        businessId: "non-existent-store-xyz",
      });

      expect(appearance.activeThemeId).toBe("editorial-luxury");
      expect(appearance.storeName).toBe("NEXORA");
      expect(appearance.storeTagline).toBe("Haute Couture");
      expect(appearance.hasDraft).toBe(false);
      expect(appearance.homepageSections.length).toBeGreaterThan(0);
    });

    it("correctly retrieves all 4 pre-engineered themes from THEME_REGISTRY", () => {
      const themeIds = Object.keys(THEME_REGISTRY);
      expect(themeIds).toContain("editorial-luxury");
      expect(themeIds).toContain("midnight-noir");
      expect(themeIds).toContain("modern-minimal");
      expect(themeIds).toContain("orange-energy");

      // Verify each theme has complete required design tokens
      themeIds.forEach((id) => {
        const theme = THEME_REGISTRY[id as keyof typeof THEME_REGISTRY];
        expect(theme.name).toBeDefined();
        expect(theme.palette.canvasPrimary).toMatch(/^#[A-Fa-f0-9]{6}$/);
        expect(theme.palette.accentPrimary).toMatch(/^#[A-Fa-f0-9]{6}$/);
        expect(theme.borders.cardRadius).toBeDefined();
        expect(theme.defaultSections.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Validation & Security (Hex Colors and Safe URLs)", () => {
    it("validates valid 6-digit and 3-digit hex colors", () => {
      expect(hexColorSchema.safeParse("#FFFFFF").success).toBe(true);
      expect(hexColorSchema.safeParse("#966A38").success).toBe(true);
      expect(hexColorSchema.safeParse("#000").success).toBe(true);
      expect(hexColorSchema.safeParse("#ff5500").success).toBe(true);
    });

    it("rejects malicious or invalid color strings (preventing CSS injection)", () => {
      expect(hexColorSchema.safeParse("red; background: black").success).toBe(false);
      expect(hexColorSchema.safeParse("url('javascript:evil()')").success).toBe(false);
      expect(hexColorSchema.safeParse("#12345").success).toBe(false);
      expect(hexColorSchema.safeParse("blue").success).toBe(false);
      expect(hexColorSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
    });

    it("validates safe HTTP/HTTPS and relative URLs", () => {
      expect(safeUrlSchema.safeParse("https://images.unsplash.com/photo-1").success).toBe(true);
      expect(safeUrlSchema.safeParse("http://localhost:3000/logo.png").success).toBe(true);
      expect(safeUrlSchema.safeParse("/products?category=apparel").success).toBe(true);
      expect(safeUrlSchema.safeParse("").success).toBe(true);
    });

    it("rejects dangerous protocol URLs (preventing XSS / Script injection)", () => {
      expect(safeUrlSchema.safeParse("javascript:alert(document.cookie)").success).toBe(false);
      expect(safeUrlSchema.safeParse("data:text/html,<script>alert(1)</script>").success).toBe(false);
      expect(safeUrlSchema.safeParse("vbscript:msgbox(1)").success).toBe(false);
    });
  });

  describe("Draft vs Published Isolation Lifecycle", () => {
    it("saves a draft without modifying the published live storefront", async () => {
      // 1. Initialize published store
      await prisma.storeThemeConfig.create({
        data: {
          businessId: TEST_BUSINESS_ID,
          activeThemeId: "editorial-luxury",
          storeName: "Maison Test Haute",
          storeTagline: "Original Atelier",
        },
      });

      // 2. Save draft with Midnight Noir theme and custom store name
      const draftResult = await saveDraftAppearance(
        {
          activeThemeId: "midnight-noir",
          storeName: "Maison Test Noir (Draft)",
          primaryColor: "#D4AF37",
        },
        TEST_BUSINESS_ID
      );

      expect(draftResult.success).toBe(true);

      // 3. Query published storefront (default public view) -> MUST STILL BE ORIGINAL
      const publicAppearance = await getStoreAppearance({
        businessId: TEST_BUSINESS_ID,
        previewDraft: false,
      });

      expect(publicAppearance.activeThemeId).toBe("editorial-luxury");
      expect(publicAppearance.storeName).toBe("Maison Test Haute");
      expect(publicAppearance.hasDraft).toBe(true);

      // 4. Query studio/preview view with previewDraft: true -> MUST REFLECT DRAFT
      const previewAppearance = await getStoreAppearance({
        businessId: TEST_BUSINESS_ID,
        previewDraft: true,
      });

      expect(previewAppearance.activeThemeId).toBe("midnight-noir");
      expect(previewAppearance.storeName).toBe("Maison Test Noir (Draft)");
      expect(previewAppearance.primaryColor).toBe("#D4AF37");
    });

    it("discards draft changes and restores published settings", async () => {
      const discarded = await discardDraftAppearance(TEST_BUSINESS_ID);

      expect(discarded.activeThemeId).toBe("editorial-luxury");
      expect(discarded.storeName).toBe("Maison Test Haute");
      expect(discarded.hasDraft).toBe(false);

      // Verify DB draftConfig is cleared
      const dbRecord = await prisma.storeThemeConfig.findUnique({
        where: { businessId: TEST_BUSINESS_ID },
      });
      expect(dbRecord?.draftConfig).toBeNull();
    });

    it("publishes draft changes to the live storefront", async () => {
      // 1. Save new draft with Orange Energy
      await saveDraftAppearance(
        {
          activeThemeId: "orange-energy",
          storeName: "NEXORA KINETIC",
          storeTagline: "High Voltage Streetwear",
          announcementText: "DROP 01 LIVE NOW",
        },
        TEST_BUSINESS_ID
      );

      // 2. Publish draft
      const published = await publishAppearance(TEST_BUSINESS_ID);

      expect(published.activeThemeId).toBe("orange-energy");
      expect(published.storeName).toBe("NEXORA KINETIC");
      expect(published.storeTagline).toBe("High Voltage Streetwear");
      expect(published.announcementText).toBe("DROP 01 LIVE NOW");
      expect(published.hasDraft).toBe(false);

      // 3. Verify public storefront now serves Orange Energy
      const liveStorefront = await getStoreAppearance({
        businessId: TEST_BUSINESS_ID,
        previewDraft: false,
      });

      expect(liveStorefront.activeThemeId).toBe("orange-energy");
      expect(liveStorefront.storeName).toBe("NEXORA KINETIC");
    });

    it("restores safe default Editorial Luxury settings", async () => {
      const restored = await restoreDefaultAppearance(TEST_BUSINESS_ID);

      expect(restored.activeThemeId).toBe("editorial-luxury");
      expect(restored.storeName).toBe("NEXORA");
      expect(restored.storeTagline).toBe("Haute Couture");
      expect(restored.hasDraft).toBe(false);
    });
  });

  describe("Dynamic CSS Variables Generator", () => {
    it("generates valid CSS variable declarations with default palette", () => {
      const theme = THEME_REGISTRY["editorial-luxury"];
      const css = generateThemeCssVars(theme.palette, theme.typography, theme.borders);

      expect(css).toContain(`--canvas-primary: ${theme.palette.canvasPrimary}`);
      expect(css).toContain(`--text-primary: ${theme.palette.textPrimary}`);
      expect(css).toContain(`--accent-bronze: ${theme.palette.accentPrimary}`);
      expect(css).toContain(`--font-serif: ${theme.typography.fontSerif}`);
      expect(css).toContain(`--radius-btn: 0px`);
    });

    it("applies primary and secondary color overrides cleanly", () => {
      const theme = THEME_REGISTRY["modern-minimal"];
      const css = generateThemeCssVars(theme.palette, theme.typography, theme.borders, {
        primaryColor: "#E11D48",
        secondaryColor: "#FB7185",
      });

      expect(css).toContain(`--accent-bronze: #E11D48`);
      expect(css).toContain(`--accent-bronze-light: #FB7185`);
      expect(css).toContain(`--accent-primary: #E11D48`);
      expect(css).toContain(`--radius-btn: 6px`);
      expect(css).toContain(`--radius-card: 6px`);
    });
  });

  describe("RBAC Permissions Verification", () => {
    it("allows STAFF and MANAGER to view appearance", () => {
      expect(hasPermission("STAFF", "VIEW_APPEARANCE")).toBe(true);
      expect(hasPermission("MANAGER", "VIEW_APPEARANCE")).toBe(true);
      expect(hasPermission("OWNER", "VIEW_APPEARANCE")).toBe(true);
      expect(hasPermission("SUPERADMIN", "VIEW_APPEARANCE")).toBe(true);
      expect(hasPermission("CUSTOMER", "VIEW_APPEARANCE")).toBe(false);
    });

    it("restricts theme management and publishing to OWNER and SUPERADMIN only", () => {
      expect(hasPermission("STAFF", "MANAGE_APPEARANCE")).toBe(false);
      expect(hasPermission("MANAGER", "MANAGE_APPEARANCE")).toBe(false);
      expect(hasPermission("CUSTOMER", "MANAGE_APPEARANCE")).toBe(false);
      expect(hasPermission("OWNER", "MANAGE_APPEARANCE")).toBe(true);
      expect(hasPermission("SUPERADMIN", "MANAGE_APPEARANCE")).toBe(true);
    });
  });
});
