import { test, expect } from "@playwright/test";

test.describe("NEXORA Storefront E2E Suite", () => {
  test("homepage renders luxury brand, announcement bar, and hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NEXORA Haute Couture/i);

    // Verify brand logo
    const brand = page.getByRole("link", { name: /NEXORA/i }).first();
    await expect(brand).toBeVisible();

    // Verify announcement bar
    await expect(
      page.getByText(/Complimentary Worldwide Delivery/i)
    ).toBeVisible();

    // Verify hero call to action
    const exploreBtn = page.getByRole("button", { name: /explore collection/i });
    await expect(exploreBtn).toBeVisible();
  });

  test("can navigate to catalog and view product details", async ({ page }) => {
    await page.goto("/products");

    // Check catalog header
    await expect(page.getByRole("heading", { name: /Curated Creations/i })).toBeVisible();

    // Check at least one product card is rendered
    const firstProduct = page.getByRole("heading", { name: /Double-Breasted Cashmere Trench/i });
    await expect(firstProduct).toBeVisible();

    // Click on product to navigate to details
    await firstProduct.click();
    await expect(page).toHaveURL(/.*double-breasted-cashmere-trench/);
    await expect(page.getByRole("button", { name: /Add to Shopping Bag/i })).toBeVisible();
  });
});
