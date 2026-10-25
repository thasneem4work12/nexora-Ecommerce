import { test, expect } from "@playwright/test";

test.describe("NEXORA Storefront & Authentication E2E Suite", () => {
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

  test("can navigate to catalog, filter by category, and view product details", async ({ page }) => {
    await page.goto("/products");

    // Check catalog header
    await expect(page.getByRole("heading", { name: /Curated Creations/i })).toBeVisible();

    // Filter by Footwear
    const footwearBtn = page.getByRole("button", { name: /Footwear/i });
    await footwearBtn.click();
    await expect(page.getByRole("heading", { name: /Oxfords/i })).toBeVisible();

    // Reset filter to All Works
    const allWorksBtn = page.getByRole("button", { name: /All Works/i });
    await allWorksBtn.click();

    // Click on Cashmere Trench to navigate to details
    const trench = page.getByRole("heading", { name: /Double-Breasted Cashmere Trench/i });
    await trench.click();
    await expect(page).toHaveURL(/.*double-breasted-cashmere-trench/);
    await expect(page.getByRole("button", { name: /Add to Shopping Bag/i })).toBeVisible();
  });

  test("variant selection, cart drawer interactions, and checkout demo", async ({ page }) => {
    await page.goto("/products/double-breasted-cashmere-trench");

    // Select Medium variant
    const mediumVariantBtn = page.getByRole("button", { name: /Camel \/ Medium/i });
    await mediumVariantBtn.click();

    // Add to cart
    const addToCartBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
    await addToCartBtn.click();

    // Verify cart drawer is opened with item
    await expect(page.getByRole("heading", { name: /Shopping Bag \(1\)/i })).toBeVisible();
    await expect(page.getByText(/Camel \/ Medium/i).first()).toBeVisible();
    await expect(page.getByText(/\$1,450\.00/).first()).toBeVisible();

    // Increase quantity to 2
    const increaseBtn = page.getByRole("button", { name: /Increase quantity/i });
    await increaseBtn.click();
    await expect(page.getByRole("heading", { name: /Shopping Bag \(2\)/i })).toBeVisible();

    // Navigate to checkout
    const checkoutLink = page.getByRole("link", { name: /Proceed to Checkout/i });
    await checkoutLink.click();
    await expect(page).toHaveURL(/.*checkout/);

    // Verify checkout demo notice is clearly displayed
    await expect(
      page.getByText(/Phase 1 Development Mode: Orders are verified and registered in staging mode/i)
    ).toBeVisible();
  });

  test("customer registration, session persistence on refresh, and logout flow", async ({ page }) => {
    const uniqueEmail = `e2e_client_${Date.now()}@nexoratest.com`;
    const password = "E2eLuxuryPassword123!";

    await page.goto("/register");

    // Fill registration form
    await page.locator('input[id="name"]').fill("Sir Alistair Finch");
    await page.locator('input[id="email"]').fill(uniqueEmail);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('input[id="confirmPassword"]').fill(password);

    // Submit registration
    await page.getByRole("button", { name: /Create Profile/i }).click();

    // Verify redirection to /account
    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Welcome, Sir Alistair Finch/i })).toBeVisible();
    await expect(page.getByText(/CUSTOMER/i)).toBeVisible();

    // Task 3.5: Verify session survives page refresh
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome, Sir Alistair Finch/i })).toBeVisible();

    // Task 3.6: Sign out
    const signOutBtn = page.getByRole("button", { name: /Sign Out/i });
    await signOutBtn.click();

    // Verify redirection to home
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/?$/);

    // Task 3.7: Access /account signed out -> protected prompt shown
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /Private Area Protected/i })).toBeVisible();
  });

  test("mobile responsive viewport verification", async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Verify mobile hamburger menu button
    const menuBtn = page.getByRole("button", { name: /Toggle Navigation/i });
    await expect(menuBtn).toBeVisible();

    // Open mobile menu
    await menuBtn.click();
    await expect(page.getByRole("link", { name: "Catalog", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign In \/ Register/i })).toBeVisible();

    // Close mobile menu
    await menuBtn.click();
  });
});
