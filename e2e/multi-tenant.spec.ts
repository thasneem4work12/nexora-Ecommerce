import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots";

test.describe("NEXORA Commerce — Phase 7 Multi-Tenant SaaS & Store Isolation E2E", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Multi-Tenant Public Storefronts & Theming", async ({ page }) => {
    test.setTimeout(90000);

    // 1. Visit Nexora Luxury Atelier (Default Store)
    await page.goto("/store/nexora", { waitUntil: "networkidle" });
    await expect(page.getByText(/NEXORA/i).first()).toBeVisible({ timeout: 15000 });

    // 2. Visit Lumina Audio & Tech (/store/lumina-tech)
    await page.goto("/store/lumina-tech", { waitUntil: "networkidle" });
    await expect(page.getByText(/Lumina Audio/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Studio Reference Acoustics/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "37-store-lumina-tech-homepage.png") });

    // Check Lumina Products catalog
    await page.goto("/store/lumina-tech/products", { waitUntil: "networkidle" });
    await expect(page.getByText(/Acoustic Pro Studio Headphones/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Master Reference DAC/i).first()).toBeVisible();
    // Ensure Nexora apparel does NOT appear in Lumina's catalog
    await expect(page.getByText(/Bespoke Vicuna Overcoat/i)).not.toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "39-store-lumina-tech-catalog.png") });

    // 3. Visit Apex Kicks & Streetwear (/store/apex-kicks)
    await page.goto("/store/apex-kicks", { waitUntil: "networkidle" });
    await expect(page.getByText(/APEX KICKS/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/High-Velocity Streetwear/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "38-store-apex-kicks-homepage.png") });

    // Check Apex Products catalog
    await page.goto("/store/apex-kicks/products", { waitUntil: "networkidle" });
    await expect(page.getByText(/Apex Quantum High-Top Sneaker/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Hyper Velocity Carbon Runner/i).first()).toBeVisible();
    // Ensure Lumina headphones do NOT appear in Apex catalog
    await expect(page.getByText(/Acoustic Pro Studio Headphones/i)).not.toBeVisible();
  });

  test("2. Client-Side Cart Partitioning Between Stores", async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to Lumina product details
    await page.goto("/store/lumina-tech/products/acoustic-pro-headphones", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Acoustic Pro Studio Headphones/i })).toBeVisible({ timeout: 15000 });

    // Add to cart in Lumina store
    const addToBagBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
    if (await addToBagBtn.isVisible()) {
      await addToBagBtn.click();
      await page.waitForTimeout(600);
    }

    // Verify item is present in Lumina cart drawer / page
    await page.goto("/store/lumina-tech/cart", { waitUntil: "networkidle" });
    await expect(page.getByText(/Acoustic Pro Studio Headphones/i).first()).toBeVisible({ timeout: 15000 });

    // Switch to Apex Kicks store -> Cart MUST BE EMPTY
    await page.goto("/store/apex-kicks/cart", { waitUntil: "networkidle" });
    await expect(page.getByText(/Your shopping bag is empty/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Acoustic Pro Studio Headphones/i)).not.toBeVisible();
  });

  test("3. Admin Multi-Tenant Switching, Businesses Directory & Members", async ({ page }) => {
    test.setTimeout(120000);

    // 1. Authenticate as Store Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // 2. Navigate to Admin Dashboard
    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Dashboard Overview/i })).toBeVisible({ timeout: 15000 });

    // 3. Open Business Switcher dropdown
    const switcherTrigger = page.getByTestId("business-switcher-trigger");
    await expect(switcherTrigger).toBeVisible({ timeout: 10000 });
    await switcherTrigger.click();
    await page.waitForTimeout(400);

    // Verify all 3 stores are rendered in the switcher
    await expect(page.getByRole("button", { name: /Lumina Audio & Tech/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Apex Kicks & Streetwear/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "40-admin-business-switcher-dropdown.png") });

    // 4. Switch to Lumina Audio & Tech
    const luminaOption = page.getByRole("button", { name: /Lumina Audio & Tech/i });
    await luminaOption.click();
    await page.waitForTimeout(1000);

    // 5. Navigate to Stores & Businesses directory via sidebar
    await page.getByRole("link", { name: /Stores & Businesses/i }).click();
    await expect(page.getByRole("heading", { name: /Storefronts & Businesses/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Lumina Audio & Tech/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Apex Kicks & Streetwear/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "41-admin-businesses-directory.png") });

    // 6. Navigate to Team & Permissions via sidebar
    await page.getByRole("link", { name: /Team & Permissions/i }).click();
    await expect(page.getByRole("heading", { name: /Team & Permissions/i })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "42-admin-team-members.png") });
  });

  test("4. Onboard a new business via /admin/businesses/new", async ({ page }) => {
    test.setTimeout(120000);

    // 1. Authenticate as Store Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // 2. Navigate to /admin/businesses/new
    await page.goto("/admin/businesses/new", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Launch a New Storefront/i })).toBeVisible({ timeout: 15000 });

    // 3. Fill onboarding form
    const uniqueSlug = `aether-horology-${Date.now()}`;
    await page.locator('input[id="name"]').fill("Aether Horology");
    await page.locator('input[id="slug"]').fill(uniqueSlug);
    await page.locator('input[id="contactEmail"]').fill("concierge@aetherhorology.com");

    // Select Midnight Noir theme
    const midnightNoirThemeCard = page.getByText("Midnight Noir", { exact: false });
    await midnightNoirThemeCard.click();

    // Submit form
    await page.getByRole("button", { name: /Launch Storefront/i }).click();

    // Verify redirected to /admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
    await page.waitForLoadState("networkidle");

    // Verify active business switcher shows the new business
    await expect(page.getByTestId("business-switcher-trigger")).toContainText("Aether Horology");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "43-admin-new-store-onboarded.png") });
  });
});
