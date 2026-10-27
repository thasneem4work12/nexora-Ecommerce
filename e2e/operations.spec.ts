import { test, expect } from "@playwright/test";

test.describe("NEXORA Commerce — Phase 5 Operations, Customer Directory & Support E2E Suite", () => {
  test.describe.configure({ mode: "serial" });

  const timestamp = Date.now();
  const customerEmail = `client_ops_${timestamp}@nexora-test.luxury`;
  const customerPassword = "LuxuryClient2026!";
  let createdTicketSubject = `Inquiry regarding bespoke adjustments ${timestamp}`;

  test("1. Customer registers, opens concierge inquiry, and messages the desk", async ({ page }) => {
    // Register customer
    await page.goto("/register");
    await page.locator('input[id="name"]').fill("Lady Camille de Guise");
    await page.locator('input[id="email"]').fill(customerEmail);
    await page.locator('input[id="password"]').fill(customerPassword);
    await page.locator('input[id="confirmPassword"]').fill(customerPassword);
    await page.getByRole("button", { name: /Create Profile/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to Concierge Inquiries
    await page.goto("/account/support");
    await expect(page.getByRole("heading", { name: /Concierge & Support Desk/i })).toBeVisible();

    // Click "Open New Inquiry"
    await page.getByRole("button", { name: /Open New Inquiry/i }).click();

    // Fill the modal form
    await page.locator('input[placeholder*="bespoke coat"]').fill(createdTicketSubject);
    await page.locator('textarea[placeholder*="Please provide details"]').fill(
      "Kindly advise on the tailored sleeve length and dispatch coordinates for our residence."
    );

    // Select Priority HIGH
    await page.locator("select").nth(1).selectOption("HIGH");

    // Submit
    await page.getByRole("button", { name: /Submit to Concierge/i }).click();

    // Verify redirected to inquiry detail page
    await expect(page).toHaveURL(/.*account\/support\/.+/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: createdTicketSubject })).toBeVisible();
    await expect(page.getByText(/You \(Client\)/i)).toBeVisible();

    // Post a follow-up reply
    await page.locator('textarea[placeholder*="Type your message"]').fill(
      "Additionally, please note we will be away for the weekend of the 15th."
    );
    await page.getByRole("button", { name: /Send Message/i }).click();

    // Verify message appears in timeline
    await expect(
      page.getByText("Additionally, please note we will be away for the weekend of the 15th.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("2. Store Director inspects customer directory and views patron dossier", async ({ page }) => {
    // Clear cookies to switch from customer to director
    await page.context().clearCookies();

    // Log in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to /admin/customers with search for the customer email
    await page.goto(`/admin/customers?search=${encodeURIComponent(customerEmail)}`);
    await expect(
      page.getByRole("heading", { name: /Clientele & Private Patrons/i })
    ).toBeVisible();

    // Verify KPI summary cards
    await expect(page.getByText(/Registered Patrons/i)).toBeVisible();

    // Verify newly registered patron is listed in directory
    await expect(page.getByText(customerEmail)).toBeVisible({ timeout: 10000 });

    // Click on customer row Profile link to view Patron Dossier
    const customerRow = page.locator("tr", { hasText: customerEmail });
    await customerRow.getByRole("link", { name: /Profile/i }).click();
    await expect(page).toHaveURL(/.*admin\/customers\/.+/);
    await expect(page.getByRole("heading", { name: /Lady Camille de Guise/i })).toBeVisible();
    await expect(page.getByText(/Lifetime Spend/i)).toBeVisible();
    await expect(page.getByText(/Concierge & Inquiries/i)).toBeVisible();
  });

  test("3. Store Director accesses Concierge Support Desk and replies to customer", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.locator('input[id="email"]').first().fill("owner@nexoracommerce.com");
    await page.locator('input[id="password"]').first().fill("NexoraOwner2026!");
    await page.getByRole("button", { name: /Authenticate/i }).click();

    await expect(page).toHaveURL(/.*account/, { timeout: 15000 });

    // Navigate to /admin/support with search for the customer
    await page.goto(`/admin/support?search=${encodeURIComponent(customerEmail)}`);
    await expect(
      page.getByRole("heading", { name: /Concierge Inquiries & Client Support/i })
    ).toBeVisible();

    // The created ticket will be displayed in search results
    await expect(page.getByText(createdTicketSubject)).toBeVisible({ timeout: 10000 });
    await page.getByText(createdTicketSubject).click();
    await expect(page).toHaveURL(/.*selectedTicketId=.+/);

    // Verify ticket controls panel opens
    await expect(page.getByText(/Post Response to Ticket/i)).toBeVisible();
    await expect(page.getByText(/Internal Note Only/i)).toBeVisible();

    // Post an internal staff note
    await page.locator('input[type="checkbox"]').check();
    await page.locator("textarea").fill(
      "Staff note: Checked atelier schedule, master tailor will inspect tomorrow morning."
    );
    await page.getByRole("button", { name: /Save Internal Note/i }).click();

    // Verify staff note appears
    await expect(page.getByText(/Internal Staff Note/i)).toBeVisible({ timeout: 10000 });
  });
});
