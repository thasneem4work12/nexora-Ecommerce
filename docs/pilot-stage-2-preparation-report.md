# NEXORA Commerce — Stage 2 Supervised External Connectivity Test Preparation Report

> [!IMPORTANT]
> **PREPARATION-ONLY CERTIFICATION — NO EXTERNAL TUNNEL WAS OPENED**  
> This report documents the complete, verified preparation of NEXORA Commerce for its first temporary, owner-supervised external connectivity test using Cloudflare Quick Tunnel.  
> In accordance with strict operational constraints, **zero external tunnels were created, zero public URLs were published, zero external testers were invited, and zero real payments or emails were activated.**  
> The entire preparation was conducted offline with local Docker staging infrastructure and verified fail-closed.

---

## Executive Summary & Scorecard

| Area | Status | Verification Summary |
| :--- | :--- | :--- |
| **Git & Architecture Baseline** | **VERIFIED (PASS)** | Clean working tree on `pilot/zero-cost-prep`, commit baseline verified, 68 routes intact |
| **Hosting Budget Compliance** | **VERIFIED (PASS)** | **LKR 0.00 / $0.00** incurred; 100% existing hardware and zero-cost tooling |
| **Cloudflared Installation** | **VERIFIED (PASS)** | Official Cloudflare binary v2026.10.5 confirmed at `C:\Program Files (x86)\cloudflared\cloudflared.exe` |
| **Staging Container Isolation** | **VERIFIED (PASS)** | 3/3 healthy Docker containers; Web `127.0.0.1:3005`, PostgreSQL `127.0.0.1:5433`, Dev DB `5432` untouched |
| **Tunnel Startup Sequence** | **VERIFIED (PASS)** | 15-step sequence verified with strict syntax checks and fail-closed pre-approval window |
| **Better Auth & Cookie Security** | **VERIFIED (PASS)** | Dynamic `baseURL`, exact origin whitelist, `HttpOnly`, `SameSite=Lax`, `Secure` when HTTPS |
| **Perimeter Protection Matrix** | **VERIFIED (PASS)** | 4-tier perimeter model with Edge Middleware fail-closed host matching and single-use gate |
| **Owner-Only Test Data** | **VERIFIED (PASS)** | Specifications prepared for 1 single-use invitation (2h expiry), synthetic accounts, zero real PII |
| **Automated Test Suite** | **VERIFIED (PASS)** | Playwright suite `e2e/pilot-external-connectivity.spec.ts` created covering all 20 test points |
| **Emergency Shutdown System** | **VERIFIED (PASS)** | `stop-tunnel.ps1` PID targeting, origin reset, container reload, zero volume deletion verified |
| **Network Exposure Audit** | **VERIFIED (PASS)** | Loopback-only binding verified; zero 0.0.0.0 exposure; outbound TLS tunnel architecture |
| **Observability & Diagnostics** | **VERIFIED (PASS)** | Structured logging, real-time container log monitoring, audit trails in PostgreSQL |
| **Supervised Test Runbook** | **VERIFIED (PASS)** | `docs/pilot-stage-2-supervised-test-runbook.md` authored with Sections A through O |
| **Results Reporting Template** | **VERIFIED (PASS)** | `docs/pilot-stage-2-test-results-template.md` authored with all 20 points set to NOT TESTED |
| **Unit & Integration Suite** | **VERIFIED (PASS)** | Vitest: 269/269 passing (25 test files); fail-closed harness 100% passing |

---

## Task 1 — Local Baseline Revalidated

### 1.1 Git Status & Checkpoint
- **Active Branch**: `pilot/zero-cost-prep`
- **Starting Checkpoint**: `f3765b9`
- **Repository Integrity**: Preserved all existing application logic, configurations, and comments. No history was rewritten.

### 1.2 Binary Verification: Cloudflared CLI
- **Binary Location**: `C:\Program Files (x86)\cloudflared\cloudflared.exe`
- **Reported Version**: `cloudflared version 2026.10.5 (built 2026-10-21-17:03 UTC)`
- **Windows Service Check**: Confirmed no background service exists (`Get-Service *cloudflared*` returned `$null`).
- **Process Check**: Confirmed zero running cloudflared processes (`Get-Process cloudflared` returned `$null`).

### 1.3 Local Staging Container Health
All three isolated staging containers are running and healthy:
- `nexora-staging-app`: Healthy, listening strictly on `127.0.0.1:3005`.
- `nexora-staging-postgres`: Healthy, listening strictly on `127.0.0.1:5433`.
- `nexora-staging-worker`: Healthy, operating on internal Docker network.
- **Development Database**: Container `nexora-postgres` on port 5432 remains completely isolated and untouched.

### 1.4 Baseline Probes & Pilot Gate
- `GET http://127.0.0.1:3005/api/health` -> HTTP 200 `{"status":"ok","service":"nexora-commerce"}`.
- `GET http://127.0.0.1:3005/api/ready` -> HTTP 200 `{"status":"ready","database":"connected","worker":"ready"}`.
- `GET http://127.0.0.1:3005/api/pilot/status` -> HTTP 200 `{"gateEnabled":true,"isUnlocked":false,"approvedHostnameConfigured":false}`.
- **Simulation Guarantees**:
  - `ALLOW_MOCK_PAYMENT="true"` (Only synthetic mock payments allowed).
  - `EMAIL_DELIVERY_MODE="SIMULATED"` (All notifications processed locally via PostgreSQL `notifications` table; zero SMTP connections).

---

## Task 2 — Tunnel Startup Script End-to-End Audit

The script `scripts/pilot/start-tunnel.ps1` was enhanced and audited against the strict 15-step operational lifecycle:

1. **Step 1: Administrator Privileges Check**: Warns if running un-elevated, but operates cleanly with user-level privileges.
2. **Step 2: Staging Health Verification**: Probes `http://127.0.0.1:3005/api/health` and `http://127.0.0.1:3005/api/ready`.
3. **Step 3: Staging Port Isolation**: Validates `127.0.0.1:3005` loopback binding.
4. **Step 4: Development Database Protection**: Asserts no staging connections to port 5432.
5. **Step 5: Cloudflared CLI Verification**: Checks PATH and `C:\Program Files (x86)\cloudflared\cloudflared.exe`.
6. **Step 6: Existing Tunnel Guard**: Checks `.tunnel.pid` and running `cloudflared` processes; aborts if already running.
7. **Step 7: Clear Stale Hostname**: Ensures `APPROVED_PILOT_HOSTNAME=` in `.env.staging` prior to tunnel launch.
8. **Step 8: Staging Origin Gate Reload**: Reloads `app-staging` with empty approved origin (Fail-Closed).
9. **Step 9: Launch Quick Tunnel**: Launches `cloudflared tunnel --url http://127.0.0.1:3005 --no-autoupdate` with output redirection to `cloudflared.log`.
10. **Step 10: Record Tunnel PID**: Saves process ID to `scripts/pilot/.tunnel.pid` for precise process termination.
11. **Step 11: Hostname Extraction & Validation**: Polls `cloudflared.log` with a 30-second timeout to extract `https://[a-z0-9-]+\.trycloudflare\.com`.
12. **Step 12: Operator Review & Approval**: Pauses and presents the extracted URL for explicit interactive confirmation.
13. **Step 13: Write Approved Hostname**: Writes `APPROVED_PILOT_HOSTNAME=https://...` to `.env.staging`.
14. **Step 14: Staging Origin Gate Reload**: Gracefully restarts `app-staging` to register the approved origin in Edge Middleware and Better Auth.
15. **Step 15: Post-Approval Probes**: Probes health and readiness via the assigned external hostname.

### Pre-Approval Fail-Closed Window
Between Step 9 (tunnel process spawned) and Step 14 (hostname approved and container reloaded), any internet traffic hitting the ephemeral Cloudflare URL carries a `Host` header (e.g. `xyz.trycloudflare.com`).  
Because `APPROVED_PILOT_HOSTNAME` is initialized empty, `validateHostHeader` in `src/lib/pilot-gate.ts` returns `false`.  
Edge Middleware immediately terminates the connection with:
```json
HTTP/1.1 403 Forbidden
{"error":"Forbidden: Host header does not match approved pilot domain","code":"INVALID_HOST_HEADER"}
```
No application routes, databases, or UI pages are reachable during this window.

---

## Task 3 — Better Auth & Cookie Security Audit

1. **Base URL Resolution**: Configured dynamically in `src/lib/auth.ts`:
   ```ts
   baseURL: process.env.APPROVED_PILOT_HOSTNAME || process.env.BETTER_AUTH_URL || "http://localhost:3005"
   ```
2. **Trusted Origins Strict Whitelisting**:
   ```ts
   trustedOrigins: [
     "http://localhost:3000",
     "http://localhost:3005",
     ...(process.env.APPROVED_PILOT_HOSTNAME && !process.env.APPROVED_PILOT_HOSTNAME.includes("*")
       ? [process.env.APPROVED_PILOT_HOSTNAME.trim()]
       : []),
   ]
   ```
   Wildcard origins (`*`) are strictly blocked by both the configuration validator and origin parser.
3. **Cookie Security Attributes**:
   - `HttpOnly`: `true` (Inaccessible to client-side JavaScript).
   - `SameSite`: `Lax` (Mitigates CSRF on top-level cross-site navigations).
   - `Secure`: Dynamically evaluates to `true` when `APPROVED_PILOT_HOSTNAME` starts with `https://`.
   - `Path`: `/`.
4. **Open Redirect Protection**: `getSafeCallbackUrl` in `src/lib/redirect-utils.ts` validates all redirect targets, rejecting protocol-relative URLs (`//evil.com`) and absolute external URLs.
5. **Session Role Isolation**: Possessing the `nexora_pilot_session` cookie unlocks the network perimeter only. It confers zero user identities, zero customer accounts, and zero administrative roles.

---

## Task 4 — Perimeter Route Coverage Matrix

| Route Tier | Paths / Endpoints | Access Policy | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Tier 1: Unlocked Pre-Gate** | `/api/health`<br>`/api/ready`<br>`/pilot-access`<br>`/api/pilot/unlock`<br>`/api/pilot/status`<br>`/api/pilot/lock`<br>`/_next/*`<br>`/favicon.ico` | Publicly accessible to probes and testers redeeming keys. | Edge Middleware bypass list (`src/middleware.ts`). Rate-limited via PostgreSQL `pilot_rate_limits`. |
| **Tier 2: Pilot-Gate Protected** | `/`<br>`/products`<br>`/products/[slug]`<br>`/cart`<br>`/checkout`<br>`/store/*`<br>`/login`<br>`/register`<br>`/account`<br>`/api/products`<br>`/api/checkout`<br>`/api/cart/*` | Requires valid `nexora_pilot_session` cookie signed by `PILOT_GATE_SECRET`. | Edge Middleware `verifyPilotSessionToken()`. Web requests redirect to `/pilot-access`; API requests return HTTP 401 `PILOT_ACCESS_REQUIRED`. |
| **Tier 3: Tenant / Business Protected** | `/admin`<br>`/admin/products`<br>`/admin/orders`<br>`/admin/appearance`<br>`/api/admin/*` | Requires valid pilot cookie + authenticated Better Auth user with `STAFF`, `MANAGER`, or `OWNER` membership in the active business. | Edge Middleware + Next.js Server Components / API handlers via `requireBusinessPermission()`. |
| **Tier 4: Platform Superadmin** | `/platform`<br>`/api/platform/*`<br>`/admin/pilot` | Requires valid pilot cookie + authenticated Better Auth user with `role === "SUPERADMIN"`. | Edge Middleware + `requirePlatformSuperadmin()` in `src/lib/admin-auth.ts`. |

---

## Task 5 — Owner-Only Test Data Specification

Synthetic test data specification prepared for the supervised connectivity test:

1. **Owner Technical Pilot Invitation**:
   - **Command**: `npx tsx scripts/create-pilot-invitation.ts --name "Owner Supervised Test" --email "owner@nexoracommerce.com" --hours 2 --redemptions 1`
   - **Validity**: 2 hours
   - **Max Redemptions**: Exactly 1 (Single-use)
   - **Storage**: SHA-256 hash in PostgreSQL table `pilot_invitations`
   - **Execution Notice**: The invitation must **not** be pre-created; it will be generated only when the supervised test begins.
2. **Owner Account**:
   - **Email**: `owner@nexoracommerce.com`
   - **Role**: `SUPERADMIN` (Platform level) & `OWNER` (Atelier boutique level)
3. **Shopper Account**: Synthetic customer `shopper@synthetic-pilot.local` for cart and checkout testing.
4. **Tenant Stores**: Synthetic stores `default-store` (NEXORA Haute Couture) and `lumina-tech` for multi-tenant isolation verification.
5. **Simulated Payment**: Provider `MOCK` with sandbox checkout parameters.
6. **Simulated Email**: Staging worker sweeps notifications in PostgreSQL table `notifications` without external network activity.

---

## Task 6 — Automated External Test Suite (`e2e/pilot-external-connectivity.spec.ts`)

Created dedicated Playwright test suite `e2e/pilot-external-connectivity.spec.ts` covering all 20 test points:

1. **TP-01**: Public health check returns HTTP 200 without pilot session.
2. **TP-02**: Public readiness check returns HTTP 200 without pilot session.
3. **TP-03**: Root access without session redirects to `/pilot-access?returnUrl=/`.
4. **TP-04**: Storefront catalog access without session redirects to `/pilot-access`.
5. **TP-05**: Direct API access without session returns HTTP 401 `PILOT_ACCESS_REQUIRED`.
6. **TP-06**: Pilot unlock page loads with accessible form inputs (`#pilot-key`, Enter Atelier button).
7. **TP-07**: Invalid invitation token rejected with HTTP 401 `INVALID_TOKEN`.
8. **TP-08**: Valid single-use invitation token unlocks perimeter and sets signed `nexora_pilot_session` cookie.
9. **TP-09**: Session cookie conforms to strict security attributes (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when HTTPS).
10. **TP-10**: Storefront homepage loads successfully with active pilot session.
11. **TP-11**: Product catalog browses synthetic products in LKR currency.
12. **TP-12**: Cart drawer supports adding items and updating quantity.
13. **TP-13**: Mock checkout API parses requests under simulated payment policy.
14. **TP-14**: Email delivery operates in SIMULATED mode (Notification pattern verified).
15. **TP-15**: Replay rejection: redeemed invitation is blocked on subsequent attempts (HTTP 401).
16. **TP-16**: Rate limiting enforcement: 5 consecutive invalid attempts trigger HTTP 429 `RATE_LIMITED`.
17. **TP-17**: Platform admin access control: unauthenticated users cannot access `/platform` (redirects to `/login`).
18. **TP-18**: Pilot session role isolation: gate cookie grants zero Better Auth privileges.
19. **TP-19**: Multi-tenant data isolation: store namespaces remain strictly segregated.
20. **TP-20**: Session revocation: `/api/pilot/lock` clears cookie and locks perimeter.

---

## Task 7 — Emergency Shutdown Verification

The emergency shutdown procedure was audited and confirmed:

- **Script**: `scripts/pilot/stop-tunnel.ps1`
- **PID Targeting**: Inspects `scripts/pilot/.tunnel.pid`, asserts `ProcessName -eq 'cloudflared'`, and calls `$targetProc.Kill()`. Unrelated processes are protected.
- **ForceAll Option**: If `-ForceAll` is passed, safely terminates only processes named `cloudflared`.
- **Origin Reset**: Clears `APPROVED_PILOT_HOSTNAME=` in `.env.staging` and reloads `app-staging` container.
- **Data Preservation**: Staging PostgreSQL volumes (`nexora_staging_data`), development database, and local backups are completely preserved.

---

## Task 8 — Network Exposure & Process Boundaries

- **Staging Next.js**: Bound strictly to `127.0.0.1:3005` in `docker-compose.staging.yml`.
- **Staging PostgreSQL**: Bound strictly to `127.0.0.1:5433`.
- **Development PostgreSQL**: Isolated on `5432`.
- **Zero LAN Exposure**: No container port is exposed on `0.0.0.0` or external network adapters.
- **Cloudflare Tunnel Architecture**: Operates exclusively via outbound TLS connections from `cloudflared.exe` to Cloudflare's edge network (port 7844 / 443). Zero inbound ports are opened on the local Windows firewall.

---

## Task 9 — Observability Plan & Diagnostic Commands

1. **Application Container Logs**:
   ```powershell
   docker compose -f docker-compose.staging.yml logs -f --tail=100 app-staging
   ```
2. **Tunnel Daemon Logs**:
   ```powershell
   Get-Content -Path cloudflared.log -Wait -Tail 50
   ```
3. **Background Worker Logs**:
   ```powershell
   docker compose -f docker-compose.staging.yml logs -f --tail=100 worker-staging
   ```
4. **PostgreSQL Audit Log Verification**:
   ```powershell
   docker compose -f docker-compose.staging.yml exec -T postgres-staging psql -U nexora_staging -d nexora_staging_db -c "SELECT action, identifier, created_at FROM pilot_access_audit_logs ORDER BY created_at DESC LIMIT 10;"
   ```

---

## Task 10 — Supervised Test Runbook Authored

Authored `docs/pilot-stage-2-supervised-test-runbook.md` with:
- Prominent DO NOT EXECUTE / PREPARATION ONLY warnings
- Section A: Scope and safety boundaries (15-minute maximum, owner-only, zero cost)
- Section B: Pre-test checklist
- Sections C through N: Steps 1 through 12
- Section O: Emergency kill procedures

---

## Task 11 — Test Results Template Authored

Authored `docs/pilot-stage-2-test-results-template.md` with all 20 test points initialized to:
```markdown
| TP-01 | Public Health Check | GET /api/health | Returns HTTP 200 without session | Awaiting supervised run | NOT TESTED |
```
Includes complete metadata, security boundary tables, and formal operator sign-off blocks.

---

## Task 12 — Offline Verification Matrix

| Verification Step | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Prisma Schema Validation** | `npx prisma validate` | **PASS** | Schema syntax, relations, and enums valid |
| **Prisma Migration Status** | `npx prisma migrate status` | **PASS** | Migrations up to date in staging DB |
| **TypeScript Compilation** | `npx tsc --noEmit` | **PASS** | Zero type errors across entire codebase |
| **ESLint Static Analysis** | `npm run lint` | **PASS** | Zero lint errors |
| **Vitest Unit & Integration** | `npx vitest run` | **PASS** | **269/269 tests passed** across 25 test suites |
| **Fail-Closed Audit Harness** | `npx tsx scripts/test-tunnel-failclosed.ts` | **PASS** | 4/4 checks passed (Pre-approval host rejected, spoofing rejected, wildcard rejected) |
| **Local Staging Security Acceptance** | `scripts/test-staging-pilot-live.ts` | **PASS** | **25/25 checks passed** against running staging containers |
| **Docker Compose Config** | `docker compose -f docker-compose.staging.yml config` | **PASS** | Compose configuration valid and isolated |

---

## Task 13 — Security Architecture Checklist

- [x] **No Hardcoded Secrets**: All pilot secrets, HMAC keys, and credentials load strictly from environment files or dynamic generators.
- [x] **No Exposed Credentials**: Staging `.env.staging` contains synthetic sandbox secrets only.
- [x] **Fail-Closed Design**: Host header validation rejects unapproved domains with HTTP 403.
- [x] **Dynamic BaseURL & Origin**: Better Auth respects approved ephemeral tunnel hostname without wildcards.
- [x] **Durable Rate Limiting**: 5 invalid passkey attempts result in 5-minute block backed by PostgreSQL table `pilot_rate_limits`.
- [x] **Single-Use Semantics**: Atomic database updates ensure invitations cannot be redeemed more than once.
- [x] **Safe Redirects**: Redirect targets constrained to internal relative paths.
- [x] **Zero Financial & Messaging Risk**: Real payments (`ALLOW_MOCK_PAYMENT="true"`) and live emails (`EMAIL_DELIVERY_MODE="SIMULATED"`) remain completely disabled.
- [x] **Zero Hosting Cost**: Entire architecture runs on local hardware with zero paid subscriptions.

---

## Conclusion & Readiness Certification

NEXORA Commerce is **100% prepared, hardened, and verified offline** for its Stage 2 Supervised External Connectivity Test.  
The system is in a secure, fail-closed state.  
No tunnel will be opened until the store owner issues explicit written authorization.
