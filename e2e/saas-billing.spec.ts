import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots";

test.describe("NEXORA Commerce — Phase 8 SaaS Subscription Billing & Superadmin E2E", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Public SaaS Pricing Page & Billing Toggle", async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to public pricing page
    await page.goto("/pricing", { waitUntil: "networkidle" });

    // Verify main heading and badge
    await expect(
      page.getByRole("heading", { name: /Architectural Commerce for Modern Ateliers/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/NEXORA SaaS Platform Billing/i)).toBeVisible();

    // Verify tier cards
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Growth" })).toBeVisible();

    // Verify monthly pricing numbers
    await expect(page.getByText("$29")).toBeVisible();
    await expect(page.getByText("$79")).toBeVisible();

    // Toggle to Annual billing
    const annualButton = page.getByRole("button", { name: /Annual Billing/i });
    await annualButton.click();
    await page.waitForTimeout(400);

    // Verify annual prices ($290, $790)
    await expect(page.getByText("$290")).toBeVisible();
    await expect(page.getByText("$790")).toBeVisible();

    // Switch back to Monthly for clean default screenshot
    const monthlyButton = page.getByRole("button", { name: /Monthly Billing/i });
    await monthlyButton.click();
    await page.waitForTimeout(400);

    // Verify Feature Comparison Table
    await expect(page.getByRole("heading", { name: /Compare Platform Capabilities/i })).toBeVisible();
    await expect(page.getByText("Active Catalog Products")).toBeVisible();

    // Capture Public Pricing Page Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "44-saas-pricing-page.png"),
      fullPage: true,
    });
  });

  test("2. Store Owner Billing Dashboard & Invoice Receipt Modal", async ({ page }) => {
    test.setTimeout(90000);

    // Log in as bootstrapped store owner
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    // Wait for account redirection
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Admin Billing
    await page.goto("/admin/billing", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/.*admin\/billing/);

    // Verify Billing Dashboard Header & Active Subscription
    await expect(
      page.getByRole("heading", { name: /Subscription & Billing/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Active Plan")).toBeVisible();

    // Verify Usage Quota Meters
    await expect(page.getByRole("heading", { name: /Capacity & Usage Meters/i })).toBeVisible();
    await expect(page.getByText("Products").first()).toBeVisible();
    await expect(page.getByText("Team Staff").first()).toBeVisible();

    // Verify Invoices Table
    await expect(
      page.getByRole("heading", { name: /Billing Invoices & Receipts/i })
    ).toBeVisible();
    const invoiceRows = page.locator("table tbody tr");
    await expect(invoiceRows.first()).toBeVisible();

    // Capture Admin Billing Dashboard Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "45-admin-billing-dashboard.png"),
      fullPage: false,
    });

    // Open Printable Invoice Receipt Modal
    const viewReceiptBtn = page.getByRole("button", { name: /View Receipt/i }).first();
    await expect(viewReceiptBtn).toBeVisible();
    await viewReceiptBtn.click();
    await page.waitForTimeout(600);

    // Verify Receipt Modal Content
    await expect(page.getByText(/Official SaaS Receipt/i)).toBeVisible();
    await expect(page.getByText(/Total Amount Paid/i)).toBeVisible();

    // Capture Receipt Modal Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "46-admin-billing-receipt-modal.png"),
      fullPage: false,
    });

    // Close Receipt Modal
    const closeBtn = page.locator("div.fixed.inset-0 button").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test("3. Platform Superadmin Executive Dashboard", async ({ page }) => {
    test.setTimeout(90000);

    // Log in as platform superadmin
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("superadmin@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraSuperadmin2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    // Wait for account redirection
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Platform Superadmin Overview
    await page.goto("/platform", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/.*platform$/);

    // Verify Platform Executive Overview Cards
    await expect(
      page.getByRole("heading", { name: /Platform Control Center/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Monthly Recurring Revenue")).toBeVisible();
    await expect(page.getByText(/ARR Run Rate/i)).toBeVisible();
    await expect(page.getByText("Active Businesses")).toBeVisible();
    await expect(page.getByText("Suspended Tenants")).toBeVisible();

    // Verify Sections
    await expect(
      page.getByRole("heading", { name: /Subscriptions by Lifecycle Status/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Subscriber Distribution by Plan/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Recent SaaS Invoices/i })
    ).toBeVisible();

    // Capture Platform Superadmin Overview Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "47-platform-superadmin-overview.png"),
      fullPage: true,
    });
  });

  test("4. Platform Businesses Management & Suspension Workflow", async ({ page }) => {
    test.setTimeout(90000);

    // Log in as platform superadmin
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("superadmin@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraSuperadmin2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Platform Businesses
    await page.goto("/platform/businesses", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/.*platform\/businesses/);

    // Verify directory elements
    await expect(
      page.getByRole("heading", { name: /Tenants & Businesses/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder(/Search by store name or slug/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "ALL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ACTIVE" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SUSPENDED" })).toBeVisible();

    // Verify at least one business row is rendered
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();

    // Capture Platform Businesses Directory Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "48-platform-businesses-directory.png"),
      fullPage: false,
    });

    // Test Suspension Workflow on a non-default business row with a Suspend button
    const suspendBtn = page.locator('[data-testid="suspend-btn"]').first();
    if (await suspendBtn.isVisible()) {
      await suspendBtn.click();
      await page.waitForTimeout(400);

      // Verify modal opened
      await expect(page.locator('[data-testid="suspend-modal"]')).toBeVisible();
      await page.locator("textarea").fill("Administrative audit hold");
      await page.locator('[data-testid="confirm-suspend-btn"]').click();
      await page.waitForTimeout(800);

      // Verify a Reactivate button appears
      const reactivateBtn = page.locator('[data-testid="reactivate-btn"]').first();
      await expect(reactivateBtn).toBeVisible();

      // Reactivate to restore pristine state
      await reactivateBtn.click();
      await page.waitForTimeout(800);
      await expect(page.locator('[data-testid="suspend-btn"]').first()).toBeVisible();
    }
  });

  test("5. Platform Plans & Quota Management", async ({ page }) => {
    test.setTimeout(90000);

    // Log in as platform superadmin
    await page.goto("/login");
    await page.locator('input[id="email"]').fill("superadmin@nexoracommerce.com");
    await page.locator('input[id="password"]').fill("NexoraSuperadmin2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();
    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Platform Plans
    await page.goto("/platform/plans", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/.*platform\/plans/);

    // Verify Plans Management elements
    await expect(
      page.getByRole("heading", { name: /SaaS Plans & Pricing/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /New Custom Plan/i })).toBeVisible();

    // Verify all seeded plans are rendered in the table
    await expect(page.getByText("Starter", { exact: true })).toBeVisible();
    await expect(page.getByText("Growth", { exact: true })).toBeVisible();

    // Verify table columns
    await expect(page.getByRole("columnheader", { name: "Products Limit" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Staff Limit" })).toBeVisible();

    // Capture Platform Plans Management Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "49-platform-plans-management.png"),
      fullPage: true,
    });
  });
});
