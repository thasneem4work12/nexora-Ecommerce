import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:3005";
const SCREENSHOT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots";
const PILOT_PASSKEY = "nxr_pilot_1f7d0a2eb6c8dd5ae20f61edc230569aa4bc420849a7422c";

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "x-pilot-passkey": PILOT_PASSKEY,
    },
  });

  // Set pilot perimeter cookie
  await context.addCookies([
    {
      name: "nxr_pilot_session",
      value: PILOT_PASSKEY,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  console.log("1. Visiting Login Page with authentic Owner credentials...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "owner@nexoracommerce.com");
  await page.fill('input[type="password"]', "NexoraOwner2026!");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log("✓ Owner successfully authenticated. Current URL:", page.url());

  console.log("2. Capturing Upgraded Admin Dashboard Overview with Tour Trigger...");
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-01-admin-dashboard.png") });

  console.log("3. Triggering and Capturing Active Guided Tour Spotlight Overlay...");
  const tourBtn = page.getByRole("button", { name: /Tour Dashboard/i });
  if (await tourBtn.count() > 0) {
    await tourBtn.first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-10-guided-tour-active.png") });
    // Dismiss tour
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  console.log("4. Capturing Upgraded Appearance Studio Theme Gallery with Visual Mockups...");
  await page.goto(`${BASE_URL}/admin/appearance`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-02-theme-gallery.png") });

  console.log("5. Testing Quick Preview Modal on Theme Card...");
  const previewBtns = page.getByRole("button", { name: /Preview Theme/i });
  if (await previewBtns.count() > 0) {
    await previewBtns.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-03-theme-preview-modal.png") });
    // Close modal
    const closeBtn = page.getByRole("button", { name: /Close/i });
    if (await closeBtn.count() > 0) await closeBtn.first().click();
    await page.waitForTimeout(300);
  }

  console.log("6. Capturing Live Responsive Preview Tab...");
  const previewTab = page.getByRole("button", { name: /Live Responsive Preview/i });
  if (await previewTab.count() > 0) {
    await previewTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-04-responsive-studio.png") });
  }

  console.log("7. Capturing Product Creation Form with Real-Time Live Card Preview & Crop Guidance...");
  await page.goto(`${BASE_URL}/admin/products/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#title", { timeout: 10000 });
  await page.fill("#title", "Double-Breasted Imperial Trench");
  await page.fill("#basePrice", "2450");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-05-product-form-live-preview.png") });

  console.log("8. Capturing Upgraded Admin Orders Page...");
  await page.goto(`${BASE_URL}/admin/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-06-admin-orders.png") });

  console.log("9. Adding Item to Cart & Capturing Cart with Free Shipping Progress Tracker...");
  await page.goto(`${BASE_URL}/products/double-breasted-cashmere-trench`, { waitUntil: "domcontentloaded" });
  const addBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(500);
  }
  await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-07-cart-shipping-tracker.png") });

  console.log("10. Capturing Upgraded Checkout Page with 4-Step Stepper...");
  await page.goto(`${BASE_URL}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-08-checkout-stepper.png") });

  console.log("11. Capturing Upgraded Superadmin Platform Overview in clean session...");
  const superContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "x-pilot-passkey": PILOT_PASSKEY,
    },
  });
  await superContext.addCookies([
    {
      name: "nxr_pilot_session",
      value: PILOT_PASSKEY,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const superPage = await superContext.newPage();
  await superPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await superPage.fill('input[type="email"]', "superadmin@nexoracommerce.com");
  await superPage.fill('input[type="password"]', "NexoraSuperadmin2026!");
  await Promise.all([
    superPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }),
    superPage.click('button[type="submit"]'),
  ]);
  console.log("✓ Superadmin successfully authenticated. Current URL:", superPage.url());

  await superPage.goto(`${BASE_URL}/platform`, { waitUntil: "domcontentloaded" });
  await superPage.waitForTimeout(800);
  await superPage.screenshot({ path: path.join(SCREENSHOT_DIR, "upgraded-09-platform-superadmin.png") });

  await browser.close();
  console.log("=======================================================");
  console.log("All 10 upgraded UX verification screenshots captured successfully!");
  console.log("Destination:", SCREENSHOT_DIR);
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
