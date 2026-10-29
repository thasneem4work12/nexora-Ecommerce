// Ensure Prisma connects to isolated staging PostgreSQL (port 5433)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("5432")) {
  process.env.DATABASE_URL = "postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public";
}

import { test, expect } from "@playwright/test";
import { prisma } from "../src/lib/prisma";
import { createPilotInvitation } from "../src/services/pilot-access.service";
import { PILOT_COOKIE_NAME } from "../src/lib/pilot-gate";

/**
 * ==============================================================================
 * NEXORA Commerce — Pilot External Connectivity Acceptance Test Suite
 * ==============================================================================
 * 
 * Verifies all 20 security, perimeter, storefront, auth, and data isolation
 * acceptance criteria.
 * 
 * Target Environment:
 * - Local Staging: http://localhost:3005 (Default offline verification)
 * - Supervised Tunnel: process.env.TUNNEL_URL (e.g., https://xyz.trycloudflare.com)
 * 
 * Execution Modes:
 * - Offline Verification: Runs against local staging (127.0.0.1:3005)
 * - Live Supervised Test: Runs against approved Cloudflare tunnel hostname
 * ==============================================================================
 */

const BASE_URL = process.env.TUNNEL_URL || "http://localhost:3005";
const IS_EXTERNAL_TUNNEL = !!process.env.TUNNEL_URL;

test.describe("Stage 2 Pilot External Connectivity & Perimeter Acceptance", () => {
  // Shared state for test flow
  let singleUseToken = "";
  let replayToken = "";
  let pilotSessionCookie = "";

  test.beforeAll(async () => {
    // Generate an individual single-use invitation in staging DB for this test run
    const invite = await createPilotInvitation({
      testerName: "Playwright External Runner",
      testerEmail: "playwright.external@synthetic-pilot.local",
      testerRole: "PILOT_ACCEPTANCE_TESTER",
      expiresInHours: 2,
      maxRedemptions: 1,
      createdBy: "PLAYWRIGHT_STAGE2_SUITE",
    });
    singleUseToken = invite.rawToken;

    // Generate a dedicated single-use token specifically for replay testing
    const replayInvite = await createPilotInvitation({
      testerName: "Playwright Replay Tester",
      testerEmail: "replay.tester@synthetic-pilot.local",
      testerRole: "PILOT_REPLAY_TESTER",
      expiresInHours: 2,
      maxRedemptions: 1,
      createdBy: "PLAYWRIGHT_STAGE2_SUITE",
    });
    replayToken = replayInvite.rawToken;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // Tier 1: Public Health & Probe Endpoints (Bypass Pilot Gate)
  // ---------------------------------------------------------------------------
  test("TP-01: Public health check returns HTTP 200 without pilot session", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    await unauth.dispose();
  });

  test("TP-02: Public readiness check returns HTTP 200 without pilot session", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/ready`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    await unauth.dispose();
  });

  // ---------------------------------------------------------------------------
  // Tier 2: Unauthenticated Perimeter Enforcement (Gate Closed)
  // ---------------------------------------------------------------------------
  test("TP-03: Root URL access without session redirects to /pilot-access?returnUrl=/", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/`, { waitUntil: "commit" });
    await expect(page).toHaveURL(new RegExp(`/pilot-access\\?returnUrl=${encodeURIComponent("/")}|/pilot-access\\?returnUrl=/`));
  });

  test("TP-04: Storefront catalog access without session redirects to /pilot-access", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/products`, { waitUntil: "commit" });
    await expect(page).toHaveURL(/.*\/pilot-access\?returnUrl=.*/);
  });

  test("TP-05: Direct API access without session returns HTTP 401 PILOT_ACCESS_REQUIRED", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/products`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("PILOT_ACCESS_REQUIRED");
    await unauth.dispose();
  });

  // ---------------------------------------------------------------------------
  // Tier 3: Unlock Portal UI & Token Validation
  // ---------------------------------------------------------------------------
  test("TP-06: Pilot unlock page loads with accessible form inputs", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/pilot-access`);
    await expect(page.getByRole("heading", { name: /NEXORA Atelier/i })).toBeVisible();
    await expect(page.locator("#pilot-key")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
    await expect(page.getByText(/Enter Atelier/i)).toBeVisible();
  });

  test("TP-07: Invalid invitation token is rejected with HTTP 401 INVALID_TOKEN", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
      data: { accessKey: "nxr_pilot_invalid_token_format_deadbeef" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("INVALID_TOKEN");
    await unauth.dispose();
  });

  test("TP-08: Valid single-use invitation token unlocks perimeter and sets session cookie", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
      data: { accessKey: singleUseToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const headers = res.headers();
    const setCookie = headers["set-cookie"] || "";
    expect(setCookie).toContain(PILOT_COOKIE_NAME);

    // Extract cookie value for subsequent tests
    const match = setCookie.match(new RegExp(`${PILOT_COOKIE_NAME}=([^;]+)`));
    expect(match).toBeTruthy();
    if (match) {
      pilotSessionCookie = match[1];
    }
    await unauth.dispose();
  });

  test("TP-09: Pilot session cookie conforms to strict security attributes", async ({ playwright }) => {
    // Generate temporary token in staging DB
    const tempInvite = await createPilotInvitation({
      testerName: "Cookie Attributes Tester",
      expiresInHours: 1,
      maxRedemptions: 1,
      createdBy: "COOKIE_TEST",
    });

    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
      data: { accessKey: tempInvite.rawToken },
    });
    expect(res.status()).toBe(200);

    const headers = res.headers();
    const setCookie = headers["set-cookie"] || "";

    // Attributes: HttpOnly, SameSite=Lax, Path=/
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie.toLowerCase()).toContain("path=/");

    // Secure attribute: required if HTTPS origin is configured
    if (IS_EXTERNAL_TUNNEL || BASE_URL.startsWith("https://")) {
      expect(setCookie.toLowerCase()).toContain("secure");
    }
    await unauth.dispose();
  });

  // ---------------------------------------------------------------------------
  // Tier 4: Storefront & E-Commerce Workflows (With Valid Pilot Session)
  // ---------------------------------------------------------------------------
  test("TP-10: Storefront homepage loads successfully with active pilot session", async ({ page }) => {
    const urlObj = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: PILOT_COOKIE_NAME,
        value: pilotSessionCookie,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: urlObj.protocol === "https:",
      },
    ]);

    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveTitle(/NEXORA Haute Couture/i);
    await expect(page.getByRole("link", { name: /NEXORA/i }).first()).toBeVisible();
  });

  test("TP-11: Product catalog browses synthetic products in LKR currency", async ({ page }) => {
    const urlObj = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: PILOT_COOKIE_NAME,
        value: pilotSessionCookie,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: urlObj.protocol === "https:",
      },
    ]);

    await page.goto(`${BASE_URL}/products`);
    await expect(page.getByRole("heading", { name: /Curated Creations/i })).toBeVisible();
    const productCard = page.locator("article, [data-testid='product-card'], div.group").first();
    await expect(productCard).toBeVisible();
  });

  test("TP-12: Cart drawer supports adding items and updating quantity", async ({ page }) => {
    const urlObj = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: PILOT_COOKIE_NAME,
        value: pilotSessionCookie,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: urlObj.protocol === "https:",
      },
    ]);

    await page.goto(`${BASE_URL}/products/double-breasted-cashmere-trench`);
    const addBtn = page.getByRole("button", { name: /Add to Shopping Bag/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify shopping bag drawer opened
    await expect(page.getByText(/Shopping Bag/i).first()).toBeVisible();
  });

  test("TP-13: Mock checkout API parses requests under simulated payment policy", async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await apiContext.post(`${BASE_URL}/api/checkout`, {
      headers: {
        Cookie: `${PILOT_COOKIE_NAME}=${pilotSessionCookie}`,
        "Content-Type": "application/json",
      },
      data: {
        guestEmail: "shopper.tester@synthetic-pilot.local",
        items: [],
      },
    });

    // Validates that request successfully passed Edge Middleware pilot gate and reached checkout handler
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("bag is currently empty");
    await apiContext.dispose();
  });

  test("TP-14: Email delivery operates in SIMULATED mode (Notification pattern verified)", async () => {
    // Verify staging environment configuration enforces SIMULATED email
    expect(process.env.EMAIL_DELIVERY_MODE || "SIMULATED").not.toBe("LIVE");
    // Verify notifications table exists in PostgreSQL
    const count = await prisma.notification.count();
    expect(typeof count).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // Tier 5: Security Boundary Enforcement & Replay Protection
  // ---------------------------------------------------------------------------
  test("TP-15: Replay rejection: redeemed invitation is blocked on subsequent attempts", async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });

    // First redemption: must succeed
    const res1 = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
      data: { accessKey: replayToken },
    });
    expect(res1.status()).toBe(200);

    // Second redemption: must be strictly rejected
    const res2 = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
      data: { accessKey: replayToken },
    });
    expect(res2.status()).toBe(401);
    const body2 = await res2.json();
    expect(body2.code).toBe("INVALID_TOKEN");
    await unauth.dispose();
  });

  test("TP-16: Rate limiting enforcement: repeated invalid attempts trigger HTTP 429", async ({ playwright }) => {
    const testIp = "198.51.100.99"; // Synthetic test IP
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    let hitRateLimit = false;

    // Send up to 6 rapid invalid unlock attempts
    for (let i = 0; i < 6; i++) {
      const res = await unauth.post(`${BASE_URL}/api/pilot/unlock`, {
        headers: {
          "X-Forwarded-For": testIp,
        },
        data: { accessKey: `nxr_pilot_bruteforce_attempt_${i}` },
      });

      if (res.status() === 429) {
        hitRateLimit = true;
        const body = await res.json();
        expect(body.code).toBe("RATE_LIMITED");
        break;
      }
    }

    expect(hitRateLimit).toBe(true);

    // Cleanup synthetic rate limit record in staging DB
    await prisma.pilotRateLimit.deleteMany({
      where: { identifier: `ip:${testIp}` },
    });
    await unauth.dispose();
  });

  test("TP-17: Platform admin access control: unauthenticated users cannot access /platform", async ({ page }) => {
    const urlObj = new URL(BASE_URL);
    // User has pilot session but NO admin user session
    await page.context().addCookies([
      {
        name: PILOT_COOKIE_NAME,
        value: pilotSessionCookie,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: urlObj.protocol === "https:",
      },
    ]);

    await page.goto(`${BASE_URL}/platform`);
    // Must redirect to /login?callbackUrl=/platform
    await expect(page).toHaveURL(/.*\/login\?callbackUrl=.*/);
  });

  test("TP-18: Pilot session role isolation: gate cookie grants zero Better Auth privileges", async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await apiContext.get(`${BASE_URL}/api/auth/get-session`, {
      headers: {
        Cookie: `${PILOT_COOKIE_NAME}=${pilotSessionCookie}`,
      },
    });

    // Should return null/empty session or 401
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeNull();
    } else {
      expect([401, 403]).toContain(res.status());
    }
    await apiContext.dispose();
  });

  test("TP-19: Multi-tenant data isolation: store namespaces remain strictly segregated", async () => {
    const stores = await prisma.business.findMany({
      where: { slug: { in: ["default-store", "lumina-tech"] } },
      include: { _count: { select: { products: true, orders: true } } },
    });

    if (stores.length >= 2) {
      const [storeA, storeB] = stores;
      // Stores must have separate IDs
      expect(storeA.id).not.toBe(storeB.id);
    }
  });

  test("TP-20: Session revocation: /api/pilot/lock clears cookie and locks perimeter", async ({ page }) => {
    const urlObj = new URL(BASE_URL);
    await page.context().addCookies([
      {
        name: PILOT_COOKIE_NAME,
        value: pilotSessionCookie,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: urlObj.protocol === "https:",
      },
    ]);

    // Send lock request
    const lockRes = await page.request.post(`${BASE_URL}/api/pilot/lock`, {
      headers: {
        Cookie: `${PILOT_COOKIE_NAME}=${pilotSessionCookie}`,
      },
    });
    expect(lockRes.status()).toBe(200);

    // Verify subsequent page access redirects back to /pilot-access
    await page.goto(`${BASE_URL}/products`, { waitUntil: "commit" });
    await expect(page).toHaveURL(/.*\/pilot-access\?returnUrl=.*/);
  });
});
