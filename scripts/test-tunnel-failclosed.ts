import { NextRequest } from "next/server";
import { validateHostHeader } from "../src/lib/pilot-gate";
import { envSchema } from "../src/lib/env-validator";

const BASE_URL = "http://localhost:3005";

async function runTunnelAudit() {
  console.log("==================================================================");
  console.log("    NEXORA COMMERCE — TUNNEL STARTUP FAIL-CLOSED AUDIT HARNESS    ");
  console.log("==================================================================\n");

  let allPassed = true;

  // ---------------------------------------------------------------------------
  // Check 1: Live Staging Host Header Gate (Before Hostname Approval)
  // When tunnel is freshly spawned, APPROVED_PILOT_HOSTNAME is empty.
  // External traffic carries Host: [random].trycloudflare.com.
  // Must return HTTP 403 Forbidden!
  // ---------------------------------------------------------------------------
  try {
    const unapprovedHostRes = await fetch(`${BASE_URL}/`, {
      headers: {
        Host: "random-ephemeral-123.trycloudflare.com",
        "X-Forwarded-Host": "random-ephemeral-123.trycloudflare.com",
      },
      redirect: "manual",
    });

    const status = unapprovedHostRes.status;
    const body = await unapprovedHostRes.json().catch(() => ({}));

    if (status === 403 && body.code === "INVALID_HOST_HEADER") {
      console.log("[✓ PASS] Check 1: Pre-Approval Host Gate is FAIL-CLOSED");
      console.log(`         Received HTTP 403 Forbidden (code: ${body.code}) for unapproved tunnel host.`);
    } else {
      console.error(`[✗ FAIL] Check 1: Pre-Approval Host Gate leaked response! Status: ${status}`);
      allPassed = false;
    }
  } catch (err: any) {
    console.error(`[✗ FAIL] Check 1 error: ${err.message}`);
    allPassed = false;
  }

  // ---------------------------------------------------------------------------
  // Check 2: Arbitrary Subdomain Spoofing
  // Attacker points malicious host header to staging instance.
  // ---------------------------------------------------------------------------
  try {
    const spoofedRes = await fetch(`${BASE_URL}/api/health`, {
      headers: {
        Host: "evil-phishing-host.com",
        "X-Forwarded-Host": "evil-phishing-host.com",
      },
    });

    const status = spoofedRes.status;
    const body = await spoofedRes.json().catch(() => ({}));

    if (status === 403 && body.code === "INVALID_HOST_HEADER") {
      console.log("[✓ PASS] Check 2: Spoofed Host Header is FAIL-CLOSED");
      console.log(`         Received HTTP 403 Forbidden for evil-phishing-host.com.`);
    } else {
      console.error(`[✗ FAIL] Check 2: Spoofed Host Header allowed! Status: ${status}`);
      allPassed = false;
    }
  } catch (err: any) {
    console.error(`[✗ FAIL] Check 2 error: ${err.message}`);
    allPassed = false;
  }

  // ---------------------------------------------------------------------------
  // Check 3: Wildcard Prevention in Validator
  // ---------------------------------------------------------------------------
  const wildcardCheck = envSchema.safeParse({
    NODE_ENV: "staging",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    BETTER_AUTH_SECRET: "minimum_32_characters_secret_key_for_testing",
    APPROVED_PILOT_HOSTNAME: "https://*.trycloudflare.com",
  });

  if (!wildcardCheck.success) {
    console.log("[✓ PASS] Check 3: Wildcard Hostname Rejected by Configuration Validator");
    console.log("         Wildcard (*) strictly forbidden in APPROVED_PILOT_HOSTNAME.");
  } else {
    console.error("[✗ FAIL] Check 3: Wildcard hostname was erroneously accepted!");
    allPassed = false;
  }

  // ---------------------------------------------------------------------------
  // Check 4: Unit Level Host Validation Logic
  // ---------------------------------------------------------------------------
  const origEnv = process.env.APPROVED_PILOT_HOSTNAME;
  try {
    // Case A: No approved host configured
    delete process.env.APPROVED_PILOT_HOSTNAME;
    const reqA = new NextRequest("https://fresh-tunnel.trycloudflare.com/catalog", {
      headers: { host: "fresh-tunnel.trycloudflare.com" },
    });
    const validA = validateHostHeader(reqA);
    if (!validA) {
      console.log("[✓ PASS] Check 4A: validateHostHeader rejects unapproved host when env is unset");
    } else {
      console.error("[✗ FAIL] Check 4A: validateHostHeader allowed unapproved host!");
      allPassed = false;
    }

    // Case B: Approved host configured
    process.env.APPROVED_PILOT_HOSTNAME = "https://verified-pilot.trycloudflare.com";
    const reqB = new NextRequest("https://verified-pilot.trycloudflare.com/catalog", {
      headers: { host: "verified-pilot.trycloudflare.com" },
    });
    const reqC = new NextRequest("https://attacker-tunnel.trycloudflare.com/catalog", {
      headers: { host: "attacker-tunnel.trycloudflare.com" },
    });

    const validB = validateHostHeader(reqB);
    const validC = validateHostHeader(reqC);

    if (validB && !validC) {
      console.log("[✓ PASS] Check 4B: validateHostHeader strictly allows approved origin and rejects others");
    } else {
      console.error(`[✗ FAIL] Check 4B: Logic failure! validB=${validB}, validC=${validC}`);
      allPassed = false;
    }
  } finally {
    process.env.APPROVED_PILOT_HOSTNAME = origEnv;
  }

  console.log("\n==================================================================");
  console.log(` TUNNEL FAIL-CLOSED AUDIT RESULT: ${allPassed ? "ALL CHECKS PASSED (FAIL-CLOSED PROVEN)" : "FAILURES DETECTED"} `);
  console.log("==================================================================\n");

  if (!allPassed) process.exit(1);
}

runTunnelAudit();
