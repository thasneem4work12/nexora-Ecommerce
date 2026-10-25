import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots";

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("Capturing 1: Desktop Homepage...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-homepage-desktop.png") });

  console.log("Capturing 2: Product Catalog...");
  await page.goto("http://localhost:3000/products", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-catalog-desktop.png") });

  console.log("Capturing 3: Product Detail with Variants...");
  await page.goto("http://localhost:3000/products/double-breasted-cashmere-trench", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-product-details-desktop.png") });

  console.log("Capturing 4: Cart Drawer...");
  const mediumVariantBtn = page.getByRole("button", { name: /Camel \/ Medium/i });
  await mediumVariantBtn.click();
  const addToCartBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
  await addToCartBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-cart-drawer-desktop.png") });

  console.log("Capturing 5: Checkout Demonstration...");
  await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-checkout-demo-desktop.png") });

  console.log("Capturing 6: Client Registration Page...");
  await page.goto("http://localhost:3000/register", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-register-desktop.png") });

  console.log("Capturing 7: Client Login Page...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-login-desktop.png") });

  console.log("Capturing 8: Mobile Homepage Viewport...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 / modern mobile
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "08-homepage-mobile.png") });

  console.log("Capturing 9: Mobile Navigation Drawer...");
  const menuBtn = mobilePage.getByRole("button", { name: /Toggle Navigation/i });
  await menuBtn.click();
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "09-mobile-nav-drawer.png") });

  await browser.close();
  console.log("All verification screenshots successfully captured in:", SCREENSHOT_DIR);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
