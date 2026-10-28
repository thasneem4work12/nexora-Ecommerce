import { test, expect } from "@playwright/test";
import { clearAuthCookies, createPilotContext } from "./helpers";

test.describe("NEXORA Commerce — Phase 6 Theme Engine & Appearance Studio E2E Suite", () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies between tests
    await clearAuthCookies(context);
  });

  test("1. Enforces strict access control on /admin/appearance", async ({ page }) => {
    // Unauthenticated user should be redirected to login
    await page.goto("/admin/appearance");
    await expect(page).toHaveURL(/.*login.*callbackUrl=.*/, { timeout: 15000 });

    // Customer login should be forbidden or redirected away from administrative layouts
    const timestamp = Date.now();
    const custEmail = `cust_theme_${timestamp}@nexora-test.luxury`;
    const custPass = "CustSecret2026!";

    await page.goto("/register");
    await page.locator('input[id="name"]').fill("Lady Sophia Windsor");
    await page.locator('input[id="email"]').fill(custEmail);
    await page.locator('input[id="password"]').fill(custPass);
    await page.locator('input[id="confirmPassword"]').fill(custPass);
    await page.getByRole("button", { name: /Create Profile/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Customer attempts to open /admin/appearance directly
    await page.goto("/admin/appearance");
    await expect(page).not.toHaveURL(/\/admin\/appearance$/);
  });

  test("2. Store Owner logs into Appearance Studio and browses the 4 themes", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Theme & Appearance Studio
    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { name: /Storefront Theme & Branding Studio/i })
    ).toBeVisible({ timeout: 15000 });

    // Verify all 4 themes are rendered
    await expect(page.getByText("Editorial Luxury", { exact: false })).toBeVisible();
    await expect(page.getByText("Midnight Noir", { exact: false })).toBeVisible();
    await expect(page.getByText("Modern Minimal", { exact: false })).toBeVisible();
    await expect(page.getByText("Orange Energy", { exact: false })).toBeVisible();

    // Verify Live badge is visible on current theme
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
  });

  test("3. Draft vs Published Isolation: modifying draft does NOT alter public storefront", async ({
    page,
    browser,
  }) => {
    // 1. Owner logs in
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { name: /Storefront Theme & Branding Studio/i })
    ).toBeVisible({ timeout: 15000 });

    // 2. Select Branding tab and modify store tagline
    await page.getByRole("button", { name: /Branding & Palette/i }).click();
    const taglineInput = page.locator('input[placeholder*="Haute Couture"]');
    await taglineInput.fill("UNPUBLISHED DRAFT TAGLINE 2026");

    // 3. Save draft
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(
      page.getByText(/Draft saved\. Changes are ready for preview/i)
    ).toBeVisible({ timeout: 10000 });

    // 4. Open an incognito/public browser context (unauthenticated public customer)
    const publicContext = await createPilotContext(browser);
    const publicPage = await publicContext.newPage();
    await publicPage.goto("/");

    // Public visitor should NOT see the draft tagline
    await expect(publicPage.getByText("UNPUBLISHED DRAFT TAGLINE 2026")).toHaveCount(0);

    await publicContext.close();

    // 5. Discard draft to leave system clean
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Discard Draft/i }).click();
    await expect(
      page.getByText(/Unpublished draft discarded/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("4. Theme Preview in studio iframe and full window", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { name: /Storefront Theme & Branding Studio/i })
    ).toBeVisible({ timeout: 15000 });

    // Switch to Live Responsive Preview tab
    await page.getByRole("button", { name: /Live Responsive Preview/i }).click();

    // Verify preview frame is rendered
    const previewFrame = page.locator('iframe[title="Storefront Live Preview"]');
    await expect(previewFrame).toBeVisible({ timeout: 10000 });

    // Test viewport switcher (Tablet & Mobile)
    await page.getByRole("button", { name: /Tablet/i }).click();
    await page.getByRole("button", { name: /Mobile/i }).click();
    await page.getByRole("button", { name: /Desktop/i }).click();
  });

  test("5. Publish theme and restore safe default Editorial Luxury", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { name: /Storefront Theme & Branding Studio/i })
    ).toBeVisible({ timeout: 15000 });

    // Select Midnight Noir theme in Themes tab
    await page.getByRole("button", { name: /Theme Presets/i }).click();
    const noirCard = page.getByTestId("theme-card-midnight-noir");
    await noirCard.getByRole("button", { name: /Select Theme for Draft|Selected in Studio/i }).click();

    // Publish theme
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Publish to Storefront/i }).click();
    await expect(
      page.getByText(/successfully published to the live storefront/i)
    ).toBeVisible({ timeout: 15000 });

    // Visit live storefront -> verify data-theme attribute is midnight-noir
    await page.goto("/");
    const htmlElem = page.locator("html");
    await expect(htmlElem).toHaveAttribute("data-theme", "midnight-noir", { timeout: 10000 });

    // Return to admin and restore safe default
    await page.goto("/admin/appearance");
    await page.getByRole("button", { name: /Restore Safe Defaults/i }).click();
    await expect(
      page.getByText(/restored to Editorial Luxury defaults/i)
    ).toBeVisible({ timeout: 15000 });

    // Verify storefront restored to editorial-luxury
    await page.goto("/");
    await expect(htmlElem).toHaveAttribute("data-theme", "editorial-luxury", { timeout: 10000 });
  });
});
