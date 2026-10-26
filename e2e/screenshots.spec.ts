import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots";

test.describe("Phase 2 Visual Verification Screenshots", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test("capture all verification screenshots", async ({ browser }) => {
    test.setTimeout(360000);

    // 1. Desktop context
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await desktopContext.newPage();

    // 01: Homepage desktop
    await page.goto("/", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-homepage-desktop.png") });

    // 02: Product Catalog desktop
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-catalog-desktop.png") });

    // 02b: Product Catalog with Footwear Category & Search
    const footwearBtn = page.getByRole("button", { name: /Footwear/i });
    await footwearBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02b-catalog-filtered-desktop.png") });

    // 03: Product Details with Variant Selection
    await page.goto("/products/double-breasted-cashmere-trench", { waitUntil: "networkidle" });
    const mediumVariantBtn = page.getByRole("button", { name: /Camel \/ Medium/i });
    await mediumVariantBtn.click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-product-details-desktop.png") });

    // 04: Cart Drawer desktop
    const addToCartBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
    await addToCartBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-cart-drawer-desktop.png") });

    // 05: Checkout Demo desktop
    await page.goto("/checkout", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-checkout-demo-desktop.png") });

    // 06: Register page desktop
    await page.goto("/register", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-register-desktop.png") });

    // 07: Login page desktop
    await desktopContext.clearCookies();
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-login-desktop.png") });

    // Authenticate as Owner for Phase 3 Admin Screenshots
    await page.locator('input[id="email"]').fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // 10: Admin Dashboard Overview
    await page.goto("/admin", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-admin-dashboard-overview.png") });

    // 11: Admin Products List
    await page.goto("/admin/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11-admin-products-list.png") });

    // 12: Admin Product Editor / Creation
    await page.goto("/admin/products/new", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "12-admin-product-editor.png") });

    // 13: Admin Inventory Stock Control
    await page.goto("/admin/inventory", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13-admin-inventory-stock.png") });

    // 14: Admin Inventory Audit Ledger
    await page.goto("/admin/inventory/movements", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "14-admin-inventory-audit-ledger.png") });

    // 15: Admin Orders Overview
    await page.goto("/admin/orders", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "15-admin-orders-list.png") });

    // 16: Admin Order Detail (if any order exists)
    let sampleOrderId = "";
    const firstOrderLink = page.locator('a[href^="/admin/orders/"]').first();
    if (await firstOrderLink.isVisible()) {
      const href = await firstOrderLink.getAttribute("href");
      if (href) {
        sampleOrderId = href.replace("/admin/orders/", "");
      }
      await firstOrderLink.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "16-admin-order-detail.png") });
    }

    // 17: Client Account Orders
    await page.goto("/account/orders", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "17-account-orders-history.png") });

    // 18: Admin Customers & Patrons Directory
    await page.goto("/admin/customers", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "18-admin-customers-list.png") });

    // 19: Admin Patron Dossier
    const firstCustomerLink = page.locator('a[href^="/admin/customers/"]').first();
    if (await firstCustomerLink.isVisible()) {
      await firstCustomerLink.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "19-admin-customer-dossier.png") });
    }

    // 20: Admin Concierge & Support Desk
    await page.goto("/admin/support", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "20-admin-support-desk.png") });

    // 21: Client Account Order Detail & Delivery Timeline
    if (sampleOrderId) {
      await page.goto(`/account/orders/${sampleOrderId}`, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "21-account-order-timeline.png") });
    }

    // 22: Client Concierge & Support Desk
    await page.goto("/account/support", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "22-account-support-tickets.png") });

    // 23: Theme 1 Editorial Luxury (Default)
    await page.goto("/?previewTheme=editorial-luxury", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "23-theme-editorial-luxury-homepage.png") });

    // 24: Theme 1 Catalog
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "24-theme-editorial-luxury-catalog.png") });

    // 25: Theme 2 Midnight Noir Homepage
    await page.goto("/?previewTheme=midnight-noir", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "25-theme-midnight-noir-homepage.png") });

    // 26: Theme 2 Midnight Noir Catalog
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "26-theme-midnight-noir-catalog.png") });

    // 27: Theme 3 Modern Minimal Homepage
    await page.goto("/?previewTheme=modern-minimal", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "27-theme-modern-minimal-homepage.png") });

    // 28: Theme 3 Modern Minimal Catalog
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "28-theme-modern-minimal-catalog.png") });

    // 29: Theme 4 Orange Energy Homepage
    await page.goto("/?previewTheme=orange-energy", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "29-theme-orange-energy-homepage.png") });

    // 30: Theme 4 Orange Energy Catalog
    await page.goto("/products", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "30-theme-orange-energy-catalog.png") });

    // 31: Admin Appearance Studio — Themes Grid
    await page.goto("/admin/appearance", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "31-admin-appearance-themes-grid.png") });

    // 32: Admin Appearance Studio — Branding Tab
    const brandingTab = page.getByRole("button", { name: /Branding & Palette/i });
    if (await brandingTab.isVisible()) {
      await brandingTab.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "32-admin-appearance-branding-studio.png") });
    }

    // 33: Admin Appearance Studio — Homepage Sections Tab
    const homepageTab = page.getByRole("button", { name: /Homepage Sections/i });
    if (await homepageTab.isVisible()) {
      await homepageTab.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "33-admin-appearance-homepage-sections.png") });
    }

    // 34: Admin Appearance Studio — Live Responsive Preview Tab
    const previewTab = page.getByRole("button", { name: /Live Responsive Preview/i });
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "34-admin-appearance-responsive-preview.png") });
    }

    await desktopContext.close();

    // 2. Mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobileContext.newPage();

    // 08: Homepage mobile
    await mobilePage.goto("/", { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "08-homepage-mobile.png") });

    // 09: Mobile Navigation Drawer
    const menuBtn = mobilePage.getByRole("button", { name: /Toggle Navigation/i });
    await menuBtn.click();
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "09-mobile-nav-drawer.png") });

    // 35: Midnight Noir Mobile
    await mobilePage.goto("/?previewTheme=midnight-noir", { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "35-theme-midnight-noir-mobile.png") });

    // 36: Orange Energy Mobile
    await mobilePage.goto("/?previewTheme=orange-energy", { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "36-theme-orange-energy-mobile.png") });

    await mobileContext.close();
  });
});
