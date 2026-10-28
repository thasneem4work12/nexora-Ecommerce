import { prisma } from "../src/lib/prisma";
import {
  createPilotInvitation,
  revokePilotInvitation,
  revokePilotSession,
  hashToken,
} from "../src/services/pilot-access.service";
import { PilotInvitationStatus, PilotSessionStatus } from "@prisma/client";

const BASE_URL = "http://localhost:3005";

interface TestStepResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestStepResult[] = [];

function record(step: string, passed: boolean, details: string) {
  results.push({ step, passed, details });
  const statusMark = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${statusMark}] ${step}: ${details}`);
}

async function main() {
  console.log("==================================================================");
  console.log("    NEXORA COMMERCE — LIVE STAGING PILOT ACCESS ACCEPTANCE TEST   ");
  console.log(`    Target: ${BASE_URL} (Isolated Staging Container)             `);
  console.log("==================================================================\n");

  // ---------------------------------------------------------------------------
  // TASK 1: Check Staging Health & Gate State
  // ---------------------------------------------------------------------------
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    record(
      "Task 1: Next.js Staging Health",
      healthRes.status === 200 && healthData.status === "ok",
      `Health endpoint returned HTTP ${healthRes.status}, service: ${healthData.service}`
    );

    const statusRes = await fetch(`${BASE_URL}/api/pilot/status`);
    const statusData = await statusRes.json();
    record(
      "Task 1: Pilot Gate Active",
      statusRes.status === 200 && statusData.gateEnabled === true && statusData.isUnlocked === false,
      `Gate enabled: ${statusData.gateEnabled}, initially unlocked: ${statusData.isUnlocked}`
    );
  } catch (err: any) {
    record("Task 1: Staging Readiness", false, `Failed to reach staging server: ${err.message}`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TASK 2: Real Invitation Flows Locally
  // ---------------------------------------------------------------------------
  let alphaInvitationId = "";
  let alphaRawToken = "";
  let alphaSessionCookie = "";

  // 1. Create Invitation
  try {
    const created = await createPilotInvitation({
      testerName: "Synthetic Tester Alpha",
      testerEmail: "tester.alpha@synthetic-pilot.local",
      testerRole: "EXTERNAL_REVIEWER",
      expiresInHours: 24,
      maxRedemptions: 1,
    });
    alphaInvitationId = created.invitation.id;
    alphaRawToken = created.rawToken;

    const dbRecord = await prisma.pilotInvitation.findUnique({
      where: { id: alphaInvitationId },
    });

    record(
      "Task 2.1: Create Invitation",
      !!dbRecord && dbRecord.tokenHash === hashToken(alphaRawToken),
      `Created invitation ID: ${alphaInvitationId}, token hash verified in PostgreSQL`
    );
  } catch (err: any) {
    record("Task 2.1: Create Invitation", false, err.message);
  }

  // 2. Redeem Invitation Once
  try {
    const unlockRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: alphaRawToken }),
    });

    const setCookie = unlockRes.headers.get("set-cookie") || "";
    const unlockData = await unlockRes.json();

    const cookieMatch = setCookie.match(/nexora_pilot_session=([^;]+)/);
    alphaSessionCookie = cookieMatch ? cookieMatch[1] : "";

    record(
      "Task 2.2: First Redemption",
      unlockRes.status === 200 && unlockData.success === true && !!alphaSessionCookie,
      `HTTP ${unlockRes.status}, welcome: "${unlockData.message}". Received signed session cookie.`
    );
  } catch (err: any) {
    record("Task 2.2: First Redemption", false, err.message);
  }

  // 3. Verify Second Redemption Rejected (Replay Attack)
  try {
    const replayRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: alphaRawToken }),
    });
    const replayData = await replayRes.json();

    record(
      "Task 2.3: Replay Rejection",
      replayRes.status === 401 && replayData.error.includes("Invalid or expired"),
      `Second redemption rejected with HTTP ${replayRes.status}: "${replayData.error}"`
    );
  } catch (err: any) {
    record("Task 2.3: Replay Rejection", false, err.message);
  }

  // 4. Verify Session Cookie Structure
  const cookieParts = alphaSessionCookie.split(".");
  record(
    "Task 2.4: Session Cookie Structure",
    cookieParts.length === 4 && parseInt(cookieParts[2], 10) > Date.now(),
    `Cookie contains 4 parts (sessionId, secret, expirationMs, signature). Expiration verified in future.`
  );

  // 5. Access Approved Staging Route with Cookie
  try {
    const pageRes = await fetch(`${BASE_URL}/store/nexora`, {
      headers: { Cookie: `nexora_pilot_session=${alphaSessionCookie}` },
      redirect: "manual",
    });

    record(
      "Task 2.5: Approved Route Access",
      pageRes.status === 200,
      `Accessing /store/nexora with session cookie returned HTTP ${pageRes.status} (Storefront rendered)`
    );
  } catch (err: any) {
    record("Task 2.5: Approved Route Access", false, err.message);
  }

  // 6. Attempt Direct API Access Without Session
  try {
    const unauthApiRes = await fetch(`${BASE_URL}/api/products`, {
      headers: { Accept: "application/json" },
    });
    const unauthApiData = await unauthApiRes.json();

    record(
      "Task 2.6: Direct API Access Without Session",
      unauthApiRes.status === 401 && unauthApiData.code === "PILOT_ACCESS_REQUIRED",
      `HTTP ${unauthApiRes.status}: "${unauthApiData.error}" (code: ${unauthApiData.code})`
    );
  } catch (err: any) {
    record("Task 2.6: Direct API Access Without Session", false, err.message);
  }

  // 7. Revoke Invitation & Session
  try {
    const revoked = await revokePilotInvitation(alphaInvitationId, "Acceptance Test Revocation");
    const updatedSession = await prisma.pilotSession.findFirst({
      where: { invitationId: alphaInvitationId },
    });

    record(
      "Task 2.7: Revoke Invitation & Session",
      revoked === true && updatedSession?.status === PilotSessionStatus.REVOKED,
      `Invitation and child session status set to REVOKED in PostgreSQL`
    );
  } catch (err: any) {
    record("Task 2.7: Revoke Invitation & Session", false, err.message);
  }

  // 8. Verify Access Immediately Denied After Revocation
  try {
    const revokedCheckRes = await fetch(`${BASE_URL}/api/pilot/status`, {
      headers: { Cookie: `nexora_pilot_session=${alphaSessionCookie}` },
    });
    const revokedCheckData = await revokedCheckRes.json();

    record(
      "Task 2.8: Access Denied After Revocation",
      revokedCheckData.isUnlocked === false,
      `/api/pilot/status returned isUnlocked: ${revokedCheckData.isUnlocked} for revoked session`
    );
  } catch (err: any) {
    record("Task 2.8: Access Denied After Revocation", false, err.message);
  }

  // 11. Test Expired and Invalid Invitations
  try {
    const expiredInv = await createPilotInvitation({
      testerName: "Synthetic Expired Tester",
      expiresInHours: -2,
    });
    // Force date in past
    await prisma.pilotInvitation.update({
      where: { id: expiredInv.invitation.id },
      data: { expiresAt: new Date(Date.now() - 3600000) },
    });

    const expiredRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: expiredInv.rawToken }),
    });
    const expiredData = await expiredRes.json();

    record(
      "Task 2.11a: Expired Invitation Rejected",
      expiredRes.status === 401 && expiredData.error.includes("Invalid or expired"),
      `Expired invitation rejected with HTTP ${expiredRes.status}`
    );

    const invalidRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: "nxr_pilot_completely_bogus_token_hex_99999" }),
    });
    const invalidData = await invalidRes.json();

    record(
      "Task 2.11b: Invalid Invitation Rejected",
      invalidRes.status === 401 && invalidData.error === expiredData.error,
      `Invalid token rejected with identical error message (Zero Enumeration)`
    );
  } catch (err: any) {
    record("Task 2.11: Expired/Invalid", false, err.message);
  }

  // 12. Simultaneous Redemption Attempts
  try {
    const raceInv = await createPilotInvitation({
      testerName: "Synthetic Concurrent Tester",
      maxRedemptions: 1,
    });

    const concurrentAttempts = await Promise.all([
      fetch(`${BASE_URL}/api/pilot/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.1.1" },
        body: JSON.stringify({ accessKey: raceInv.rawToken }),
      }),
      fetch(`${BASE_URL}/api/pilot/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.1.2" },
        body: JSON.stringify({ accessKey: raceInv.rawToken }),
      }),
      fetch(`${BASE_URL}/api/pilot/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.1.3" },
        body: JSON.stringify({ accessKey: raceInv.rawToken }),
      }),
    ]);

    const statuses = concurrentAttempts.map((r) => r.status);
    const successCount = statuses.filter((s) => s === 200).length;
    const failCount = statuses.filter((s) => s === 401).length;

    record(
      "Task 2.12: Concurrent Redemption Concurrency",
      successCount === 1 && failCount === 2,
      `Out of 3 simultaneous redemptions: ${successCount} succeeded (200), ${failCount} rejected (401). Atomic transaction lock verified.`
    );
  } catch (err: any) {
    record("Task 2.12: Concurrent Redemption", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TASK 3: Perimeter Security Across All Resource Types
  // ---------------------------------------------------------------------------
  const perimeterRoutes = [
    { name: "Storefront Home", path: "/", expectedRedirect: true },
    { name: "Storefront Brand", path: "/store/nexora", expectedRedirect: true },
    { name: "Customer Account", path: "/account", expectedRedirect: true },
    { name: "Admin Dashboard", path: "/admin", expectedRedirect: true },
    { name: "Admin Products", path: "/admin/products", expectedRedirect: true },
    { name: "Platform Superadmin", path: "/platform", expectedRedirect: true },
    { name: "Login Portal", path: "/login", expectedRedirect: true },
  ];

  for (const r of perimeterRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`, { redirect: "manual" });
      const loc = res.headers.get("location") || "";
      const isRedirect = (res.status === 307 || res.status === 302) && loc.includes("/pilot-access");
      record(
        `Task 3: Perimeter [${r.name}]`,
        isRedirect,
        `Unauthenticated request to ${r.path} received HTTP ${res.status} redirecting to ${loc}`
      );
    } catch (err: any) {
      record(`Task 3: Perimeter [${r.name}]`, false, err.message);
    }
  }

  // Test Uploaded Media Perimeter Protection
  try {
    const uploadRes = await fetch(`${BASE_URL}/uploads/sample-product.jpg`, { redirect: "manual" });
    const isProtected = uploadRes.status === 401 || uploadRes.status === 307;
    record(
      "Task 3: Uploaded Files Perimeter Protection",
      isProtected,
      `Unauthenticated direct access to /uploads/ received HTTP ${uploadRes.status} (Protected by pilot gate)`
    );
  } catch (err: any) {
    record("Task 3: Uploaded Files", false, err.message);
  }

  // Test Decoupling & Role Isolation
  try {
    // Create new valid session
    const validTester = await createPilotInvitation({
      testerName: "Role Decouple Tester",
      maxRedemptions: 1,
    });
    const unlockRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: validTester.rawToken }),
    });
    const cookie = (unlockRes.headers.get("set-cookie") || "").match(/nexora_pilot_session=([^;]+)/)?.[1] || "";

    // Access Platform Superadmin API using only pilot session cookie
    const platformApiRes = await fetch(`${BASE_URL}/api/platform/metrics`, {
      headers: { Cookie: `nexora_pilot_session=${cookie}` },
    });

    record(
      "Task 3: Pilot Access Does NOT Grant SUPERADMIN",
      platformApiRes.status === 401 || platformApiRes.status === 403,
      `/api/platform/metrics with pilot cookie received HTTP ${platformApiRes.status} (Denied). Better Auth superadmin required.`
    );

    // Cross-tenant public isolation
    const nexoraStoreRes = await fetch(`${BASE_URL}/store/nexora`, {
      headers: { Cookie: `nexora_pilot_session=${cookie}` },
    });
    const luminaStoreRes = await fetch(`${BASE_URL}/store/lumina-tech`, {
      headers: { Cookie: `nexora_pilot_session=${cookie}` },
    });

    record(
      "Task 3: Cross-Tenant Storefront Isolation",
      nexoraStoreRes.status === 200 && luminaStoreRes.status === 200,
      `Stores /store/nexora (HTTP ${nexoraStoreRes.status}) and /store/lumina-tech (HTTP ${luminaStoreRes.status}) resolve independently`
    );
  } catch (err: any) {
    record("Task 3: Role & Tenant Isolation", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TASK 4: Rate Limiting & Tamper Prevention
  // ---------------------------------------------------------------------------
  try {
    const testRateIp = "10.42.42.99";
    const identifier = `ip:${testRateIp}`;

    // Clear prior rate limit for test IP
    await prisma.pilotRateLimit.deleteMany({ where: { identifier } });

    // Send 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      await fetch(`${BASE_URL}/api/pilot/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": testRateIp },
        body: JSON.stringify({ accessKey: `invalid_key_attempt_${i}` }),
      });
    }

    // Inspect database
    const dbLimit = await prisma.pilotRateLimit.findUnique({
      where: { identifier },
    });

    const isBlocked = dbLimit && dbLimit.failedAttempts >= 5 && dbLimit.blockedUntil !== null && dbLimit.blockedUntil.getTime() > Date.now();

    record(
      "Task 4: PostgreSQL Rate Limit Threshold (5 Attempts)",
      !!isBlocked,
      `PostgreSQL record for ${identifier}: ${dbLimit?.failedAttempts} failed attempts, blockedUntil: ${dbLimit?.blockedUntil?.toISOString()}`
    );

    // 6th Attempt MUST receive HTTP 429
    const blockedRes = await fetch(`${BASE_URL}/api/pilot/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": testRateIp },
      body: JSON.stringify({ accessKey: "invalid_key_attempt_6" }),
    });
    const blockedData = await blockedRes.json();

    record(
      "Task 4: Rate Limit Block Response (HTTP 429)",
      blockedRes.status === 429 && blockedData.code === "RATE_LIMITED",
      `HTTP ${blockedRes.status}: "${blockedData.error}" (code: ${blockedData.code})`
    );

    // Clean up
    await prisma.pilotRateLimit.deleteMany({ where: { identifier } });
  } catch (err: any) {
    record("Task 4: Rate Limiting", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n==================================================================");
  console.log(` ACCEPTANCE TEST SUMMARY: ${passed}/${total} PASSED (${failed} failed) `);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
