import { chromium } from "@playwright/test";
import path from "path";

const BASE_URL = "http://127.0.0.1:3005";
const PILOT_PASSKEY = "nxr_pilot_1f7d0a2eb6c8dd5ae20f61edc230569aa4bc420849a7422c";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "x-pilot-passkey": PILOT_PASSKEY },
  });

  await ctx.addCookies([
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

  const page = await ctx.newPage();

  // Log in as Superadmin (like in the user's screenshot)
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "superadmin@nexoracommerce.com");
  await page.fill('input[type="password"]', "NexoraSuperadmin2026!");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login")),
    page.click('button[type="submit"]'),
  ]);

  console.log("Logged in as Superadmin, now navigating to /admin...");
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const screenshotPathSuperadmin = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots/fixed-admin-superadmin.png";
  await page.screenshot({ path: screenshotPathSuperadmin });
  console.log("Viewport screenshot saved to:", screenshotPathSuperadmin);

  // Check if header or footer exist
  const hasStorefrontHeader = await page.evaluate(() => !!document.querySelector("header nav a[href='/products']"));
  const hasStorefrontFooter = await page.evaluate(() => !!document.querySelector("footer"));
  console.log("Has storefront header on /admin:", hasStorefrontHeader);
  console.log("Has storefront footer on /admin:", hasStorefrontFooter);

  // Now log in as Owner
  console.log("Logging in as Owner...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "owner@nexoracommerce.com");
  await page.fill('input[type="password"]', "NexoraOwner2026!");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login")),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const screenshotPathOwner = "C:/Users/DELL/.gemini/antigravity/brain/d5b439f2-3bc2-4b00-b531-ea446a6511bf/screenshots/fixed-admin-owner.png";
  await page.screenshot({ path: screenshotPathOwner });
  console.log("Owner viewport screenshot saved to:", screenshotPathOwner);

  await browser.close();
}

main().catch(console.error);
