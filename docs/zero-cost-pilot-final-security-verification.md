# NEXORA Commerce — Zero-Cost Pilot Final Security Verification Report

**Verification Date**: October 28, 2026  
**Infrastructure Target**: Local Windows 11 Workstation + Isolated Docker Compose + Cloudflare Quick Tunnel  
**Operating Budget**: Exactly LKR 0.00 / month ($0.00 USD)  
**Security Classification**: Confidential — Technical Pilot Security Audit  
**Current Checkpoint**: Commit tagged `zero-cost-pilot-security-verified`  
**Test Suite Verdict**: **269 / 269 Vitest passed (100%)** | **30 / 30 Playwright passed (100%)** | **68 Routes Built**  

---

## 1. Executive Summary & Verification Verdict

Prior to opening any external network tunnel for the zero-cost technical pilot, a comprehensive security, architecture, and threat-modeling audit was performed on NEXORA Commerce.

All remaining external-access security concerns identified in previous checkpoints have been systematically eliminated and verified:

1. **Compromised Secret Rotation Complete**: The previously exposed static passkeys (`pilot_luxury_demo_2026`, `pilot_partner_tech_2026`) were completely excised from source files, documentation, environment templates, and container configurations. All legacy 2-part session tokens are invalidated.
2. **Individual, Revocable Pilot Access (PostgreSQL)**: Replaced the static passkey approach with individual single-use invitation tokens (`nxr_pilot_<random>`) stored at rest as SHA-256 hashes in PostgreSQL. Full lifecycle tracking (redemption timestamp, IP address, user-agent) and instant administrative revocation are enforced.
3. **Strict Decoupling from Authentication Roles**: Unlocking the pilot gate satisfies only the network perimeter gate. It conveys **zero** Better Auth permissions and never grants `CUSTOMER`, `STAFF`, `OWNER`, or `SUPERADMIN` access.
4. **Durable PostgreSQL Rate Limiting**: Brute-force protection is backed by the database (`pilot_rate_limits`). 5 failed unlock attempts within 5 minutes automatically trigger a 5-minute block (HTTP 429). Identical generic error responses eliminate user enumeration.
5. **Fail-Closed Tunnel Startup & Handshake**: `scripts/pilot/start-tunnel.ps1` automates URL acquisition, regex validation, origin registration, and an active **Safe Origin Verification Handshake** (verifying health probe, gate redirection, and spoofed host rejection) before exposing traffic. If any check fails, the tunnel process is immediately killed.
6. **Cloudflare Edge Privacy Review**: Thoroughly documented that Cloudflare Quick Tunnels terminate TLS at Cloudflare's edge network. Enforced that only synthetic data and sandbox payments are utilized, and confirmed PostgreSQL, Docker sockets, and host files are never tunneled.
7. **Complete Regression Verification**: 269 Vitest tests passed, 30 Playwright tests passed, 68 Next.js routes compiled cleanly, and 10 Prisma migrations deployed without drift.

---

## 2. Task 1 — Secret Rotation & Git Remediation Analysis

### 2.1 Complete Removal of Exposed Passkeys
A comprehensive repository search (`git grep`) was conducted for the literal strings `pilot_luxury_demo_2026` and `pilot_partner_tech_2026`.
- **Source Code**: Removed fallback defaults in `src/lib/pilot-gate.ts`.
- **Environment Templates**: Removed `PILOT_ACCESS_KEYS` from `.env.staging.example` and replaced with instructions for `PILOT_GATE_SECRET`.
- **Docker Compose**: Removed `PILOT_ACCESS_KEYS` from `docker-compose.staging.yml`.
- **Documentation**: Updated `docs/zero-cost-pilot-guide.md` and `docs/pilot-monitoring-guide.md` to reference the individual CLI issuance workflow (`npm run pilot:invite`).
- **UI Placeholders**: Updated `src/app/pilot-access/page.tsx` input placeholder to `e.g. nxr_pilot_...`.

### 2.2 Invalidation of Old Sessions
The session token format was upgraded from a 2-part string (`payload.signature`) to a 4-part cryptographically bound format:
$$\text{token} = \text{sessionId} \mathbin{\Vert} \text{rawSessionSecret} \mathbin{\Vert} \text{expiresAtMs} \mathbin{\Vert} \text{HMAC-SHA256}(\text{signingSecret}, \text{sessionId} \mathbin{\Vert} \text{rawSessionSecret} \mathbin{\Vert} \text{expiresAtMs})$$

Any legacy session token attempting authentication against the updated validator immediately fails signature and format checks.

### 2.3 Git History Remediation Analysis
- Commit `113c951` in the development branch `pilot/zero-cost-prep` contains the prototype static passkeys.
- **Risk Assessment**: The repository is currently hosted locally and has not been pushed to any public remote. The compromised passkeys have been rendered completely inert by database-backed token lookups (the database contains no records matching the old passkeys, and static key validation code has been eliminated).
- **Remediation Recommendation**: Before pushing this branch to any public or multi-user upstream repository, the branch should either be squashed or rewritten using `git-filter-repo` to permanently erase the historical string references.

---

## 3. Task 2 — Individual Revocable Pilot Access Architecture

### 3.1 Database Schema & Models
Four purpose-built models were added to `prisma/schema.prisma` in migration `20261028150000_add_pilot_access_control`:

```prisma
model PilotInvitation {
  id              String                @id @default(cuid())
  tokenHash       String                @unique @map("token_hash")
  testerName      String                @map("tester_name")
  testerEmail     String?               @map("tester_email")
  testerRole      String                @default("EXTERNAL_TESTER") @map("tester_role")
  status          PilotInvitationStatus @default(ACTIVE)
  expiresAt       DateTime              @map("expires_at")
  maxRedemptions  Int                   @default(1) @map("max_redemptions")
  redemptionCount Int                   @default(0) @map("redemption_count")
  lastRedeemedAt  DateTime?             @map("last_redeemed_at")
  lastRedeemedIp  String?               @map("last_redeemed_ip")
  revokedAt       DateTime?             @map("revoked_at")
  revokedReason   String?               @map("revoked_reason")
  createdBy       String                @default("system") @map("created_by")
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")
  sessions        PilotSession[]
  auditLogs       PilotAccessAuditLog[]

  @@index([status, expiresAt])
  @@map("pilot_invitations")
}

model PilotSession {
  id               String             @id @default(cuid())
  invitationId     String             @map("invitation_id")
  sessionTokenHash String             @map("session_token_hash")
  testerName       String             @map("tester_name")
  ipAddress        String?            @map("ip_address")
  userAgent        String?            @map("user_agent")
  status           PilotSessionStatus @default(ACTIVE)
  expiresAt        DateTime           @map("expires_at")
  lastActiveAt     DateTime           @default(now()) @map("last_active_at")
  revokedAt        DateTime?          @map("revoked_at")
  createdAt        DateTime           @default(now()) @map("created_at")
  invitation       PilotInvitation    @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  auditLogs        PilotAccessAuditLog[]

  @@index([invitationId, status])
  @@map("pilot_sessions")
}
```

### 3.2 Token Issuance & Cryptographic Hashing
- Invitation tokens are generated via Node `crypto.randomBytes(24)` with prefix `nxr_pilot_` (192 bits of cryptographic entropy).
- Only the SHA-256 digest (`hashToken(token)`) is persisted in PostgreSQL.
- The raw plaintext token is displayed once to the administrator for secure transmission to the tester.

### 3.3 Atomic Redemption & Replay Defense
Token redemption is executed inside a PostgreSQL `prisma.$transaction`:
1. Looks up the invitation by `tokenHash`.
2. Verifies status is `ACTIVE`, `expiresAt > now`, and `redemptionCount < maxRedemptions`.
3. Atomically increments `redemptionCount`. If `redemptionCount >= maxRedemptions`, status is updated to `REDEEMED`.
4. Creates a `PilotSession` record with a distinct 256-bit session secret and 24-hour expiration.
5. Emits an audit event `INVITATION_REDEEMED`.
6. Generates a signed, HttpOnly, SameSite=Lax cookie.
7. Any replay attempt using the same token fails immediately with HTTP 401.

### 3.4 Decoupling from Application Roles
- The pilot perimeter gate and Better Auth authentication are completely distinct:
  - Perimeter Gate Cookie: `nexora_pilot_session`
  - Better Auth Session Cookie: `better-auth.session_token`
- Entering a valid pilot invitation token grants entry through the Cloudflare/staging reverse proxy. It does **not** authenticate the user as a registered customer, store manager, or platform superadmin.
- Accessing `/platform/...` or `/admin/...` still requires authenticating with a valid Better Auth account possessing authoritative role credentials (`SUPERADMIN` or `OWNER`).

---

## 4. Task 3 — Durable Rate Limiting & Tamper Prevention

### 4.1 PostgreSQL-Backed Rate Limiting
To prevent brute-force attacks across application restarts or multi-instance staging deployments, rate limits are persisted in PostgreSQL:

```prisma
model PilotRateLimit {
  id             String    @id @default(cuid())
  identifier     String    @unique
  failedAttempts Int       @default(0) @map("failed_attempts")
  firstAttemptAt DateTime  @default(now()) @map("first_attempt_at")
  lastAttemptAt  DateTime  @default(now()) @map("last_attempt_at")
  blockedUntil   DateTime? @map("blocked_until")

  @@index([identifier, blockedUntil])
  @@map("pilot_rate_limits")
}
```

### 4.2 Throttling Policy
- **Threshold**: 5 failed unlock attempts from the same IP identifier (`ip:<address>`) within a 5-minute rolling window.
- **Penalty**: Blocks subsequent requests for 5 minutes (`blockedUntil = now + 5 min`).
- **Response**: Returns HTTP 429 with JSON:
  ```json
  {
    "error": "Too many failed unlock attempts. Please wait 5 minutes before trying again.",
    "code": "RATE_LIMITED"
  }
  ```
- **Reset**: A successful token redemption automatically removes the IP rate-limit record.

### 4.3 Zero User Enumeration
All failed redemption attempts (whether the token never existed, was expired, was revoked, or was already redeemed) return the exact same generic error:
```json
{
  "error": "Invalid or expired pilot access token. Please verify your invitation.",
  "code": "INVALID_TOKEN"
}
```
Attackers cannot determine whether a token was previously valid or has been issued to another tester.

---

## 5. Task 4 — Fail-Closed Tunnel Startup Workflow

### 5.1 Architecture of `start-tunnel.ps1`
The updated operator script in `scripts/pilot/start-tunnel.ps1` enforces a fail-closed lifecycle:

```mermaid
flowchart TD
    A["Operator runs start-tunnel.ps1"] --> B{"Pre-Flight Check:<br/>Local app healthy?<br/>PILOT_ACCESS_GATE_ENABLED=true?"}
    B -- No --> C["SECURITY HALT:<br/>Abort startup, tunnel NOT opened"]
    B -- Yes --> D["Prompt for CONFIRM token"]
    D --> E["Spawn cloudflared process"]
    E --> F["Extract https://*.trycloudflare.com URL"]
    F --> G{"Regex Check:<br/>Strict trycloudflare.com<br/>No wildcards?"}
    G -- Invalid --> H["SECURITY ABORT:<br/>Kill cloudflared immediately"]
    G -- Valid --> I["Register APPROVED_PILOT_HOSTNAME<br/>Restart app-staging container"]
    I --> J{"Safe Verification Handshake:<br/>1. /api/health returns 200 via tunnel?<br/>2. Unauthenticated root redirects to /pilot-access?<br/>3. Spoofed host returns 403?"}
    J -- Failed --> H
    J -- Passed --> K["SAFE HANDSHAKE PASSED:<br/>Tunnel active & protected"]
    K --> L["Operator presses Ctrl+C / 'q'"]
    L --> M["Fail-Closed Teardown:<br/>Kill cloudflared<br/>Clear APPROVED_PILOT_HOSTNAME<br/>Restart app-staging"]
```

### 5.2 Verification Handshake Evidence
During the handshake:
1. **Connectivity Probe**: Performs HTTP GET to `$allocatedUrl/api/health`. Asserts `status === "ok"`.
2. **Perimeter Probe**: Performs HTTP GET to `$allocatedUrl/` without cookies. Asserts redirection HTTP 307/302 to `/pilot-access`.
3. **Host Header Validation**: Asserts unauthorized Host headers receive HTTP 403 Forbidden (`INVALID_HOST_HEADER`).
4. Any failure immediately calls `$tunnelProcess.Kill()`, wipes `APPROVED_PILOT_HOSTNAME`, and restores origin isolation.

---

## 6. Task 5 — Middleware & API Security Audit

The perimeter security gate in `src/middleware.ts` was audited and hardened:

| Request Category | Target Path | Unauthenticated Behavior | Authorized Behavior |
| :--- | :--- | :--- | :--- |
| **System Probes** | `/api/health`, `/api/ready` | HTTP 200 (Allow Docker health probes) | HTTP 200 |
| **Unlock Endpoints** | `/api/pilot/unlock`, `/status`, `/lock` | Handled by pilot service with rate limiting | Handled by pilot service |
| **Unlock UI** | `/pilot-access` | HTTP 200 (Unlock Form) | HTTP 200 |
| **Public Storefront** | `/`, `/store/*`, `/products/*` | Redirect to `/pilot-access?returnUrl=...` | Render Storefront |
| **Merchant Admin** | `/admin/*` | Redirect to `/pilot-access?returnUrl=...` | Better Auth Check Required |
| **Platform Superadmin**| `/platform/*` | Redirect to `/pilot-access?returnUrl=...` | Better Auth SUPERADMIN Required |
| **Storefront APIs** | `/api/checkout`, `/api/orders`, etc. | HTTP 401 (`PILOT_ACCESS_REQUIRED`) | Handled by route handler |
| **Uploaded Media** | `/uploads/*` | HTTP 401 (`PILOT_ACCESS_REQUIRED`) | Media served to tester |
| **Static Bundles** | `/_next/static/*` | HTTP 200 (Client UI scripts) | HTTP 200 |

*Direct requests to `/uploads/` are no longer bypassed, preventing unauthorized external asset scraping.*

---

## 7. Task 6 — Cloudflare Quick Tunnel Privacy Review

### 7.1 TLS Termination at Cloudflare Edge
- **Finding**: Ephemeral Cloudflare Quick Tunnels (`cloudflared tunnel --url ...`) terminate HTTPS encryption at Cloudflare's edge network.
- **Data Flow**: Traffic between remote testers and Cloudflare is encrypted with Cloudflare's public TLS certificate. The Cloudflare edge decrypts the HTTP payload and forwards it over an encrypted QUIC/HTTP2 tunnel to the local `cloudflared` daemon on the Windows workstation.
- **Privacy Implications**: Cloudflare edge nodes have visibility into HTTP headers, cookies, and request payloads in transit.

### 7.2 Risk Mitigation & Strict Policies
To ensure absolute privacy and compliance with zero risk:
1. **Zero Real Customer Data Policy**: The pilot operates exclusively with synthetic test personas (`Elena Rostova`, `David Miller`, `Jordan Reed`). Real customer PII, real email addresses, and production user records are strictly prohibited.
2. **Zero Real Financial Data Policy**: All payments are routed through mock sandbox simulations (`ALLOW_MOCK_PAYMENT="true"`). Real credit card numbers, banking details, or merchant credentials are never used.
3. **No Tunneling of Database or Internal Services**: Cloudflare forwards traffic **only** to port 3005 (Next.js application). PostgreSQL (ports 5432 and 5433), Docker daemon pipes, and worker processes are bound to localhost/internal Docker networks and cannot be addressed through the tunnel.

---

## 8. Task 7 — Environment Isolation Verification

| Boundary | Staging Environment | Development Environment | Production Readiness Status |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Port** | Port 5433 (Container `nexora-staging-postgres`) | Port 5432 (`nexora-postgres`) | Strict separation confirmed; dev database undisturbed |
| **Database Name** | `nexora_staging_db` | `nexora_db` | Separate volume mounts |
| **Payment Mode** | Mock Provider (`ALLOW_MOCK_PAYMENT="true"`) | Mock Provider | Production rejects mock payment mode via `env-validator.ts` |
| **Email Delivery** | `SIMULATED` (Transactional Outbox Daemon) | `SIMULATED` | Masked PII in outbox; no external SMTP transmission |
| **Uploaded Assets** | Dedicated volume `staging_uploads` | Local disk `./public/uploads` | Volume isolation confirmed |

---

## 9. Task 8 & 9 — Automated Security Tests & Regression Evidence

### 9.1 Vitest Suite Execution Results
The complete unit, integration, and security test suite was executed:
- **Total Test Files**: 25 passed (25 total)
- **Total Tests Passed**: **269 passed (269 total, 0 failed)**
- **Test Duration**: 112.37 seconds

#### Dedicated Pilot Security Test Suite (`src/services/pilot-security.test.ts`):
- `[PASS]` Rejects previously exposed literal passkey (`pilot_luxury_demo_2026`) with 401
- `[PASS]` Rejects second exposed passkey (`pilot_partner_tech_2026`) with 401
- `[PASS]` Rejects legacy 2-part session token format
- `[PASS]` Rejects forged HMAC signatures
- `[PASS]` Rejects expired tokens beyond timestamp
- `[PASS]` Creates individual invitation with SHA-256 hashed token at rest
- `[PASS]` Enforces single-use redemption and rejects replay attempts
- `[PASS]` Rejects expired invitations
- `[PASS]` Supports instant revocation of active invitation and all sessions
- `[PASS]` Supports instant revocation of an individual session
- `[PASS]` Tracks failed attempts in DB and auto-blocks after 5 failures (HTTP 429)
- `[PASS]` Returns identical generic error messages to eliminate user enumeration
- `[PASS]` Permits localhost and loopback interfaces
- `[PASS]` Permits exact match with `APPROVED_PILOT_HOSTNAME`
- `[PASS]` Fails-closed on spoofed host headers (HTTP 403)
- `[PASS]` Fails-closed on unapproved tunnel hostnames
- `[PASS]` Confirms pilot cookie alone never grants Better Auth user session or superadmin
- `[PASS]` Redacts email local parts to prevent log leakage (`jo***e@example.com`)
- `[PASS]` Handles short email names safely (`a*@domain.com`)
- `[PASS]` Handles null or invalid email inputs gracefully
- `[PASS]` Rejects wildcard in `APPROVED_PILOT_HOSTNAME`
- `[PASS]` Accepts valid HTTPS tunnel URL in `APPROVED_PILOT_HOSTNAME`

### 9.2 Playwright End-to-End Suite Results
All 8 end-to-end specifications were executed across all platform domains:
- `admin.spec.ts`: 4 passed
- `appearance.spec.ts`: 5 passed
- `multi-tenant.spec.ts`: 4 passed
- `operations.spec.ts`: 3 passed
- `orders.spec.ts`: 2 passed
- `saas-billing.spec.ts`: 5 passed
- `screenshots.spec.ts`: 1 passed
- `storefront.spec.ts`: 6 passed
- **Total Playwright Tests Passed**: **30 / 30 passed (100%)**

### 9.3 Infrastructure & Build Verification
1. `npx prisma validate`: Schema is valid and compliant.
2. `npx prisma migrate status`: 10 migrations found in `prisma/migrations`; database schema is completely up to date.
3. `npx tsc --noEmit`: 0 TypeScript compiler errors.
4. `npm run lint`: 0 ESLint errors.
5. `npm run build`: Production standalone build completed successfully; all 68 dynamic and API routes compiled; Edge Middleware compiled at 35 kB.
6. `docker compose -f docker-compose.staging.yml config`: Staging infrastructure configuration validated cleanly.

---

## 10. Operational Command Reference

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Issue Individual Invitation** | `npm run pilot:invite -- --name "Tester Name" --email "tester@example.com" --hours 48` | Generates a single-use high-entropy pilot token and records hash in PostgreSQL. |
| **Revoke Invitation / Session** | `npm run pilot:revoke -- --invitation <id>` | Immediately revokes an invitation and kills all child sessions. |
| **Start Fail-Closed Tunnel** | `powershell -ExecutionPolicy Bypass -File .\scripts\pilot\start-tunnel.ps1` | Launches Cloudflare tunnel with automated pre-flight checks, URL registration, and origin verification handshake. |
| **Stop Tunnel & Close Origin** | `powershell -ExecutionPolicy Bypass -File .\scripts\pilot\stop-tunnel.ps1` | Terminates `cloudflared`, resets `APPROVED_PILOT_HOSTNAME`, and reloads app container. |
| **Start Local Staging** | `powershell -ExecutionPolicy Bypass -File .\scripts\pilot\start-local-staging.ps1` | Builds and launches staging PostgreSQL, App, and Worker containers with seeded demo data. |
| **Verify Cleanup** | `powershell -ExecutionPolicy Bypass -File .\scripts\pilot\verify-cleanup.ps1` | Confirms ports 3005 and 5433 are closed and dev database (5432) remains undisturbed. |

---

## 11. Final Security Acceptance Verdict

The zero-cost external pilot infrastructure for NEXORA Commerce is **APPROVED FOR CONTROLLED INVITATION-ONLY DEMONSTRATIONS**.

- **Exposed Secrets**: Completely eradicated; old passkeys rejected at both perimeter and database layers.
- **Access Control**: Robust, individual, single-use, database-hashed, and instantly revocable.
- **Perimeter Defense**: Fail-closed origin validation, PostgreSQL rate limiting, and zero user enumeration.
- **Financial & Operational Cost**: Exactly LKR 0.00 / month.
- **System Integrity**: 269 Vitest tests, 30 Playwright tests, 68 Next.js routes, and 10 Prisma migrations passing with zero regressions.
