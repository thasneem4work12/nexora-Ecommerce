import { test, expect } from "@playwright/test";

test.describe("NEXORA Commerce — Phase 3 Admin & Inventory E2E Suite", () => {
  test("unauthenticated visitor is denied access to /admin and redirected to login", async ({
    page,
  }) => {
    // Attempting to visit /admin without a session
    await page.goto("/admin");

    // Server component guard requireAdminPageSession redirects to /login?callbackUrl=/admin
    await expect(page).toHaveURL(/.*login.*callbackUrl=.*admin/);
    await expect(
      page.getByRole("heading", { name: /Client Authentication/i })
    ).toBeVisible();
  });

  test("customer role is denied access to /admin and redirected to customer account", async ({
    page,
  }) => {
    // 1. Register a new standard customer
    const customerEmail = `customer_e2e_${Date.now()}@nexoratest.com`;
    const password = "CustomerPassword123!";

    await page.goto("/register");
    await page.locator('input[id="name"]').fill("Lady Gwendolyn Sterling");
    await page.locator('input[id="email"]').fill(customerEmail);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('input[id="confirmPassword"]').fill(password);
    await page.getByRole("button", { name: /Create Profile/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Welcome, Lady Gwendolyn Sterling/i })
    ).toBeVisible();
    await expect(page.getByText("CUSTOMER", { exact: true })).toBeVisible();

    // 2. Try to directly navigate to /admin
    await page.goto("/admin");

    // Server component guard redirects customer to /account
    await expect(page).toHaveURL(/.*account/);
    await expect(
      page.getByRole("heading", { name: /Welcome, Lady Gwendolyn Sterling/i })
    ).toBeVisible();
  });

  test("store owner logs in, views PostgreSQL dashboard metrics, and navigates admin sections", async ({
    page,
  }) => {
    // 1. Log in with bootstrapped owner credentials
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    // Redirection lands on /account
    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });
    await expect(page.getByText("OWNER", { exact: true })).toBeVisible();

    // Click "Atelier Admin" quick link to access admin dashboard
    const adminLink = page.getByRole("link", { name: /Atelier Admin/i });
    await expect(adminLink).toBeVisible();
    await adminLink.click();

    await expect(page).toHaveURL(/.*admin$/);

    // 2. Verify Dashboard Overview elements
    await expect(
      page.getByRole("heading", { name: /Dashboard Overview/i })
    ).toBeVisible();
    await expect(page.getByText("Active Creations")).toBeVisible();
    await expect(page.getByText("Total SKUs")).toBeVisible();
    await expect(page.getByText("Low Stock")).toBeVisible();
    await expect(page.getByText("Sold Out")).toBeVisible();

    // Verify recent inventory movements table is present
    await expect(
      page.getByRole("heading", { name: /Recent Inventory Adjustments/i })
    ).toBeVisible();

    // 3. Verify Admin Sidebar navigation links
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Creations & Products" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Disciplines & Categories" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Inventory & Stock" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Stock Audit Ledger" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Store Settings" })).toBeVisible();
  });

  test("admin creates a new luxury piece, adjusts inventory stock with audit reason, and verifies on storefront", async ({
    page,
  }) => {
    const uniqueId = Date.now();
    const productTitle = `Cashmere Double-Faced Robe ${uniqueId}`;
    const variantSku = `ROBE-${uniqueId}`;

    // 1. Sign in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 10000 });

    // 2. Navigate to /admin/products/new
    await page.goto("/admin/products/new");
    await expect(
      page.getByRole("heading", { name: /Craft New Atelier Creation/i })
    ).toBeVisible();

    // Fill Product Details
    await page.locator('input[id="title"]').fill(productTitle);
    await page
      .locator('textarea[id="description"]')
      .fill("Handcrafted in Florence from pure combed Mongolian cashmere with silk piping.");
    await page.locator('input[id="basePrice"]').fill("1850");

    // Add Image URL
    const imageInput = page.getByPlaceholder(/Paste external image URL/i);
    await imageInput.fill(
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&auto=format&fit=crop"
    );
    await page.getByRole("button", { name: /Attach URL/i }).click();

    // Fill Initial Variant
    const skuInput = page.getByPlaceholder(/NEX-CT-S/i);
    await skuInput.fill(variantSku);

    const variantTitleInput = page.getByPlaceholder(/Camel \/ Small/i);
    await variantTitleInput.fill("Oatmeal / Regular");

    const colorInput = page.getByPlaceholder("Camel", { exact: true });
    await colorInput.fill("Oatmeal");

    // Submit form via top publish button
    const submitBtn = page.getByRole("button", { name: /Publish Creation/i });
    await submitBtn.click();

    // Verify redirect to /admin/products and presence of created product
    await expect(page).toHaveURL(/.*admin\/products/, { timeout: 15000 });
    await expect(page.getByText(productTitle)).toBeVisible();

    // 3. Navigate to /admin/inventory to adjust stock
    await page.goto("/admin/inventory");
    await expect(
      page.getByRole("heading", { name: /Inventory & Stock Management/i })
    ).toBeVisible();

    // Search for the newly created variant
    const inventorySearch = page.getByPlaceholder(/Search by SKU/i);
    await inventorySearch.fill(variantSku);
    await inventorySearch.press("Enter");

    await expect(page.getByText(variantSku)).toBeVisible();

    // Open Adjust Stock modal
    const adjustBtn = page.getByRole("button", { name: /Adjust Stock/i }).first();
    await adjustBtn.click();

    // Modal is opened
    await expect(page.getByText(/Audited Stock Modification/i)).toBeVisible();

    // Increase stock by clicking +5 button
    const plusFiveBtn = page.getByRole("button", { name: "+5" });
    await plusFiveBtn.click();

    // Enter Audit Reason
    const reasonTextarea = page.getByPlaceholder(
      /Received shipment batch/i
    );
    await reasonTextarea.fill(
      "Direct atelier delivery batch received from Florence workshop"
    );

    // Confirm adjustment
    const confirmBtn = page.getByRole("button", { name: /Confirm & Audit Stock Adjustment/i });
    await confirmBtn.click();

    // Verify modal closes
    await expect(page.getByText(/Audited Stock Modification/i)).not.toBeVisible({
      timeout: 10000,
    });

    // 4. Verify movement is logged in /admin/inventory/movements
    await page.goto("/admin/inventory/movements");
    await expect(
      page.getByRole("heading", { name: /Stock Audit Ledger/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Direct atelier delivery batch received from Florence workshop/i).first()
    ).toBeVisible();

    // 5. Verify the new product is live on customer storefront /products
    await page.goto("/products");
    await expect(page.getByText(productTitle)).toBeVisible();

    // Click on the product card to verify product details page
    await page.getByText(productTitle).click();
    await expect(page).toHaveURL(new RegExp(`.*${productTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.*`));
    await expect(page.getByText(/\$1,850\.00/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add to Shopping Bag/i })
    ).toBeVisible();
  });
});
