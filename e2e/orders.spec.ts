import { test, expect } from "@playwright/test";

test.describe("NEXORA Commerce — Phase 4 Checkout, Payments & Order Fulfillment E2E Suite", () => {
  let createdOrderNumber: string;

  test("registered client completes full checkout, views order confirmation, and checks personal order history", async ({
    page,
  }) => {
    // 1. Register a dedicated client account
    const timestamp = Date.now();
    const customerEmail = `shopper_${timestamp}@nexoratest.com`;
    const password = "LuxuryCustomer123!";

    await page.goto("/register");
    await page.locator('input[id="name"]').fill("Lady Eleanor Vance");
    await page.locator('input[id="email"]').fill(customerEmail);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('input[id="confirmPassword"]').fill(password);
    await page.getByRole("button", { name: /Create Profile/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });

    // 2. Browse catalog and select a luxury creation
    await page.goto("/products");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });

    // Click on the first product card
    await page.locator("article a").first().click();
    await expect(page).toHaveURL(/.*products\/.+/);

    // 3. Select variant and add to bag
    const acquireBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
    await expect(acquireBtn).toBeVisible();
    await acquireBtn.click();

    // 4. Cart drawer opens, click Proceed to Checkout
    const checkoutLink = page.getByRole("link", { name: /Proceed to Checkout/i });
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    await expect(page).toHaveURL(/.*checkout/);
    await expect(page.getByRole("heading", { name: /Atelier Client Checkout/i })).toBeVisible();

    // 5. Fill in shipping information
    await page.locator('input[id="addressLine1"]').fill("14 Heritage Boulevard");
    await page.locator('input[id="city"]').fill("Colombo");
    await page.locator('input[id="postalCode"]').fill("00700");

    // 6. Submit order
    const submitBtn = page.getByRole("button", { name: /Complete Order/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 7. Verify redirection to /checkout/success
    await expect(page).toHaveURL(/.*checkout\/success.*order_id=/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Commission Confirmed|Order Placed/i })
    ).toBeVisible();

    // Capture the generated order reference
    const orderRefElement = page.locator("text=/NXR-\\d{4}-[A-Z0-9]{6}/");
    await expect(orderRefElement).toBeVisible();
    createdOrderNumber = (await orderRefElement.innerText()).trim();
    expect(createdOrderNumber).toMatch(/^NXR-\d{4}-[A-Z0-9]{6}$/);

    // Verify item snapshots and financial totals are visible
    await expect(page.getByText(/Purchased Creations/i)).toBeVisible();
    await expect(page.getByText(/Total Settled/i)).toBeVisible();

    // 8. Navigate to Customer Order History (/account/orders)
    await page.goto("/account/orders");
    await expect(
      page.getByRole("heading", { name: /Your Atelier Commissions/i })
    ).toBeVisible();

    // Verify newly placed commission is listed
    await expect(page.getByText(createdOrderNumber)).toBeVisible({ timeout: 10000 });

    // 9. Navigate to Order Detail view (/account/orders/[id])
    await page.getByRole("link", { name: /Details/i }).first().click();
    await expect(page).toHaveURL(/.*account\/orders\/.+/, { timeout: 15000 });
    await expect(page.getByText(createdOrderNumber)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Commission Record/i)).toBeVisible({ timeout: 15000 });
  });

  test("store director logs in to /admin/orders, filters orders, and updates shipment tracking", async ({
    page,
  }) => {
    // 1. Clear session cookies to perform fresh director login
    await page.context().clearCookies();

    // 2. Log in as Store Director (Owner)
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });

    // 3. Access Admin Orders
    await page.goto("/admin/orders");
    await expect(
      page.getByRole("heading", { name: /Orders & Client Commissions/i })
    ).toBeVisible();

    // Verify metrics row
    await expect(page.getByText(/Gross Revenue/i)).toBeVisible();
    await expect(page.getByText("Total Orders", { exact: true })).toBeVisible();

    // 4. Click Manage on the first order
    const manageBtn = page.getByRole("link", { name: /Manage/i }).first();
    await expect(manageBtn).toBeVisible({ timeout: 10000 });
    await manageBtn.click();

    await expect(page).toHaveURL(/.*admin\/orders\/.+/, { timeout: 15000 });
    await expect(page.getByText(/Immutable Purchased Line Items/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Stock Reservation Records/i)).toBeVisible({ timeout: 15000 });

    // 5. Fill in tracking number and mark as dispatched
    const trackingInput = page.locator('input[placeholder*="DHL-"]');
    await trackingInput.fill("DHL-E2E-998877");
    await page.getByRole("button", { name: /Save Tracking & Mark Shipped/i }).click();

    // Verify shipment was successfully recorded
    await expect(page.getByText(/Shipment recorded: DHL-E2E-998877/i)).toBeVisible({ timeout: 10000 });
  });
});
