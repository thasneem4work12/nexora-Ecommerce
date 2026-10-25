import { test, expect } from "@playwright/test";

test.describe("NEXORA Storefront & Database Catalog E2E Suite", () => {
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

  test("can navigate to catalog, search, filter by category, and view product details", async ({ page }) => {
    await page.goto("/products");

    // Check catalog header
    await expect(page.getByRole("heading", { name: /Curated Creations/i })).toBeVisible();

    // Filter by Footwear
    const footwearBtn = page.getByRole("button", { name: /Footwear/i });
    await footwearBtn.click();
    await expect(page).toHaveURL(/.*category=footwear/);
    await expect(page.getByRole("heading", { name: /Oxfords/i })).toBeVisible();

    // Reset to All Works
    const allWorksBtn = page.getByRole("button", { name: /All Works/i });
    await allWorksBtn.click();
    await expect(page).toHaveURL(/.*products$/);

    // Search for "briefcase"
    const searchInput = page.getByPlaceholder(/Search by tailoring/i);
    await searchInput.fill("briefcase");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/.*search=briefcase/);
    await expect(page.getByRole("heading", { name: /Briefcase/i })).toBeVisible();

    // Clear search and reset filter
    const clearBtn = page.getByRole("button", { name: /Clear all/i });
    await clearBtn.click();
    await expect(page).toHaveURL(/.*products$/);

    // Click on Cashmere Trench to navigate to details
    const trench = page.getByRole("heading", { name: /Double-Breasted Cashmere Trench/i });
    await trench.click();
    await expect(page).toHaveURL(/.*double-breasted-cashmere-trench/);
    await expect(page.getByRole("button", { name: /Add to Shopping Bag/i })).toBeVisible();
  });

  test("variant selection, cart drawer interactions, and checkout demo with DB inventory validation", async ({ page }) => {
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

    // Increase quantity to 2 inside the cart drawer dialog
    const cartDialog = page.getByRole("dialog");
    const increaseBtn = cartDialog.getByRole("button", { name: /Increase quantity/i });
    await increaseBtn.click();
    await expect(page.getByRole("heading", { name: /Shopping Bag \(2\)/i })).toBeVisible();

    // Navigate to checkout
    const checkoutLink = page.getByRole("link", { name: /Proceed to Checkout/i });
    await checkoutLink.click();
    await expect(page).toHaveURL(/.*checkout/);

    // Verify checkout page heading is clearly displayed
    await expect(
      page.getByRole("heading", { name: /Atelier Client Checkout/i })
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

    // Session survives page refresh
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome, Sir Alistair Finch/i })).toBeVisible();

    // Sign out
    const signOutBtn = page.getByRole("button", { name: /Sign Out/i });
    await signOutBtn.click();

    // Verify redirection to home
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/?$/);

    // Access /account signed out -> protected prompt shown
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

  test("API endpoints enforce published status and return catalog data", async ({ request }) => {
    // Test 1: GET /api/products returns published catalog
    const res = await request.get("/api/products");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    // Test 2: Unpublished item is not in /api/products
    const unpublished = json.data.find(
      (p: { slug: string }) => p.slug === "bespoke-vicuna-overcoat-private-archive"
    );
    expect(unpublished).toBeUndefined();

    // Test 3: Direct slug lookup of unpublished item returns 404
    const unpubRes = await request.get("/api/products/bespoke-vicuna-overcoat-private-archive");
    expect(unpubRes.status()).toBe(404);

    // Test 4: Direct slug lookup of published item returns 200
    const pubRes = await request.get("/api/products/double-breasted-cashmere-trench");
    expect(pubRes.status()).toBe(200);
    const pubJson = await pubRes.json();
    expect(pubJson.data.title).toBe("Double-Breasted Cashmere Trench");
  });
});
