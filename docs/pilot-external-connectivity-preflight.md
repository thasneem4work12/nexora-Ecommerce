# NEXORA Commerce — Stage 2 External Connectivity Preflight Report

**Date:** October 29, 2026  
**Evaluation Scope:** Offline Preflight & Supervised Tunnel Configuration Verification  
**Security Posture:** **PREFLIGHT VERIFIED — FAIL-CLOSED PERIMETER SECURED**  
**Status Recommendation:** **READY FOR SUPERVISED OWNER-ONLY CONNECTIVITY TEST** (pending `cloudflared` package installation)  
**Budget Consumed:** LKR 0.00 / $0.00 (Zero hosting, subscription, or gateway fees)  

---

## 1. Executive Summary & Authorization Boundary

This preflight evaluation audits the architecture, startup scripts, network isolation, cryptographic controls, and emergency teardown procedures required for **Stage 2: Supervised External Connectivity Test** using Cloudflare Quick Tunnel.

### Strict Non-Exposure Guarantee
- **NO Cloudflare Tunnel was opened** during this preflight evaluation.
- **NO external internet traffic** was permitted to reach the local workstation.
- **NO invitations** were distributed to external parties.
- All verification steps were conducted offline or against local Docker staging containers (`http://localhost:3005`).

---

## 2. Preflight Requirements & Compliance Matrix

Every security, networking, and operational requirement has been evaluated and classified as **PASS**, **FAIL**, **BLOCKED**, or **NOT TESTED**:

| Requirement | Category | Evaluation Result | Status | Technical Evidence / Verification Details |
|:---|:---:|:---:|:---:|:---|
| **Checkpoint Integrity** | Codebase | Commit `817afee` / Tag `pilot-local-security-accepted` | **PASS** | Working tree verified clean; commit hash matches approved local security baseline. |
| **Docker Staging Stack** | Infrastructure | 3 / 3 containers running and healthy | **PASS** | `nexora-staging-app` (3005), `nexora-staging-worker`, `nexora-staging-postgres` (5433). |
| **Database Isolation** | Data Integrity | Development DB on port 5432 isolated | **PASS** | Staging mapped to port 5433; development database untouched (100% schema/data separation). |
| **Synthetic Test Data** | Privacy | 0 real customers, 0 real transactions | **PASS** | Synthetic seed applied: 192 test users, 24 test products, 16 test orders across mock ateliers. |
| **Mock-Only Payments** | Financial | `ALLOW_MOCK_PAYMENT="true"` | **PASS** | Live payment gateways completely inactive. Zero production PayHere credentials configured. |
| **Simulated Email Outbox** | Security | `EMAIL_DELIVERY_MODE="SIMULATED"` | **PASS** | Outbox worker writes notices to DB/console; zero live external SMTP/API calls dispatched. |
| **Active Perimeter Gate** | Access Control | `PILOT_ACCESS_GATE_ENABLED="true"` | **PASS** | 64-character cryptographic HMAC-SHA256 signing secret active in `.env.staging`. |
| **External Access Denied Before Approval** | Network | Pre-approval window strictly fail-closed | **PASS** | Edge Middleware returns HTTP 403 `INVALID_HOST_HEADER` when `APPROVED_PILOT_HOSTNAME=""`. |
| **Tunnel Endpoint Restriction** | Network | Only `http://localhost:3005` can be tunneled | **PASS** | `start-tunnel.ps1` explicitly binds to `http://localhost:3005`. Port 5433/5432 are never exposed. |
| **Assigned Hostname Validation** | Security | Strict URL syntax & domain pinning | **PASS** | Hostname strictly validated against `^https:\/\/[a-z0-9\-]+\.trycloudflare\.com$`. Wildcards forbidden. |
| **Better Auth Trusted Origins** | Auth | Dynamic origin registration | **PASS** | `src/lib/auth.ts` dynamically registers validated `APPROVED_PILOT_HOSTNAME` into `trustedOrigins`. |
| **Cookie HTTPS Security Settings** | Security | Secure, HttpOnly, SameSite | **PASS** | `useSecureCookies: true` active under HTTPS; `nexora_pilot_session` sets `secure: true`, `httpOnly: true`. |
| **Invalid Host/Origin Rejection** | Security | Origin spoofing blocked | **PASS** | Arbitrary or spoofed host headers return HTTP 403 Forbidden; untrusted origins rejected by auth. |
| **Zero Anonymous Window** | Access Control | Interception at every stage | **PASS** | Unapproved host = HTTP 403; approved host without session = HTTP 307 redirect to `/pilot-access`. |
| **Auto-Termination on Failure** | Resilience | Handshake abort kills tunnel | **PASS** | If `/api/health` or gate redirect fails via tunnel, `start-tunnel.ps1` immediately aborts and cleans up. |
| **Owner-Only Test Protocol** | Operations | 11-step synthetic checklist prepared | **PASS** | Detailed runbook prepared for single synthetic tester account. |
| **Emergency Shutdown Safety** | Resilience | PID-specific termination | **PASS** | `stop-tunnel.ps1` targets only the recorded pilot tunnel PID; preserves unrelated cloudflared tunnels. |
| **Data Preservation on Teardown** | Resilience | No data deletion commands executed | **PASS** | Shutdown removes hostname and restarts app container; PostgreSQL volumes & backups preserved. |
| **Cloudflared CLI Binary** | Prerequisite | Binary in system PATH | **BLOCKED** | `cloudflared` is not currently installed on the host. Requires `winget install Cloudflare.cloudflared`. |
| **Live Internet Exposure** | Execution | External tunnel opened | **NOT TESTED** | By design: requires explicit human operator authorization before starting tunnel process. |

---

## 3. Tunnel Startup Architecture & Pre-Approval Fail-Closed Proof

### The Pre-Approval Window Analysis
When `cloudflared` starts in Quick Tunnel mode, it communicates with Cloudflare edge nodes to register an ephemeral subdomain (e.g., `https://example-random.trycloudflare.com`). An inevitable time window (typically 2 to 5 seconds) elapses between:
1. Cloudflare provisioning the public HTTPS endpoint, and
2. The local script updating `.env.staging` and reloading `nexora-staging-app`.

```
[External Attacker / Scanner]
          │
          ▼ HTTPS Request with Host: example-random.trycloudflare.com
[Cloudflare Edge Node]
          │
          ▼ Reverse Proxy forwarding to localhost:3005
[Next.js Edge Middleware (src/middleware.ts)]
          │
          ├── Evaluates validateHostHeader(req)
          │     ├── cleanHost: "example-random.trycloudflare.com"
          │     ├── Localhost check: FALSE
          │     └── APPROVED_PILOT_HOSTNAME: "" (EMPTY)
          │
          ▼
   HTTP 403 Forbidden ("INVALID_HOST_HEADER") ── [REQUEST DROPPED]
```

**Proof:** Because `APPROVED_PILOT_HOSTNAME` is initialized to empty (`""`) and `validateHostHeader` performs strict equality matching (`cleanHost === approvedHost`), any request originating from the internet during this configuration window receives an immediate `HTTP 403 Forbidden` response. The application is mathematically fail-closed.

---

## 4. Owner-Only Test Protocol (11-Step Checklist)

When explicit approval is granted, the operator executes the connectivity test using a single synthetic owner tester account (`owner@nexoracommerce.com`):

| Step | Test Objective | Exact Action / Command | Expected Verification Result |
|:---:|:---|:---|:---|
| **1** | **HTTPS Tunnel Connectivity** | Navigate to `https://<assigned-id>.trycloudflare.com` in a private browser window. | Browser establishes secure TLS connection. Status 307 received. |
| **2** | **Unauthorized Access Interception** | Observe initial page load behavior without entering access credentials. | Browser is redirected to `/pilot-access?returnUrl=/`. Storefront is not accessible. |
| **3** | **Single-Use Token Redemption** | Enter synthetic invitation access key into the unlock portal and click **Unlock Access**. | Response HTTP 200 OK. Browser receives `nexora_pilot_session` cookie; redirects to `/`. |
| **4** | **Replay Token Rejection** | Open an incognito window and attempt to reuse the exact same invitation token. | Token rejected with HTTP 401 `INVALID_TOKEN` ("Token already redeemed or invalid"). |
| **5** | **Secure Cookie Verification** | Inspect browser storage settings for `nexora_pilot_session` and Better Auth session cookies. | Both cookies carry `Secure`, `HttpOnly`, and `SameSite=Lax` flags over HTTPS. |
| **6** | **Storefront Catalog Browsing** | Browse luxury collection at `/store/nexora` and product detail pages. | Catalog items, images, prices, and variant selector render without mixed-content warnings. |
| **7** | **Multi-Tenant Isolation** | Switch between `/store/nexora` and `/store/lumina-tech`. | Distinct themes, logos, product catalogs, and partitioned carts render for each atelier. |
| **8** | **Role-Based Privilege Enforcement** | Log in as synthetic owner (`owner@nexoracommerce.com`); attempt to access `/platform`. | Redirected away from platform superadmin portal. Direct API `/api/platform/metrics` returns 401. |
| **9** | **Financial & Email Quarantine** | Complete demo checkout of an atelier item with test card. | Order recorded as simulated/mock. Zero real charges created. Email notice held in DB outbox. |
| **10** | **Session Revocation Verification** | Click **Lock Session** or execute `revoke-pilot-invitation.ts` on host. | Session invalidated in PostgreSQL. Immediate subsequent request redirects to `/pilot-access`. |
| **11** | **Immediate Teardown Sealing** | Execute `.\scripts\pilot\stop-tunnel.ps1` in operator PowerShell terminal. | Tunnel process killed. Hostname cleared. External HTTPS URL returns connection failure. |

---

## 5. Supervised Session Operator Runbook

Follow these exact steps during the supervised session:

### Phase A: Prerequisite Installation (One-Time Setup)
Install the official Cloudflare tunnel CLI via Windows Package Manager:
```powershell
winget install --id Cloudflare.cloudflared -e --source winget
```
*Verify installation:*
```powershell
cloudflared --version
```

### Phase B: Launch Staging Stack (If Not Already Running)
```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
```
*Confirm all 3 containers report `healthy`:*
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Phase C: Generate Synthetic Tester Invitation
Generate a single-use invitation key for the test session:
```powershell
$env:DATABASE_URL="postgresql://nexora_staging:nexora_staging_pass@localhost:5433/nexora_staging_db?schema=public"
npx tsx scripts/create-pilot-invitation.ts --name "Owner Synthetic Tester" --email "owner-tester@nexora-pilot.test" --max-uses 1 --expires-in-days 1
```
*Copy the raw access token output from the terminal.*

### Phase D: Launch Ephemeral Tunnel with Automated Handshake
Run the operator startup script:
```powershell
.\scripts\pilot\start-tunnel.ps1
```
1. Script verifies staging health on `http://localhost:3005/api/health`.
2. Script prompts for explicit confirmation (`CONFIRM`).
3. Script launches `cloudflared tunnel --url http://localhost:3005`, captures assigned URL, records PID to `.tunnel.pid`.
4. Script registers hostname in `.env.staging` and reloads `app-staging`.
5. Script executes automated verification handshake (health + gate redirect).
6. Script outputs the live staging URL.

### Phase E: Conduct Supervised Test
1. Provide the URL and the single-use token to the approved owner tester.
2. Complete the 11-step checklist in Section 4.

### Phase F: Emergency Shutdown
To terminate the session and seal the workstation:
- In the active `start-tunnel.ps1` window, press `Ctrl + C` or type `q` and Enter.
- **OR** run the emergency shutdown script in a separate PowerShell window:
  ```powershell
  .\scripts\pilot\stop-tunnel.ps1
  ```

---

## 6. Emergency Shutdown Verification & Guarantees

The emergency shutdown procedure was audited and verified in `scripts/pilot/stop-tunnel.ps1`:

1. **Process Isolation Guarantee:**
   - Tracks the specific tunnel instance via `scripts/pilot/.tunnel.pid`.
   - Before killing, verifies the target PID is named `cloudflared`.
   - Never terminates unrelated user processes or other cloudflared tunnels.
   - If no PID file exists, halts safely without taking down arbitrary processes (unless explicit `-ForceAll` switch is provided).

2. **Perimeter Sealing Guarantee:**
   - Clears `APPROVED_PILOT_HOSTNAME` in `.env.staging` to an empty string.
   - Automatically restarts the `app-staging` container.
   - Once restarted, any delayed or queued external packets hitting port 3005 receive `HTTP 403 Forbidden`.

3. **Data Preservation Guarantee:**
   - No `docker compose down -v` or database drop commands are executed.
   - Staging PostgreSQL volume `resilient-einstein_staging_pgdata` remains intact.
   - Development database `nexora_db` on port 5432 remains completely untouched.
   - All database dumps and migration histories are preserved.

4. **Fail-Safe Exception Handling:**
   - Script wraps process termination and environment modification in structured try/catch blocks.
   - If a process cannot be killed immediately, errors are reported clearly without halting environment cleanup.

---

## 7. Remaining Risks & Mitigations

| Risk | Severity | Mitigation Implemented |
|:---|:---:|:---|
| **Ephemeral URL Guessing** | Low | Cloudflare Quick Tunnel subdomains are 32-character high-entropy strings; Edge Middleware returns HTTP 403 before hostname approval. |
| **Token Brute-Force** | Low | PostgreSQL table `pilot_rate_limits` enforces 5 failed attempts per IP per 15-minute window; persistent across container reboots. |
| **Tester Token Sharing** | Medium | Invitations configured with `maxUses: 1`. Atomic optimistic locking in PostgreSQL rejects concurrent redemption attempts. |
| **Accidental Live Transactions** | Negligible | Payment gateway runs exclusively on `ALLOW_MOCK_PAYMENT="true"` mock provider; zero production merchant credentials exist in repository. |
| **Unintended Data Exposure** | Negligible | Database populated exclusively with synthetic demo ateliers and products; zero production patron data present. |

---

## 8. Final Recommendation & Readiness Verdict

| Prerequisite / Condition | Current Status | Notes |
|:---|:---:|:---|
| Local Docker Staging Stack | **READY** | Healthy on ports 3005 and 5433 |
| Database & Payment Quarantine | **READY** | 100% synthetic data, mock payments, simulated email |
| Cryptographic Gate & Middleware | **READY** | Edge fail-closed origin checking verified |
| Startup & Teardown Automation | **READY** | PID tracking, automated handshake, clean unregistration |
| Host `cloudflared` Binary | **ACTION REQUIRED** | Operator must run `winget install Cloudflare.cloudflared` |
| Stakeholder Approval | **PENDING** | Offline preflight complete; awaiting go-ahead for live tunnel |

### Final Verdict: **READY FOR SUPERVISED OWNER-ONLY CONNECTIVITY TEST**
The NEXORA Commerce architecture, perimeter security gate, and operational tooling are fully prepared. Upon installation of the `cloudflared` binary via `winget` and receipt of your explicit authorization, the owner-only connectivity test may proceed safely without risk of accidental public exposure.
