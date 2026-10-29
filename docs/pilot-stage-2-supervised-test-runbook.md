# NEXORA Commerce — Stage 2 Supervised External Connectivity Test Runbook

> [!CAUTION]
> **PREPARATION-ONLY RUNBOOK — DO NOT EXECUTE WITHOUT EXPLICIT WRITTEN OWNER AUTHORIZATION**  
> This operational runbook specifies the exact, step-by-step procedure for the first temporary, owner-supervised external connectivity test of NEXORA Commerce using Cloudflare Quick Tunnel.  
> **Under no circumstances should any tunnel command, script, or external exposure be initiated during offline preparation.**

---

## Document Control & Operational Context

| Attribute | Specification |
| :--- | :--- |
| **System** | NEXORA Commerce — Multi-Tenant Staging |
| **Stage** | Stage 2 — Owner-Supervised External Connectivity Test |
| **Scope** | Single owner-operated device, 15-minute maximum window, zero external testers |
| **Hosting Subscription Cost** | **LKR 0.00 / $0.00** |
| **Network Architecture** | Local Windows 11 Docker staging (`127.0.0.1:3005`) tunneled via Cloudflare Quick Tunnel |
| **Target Checkpoint** | Clean Git commit on `pilot/zero-cost-prep` |
| **Execution Authority** | Store Owner / Technical Lead Only |

---

## Section A: Scope & Safety Boundaries

1. **Owner-Only Test**: Only the designated system owner (`owner@nexoracommerce.com`) may access the ephemeral tunnel during this test. No external links, public URLs, or tester invitations may be distributed.
2. **Strict Time Limit**: The Cloudflare tunnel process must not run longer than **15 consecutive minutes**. An active timer must be kept by the operator.
3. **Simulated Sandbox Only**:
   - `ALLOW_MOCK_PAYMENT="true"`: Real credit cards or live payment gateways are strictly disabled. Only synthetic mock payments are permitted.
   - `EMAIL_DELIVERY_MODE="SIMULATED"`: No real emails are sent across SMTP. All email messages are queued in the local PostgreSQL `EmailOutbox` table.
4. **Data Isolation**: Staging PostgreSQL database (`nexora_staging_db` on port 5433) contains only synthetic seed data. The development database (`nexora_db` on port 5432) remains untouched and offline.
5. **Fail-Closed Perimeter**: Edge Middleware (`src/middleware.ts`) rejects all traffic not matching the approved hostname or lacking an active pilot session cookie.

---

## Section B: Pre-Test Checklist

Before initiating any commands in this runbook, verify and check every item:

- [ ] **Git Working Tree**: `git status` reports working tree clean.
- [ ] **Docker Containers**: All 3 staging containers (`app-staging`, `postgres-staging`, `worker-staging`) report `healthy`.
- [ ] **Port Isolation**: `netstat -ano | findstr "3005"` confirms Next.js is bound strictly to `127.0.0.1:3005`.
- [ ] **Dev Database Isolation**: Staging does not connect to port 5432.
- [ ] **Cloudflared Binary**: `cloudflared --version` verifies official binary version 2026.10.5.
- [ ] **No Running Tunnels**: `Get-Process cloudflared -ErrorAction SilentlyContinue` returns `$null`.
- [ ] **No Windows Service**: `Get-Service *cloudflared* -ErrorAction SilentlyContinue` returns `$null`.
- [ ] **Fail-Closed Audit Passed**: `npx tsx scripts/test-tunnel-failclosed.ts` completes with 100% pass.

---

## Section C: Step 1 — Staging Baseline Confirmation

In a local administrative PowerShell terminal:

```powershell
# 1. Verify staging container health
powershell -ExecutionPolicy Bypass -File .\scripts\pilot\check-staging-health.ps1

# 2. Verify localhost HTTP probes
Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/health"
# Expected output: @{status = "ok"}

Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/ready"
# Expected output: @{status = "ready"}
```

---

## Section D: Step 2 — Generate Owner-Only Invitation

Generate exactly ONE temporary, single-use invitation for the owner:

```powershell
# Execute invitation generator with 2-hour expiry and 1 max redemption
npx tsx scripts/create-pilot-invitation.ts --name "Owner Supervised Test" --email "owner@nexoracommerce.com" --hours 2 --redemptions 1
```

Record the output securely:
- **Invitation ID**: `[UUID]`
- **Single-Use Passkey**: `nxr_pilot_[hex-token]` (Record in clipboard for Step 8; never commit or post in logs).

---

## Section E: Step 3 — Supervised Tunnel Launch

Launch the supervised tunnel script. This script starts `cloudflared` in the background, captures its PID in `.tunnel.pid`, and streams output to `cloudflared.log`:

```powershell
# Launch tunnel process
powershell -ExecutionPolicy Bypass -File .\scripts\pilot\start-tunnel.ps1
```

> [!IMPORTANT]
> The script pauses after starting `cloudflared` to allow manual review and confirmation of the ephemeral hostname before granting any origin approvals.

---

## Section F: Step 4 — Hostname Extraction & Approval

1. Review `cloudflared.log` to extract the assigned Quick Tunnel hostname:
   ```powershell
   Get-Content cloudflared.log | Select-String "trycloudflare.com"
   ```
2. Verify that the URL matches the exact pattern `https://[a-z0-9-]+\.trycloudflare\.com`.
3. Approve the hostname by entering it when prompted by `start-tunnel.ps1`, or run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\pilot\prepare-approved-host.ps1 -ApprovedHost "https://<assigned-subdomain>.trycloudflare.com"
   ```
4. Confirm `.env.staging` is updated:
   ```powershell
   Get-Content .env.staging | Select-String "APPROVED_PILOT_HOSTNAME"
   ```

---

## Section G: Step 5 — Hostname Verification

Confirm that `app-staging` container has reloaded and loaded the approved origin:

```powershell
# Inspect container environment
docker compose -f docker-compose.staging.yml exec app-staging env | findstr "APPROVED_PILOT_HOSTNAME"
```

Verify that unapproved host headers still receive HTTP 403:
```powershell
curl.exe -k -i -H "Host: attacker-spoofed-domain.com" "http://127.0.0.1:3005/"
# Expected: HTTP/1.1 403 Forbidden with code INVALID_HOST_HEADER
```

---

## Section H: Step 6 — Edge Middleware Verification

Send an unauthenticated request to the approved external hostname:

```powershell
$tunnelUrl = "https://<assigned-subdomain>.trycloudflare.com"

# Storefront root request without session
curl.exe -k -i "$tunnelUrl/"
# Expected: HTTP 307 Temporary Redirect to /pilot-access?returnUrl=/

# Direct API request without session
curl.exe -k -i "$tunnelUrl/api/cart"
# Expected: HTTP 401 Unauthorized with code PILOT_ACCESS_REQUIRED
```

---

## Section I: Step 7 — Run Automated Connectivity Test Suite

Execute the dedicated Playwright acceptance test suite against the active tunnel URL:

```powershell
$env:TUNNEL_URL = "https://<assigned-subdomain>.trycloudflare.com"
npx playwright test e2e/pilot-external-connectivity.spec.ts --reporter=list
Remove-Item Env:\TUNNEL_URL
```

Confirm that all 20 test points execute and pass.

---

## Section J: Step 8 — Owner Manual Verification (Mobile / Browser)

1. Open a mobile browser or private browser tab.
2. Navigate to: `https://<assigned-subdomain>.trycloudflare.com/`
3. Verify redirect to `/pilot-access?returnUrl=/`.
4. Enter the single-use passkey generated in Step 2: `nxr_pilot_[token]`.
5. Click **Unlock Atelier Access**.
6. Verify redirect to the luxury storefront homepage (`/`).
7. Browse `/products`, add an item to the shopping bag.
8. Perform a simulated checkout using the `MOCK` payment provider.
9. Verify order confirmation screen.

---

## Section K: Step 9 — Invitation Replay & Security Checks

Verify replay prevention:
1. Open a second incognito browser tab.
2. Navigate to: `https://<assigned-subdomain>.trycloudflare.com/pilot-access`
3. Enter the **same** passkey used in Step 8.
4. Click **Unlock Atelier Access**.
5. Verify rejection: Error message `"Invalid or expired pilot access token."` and HTTP 401.

---

## Section L: Step 10 — Session Revocation Check

1. In the unlocked browser session, navigate to:
   ```
   https://<assigned-subdomain>.trycloudflare.com/api/pilot/lock
   ```
   (or trigger lock via POST).
2. Attempt to browse `/products`.
3. Verify immediate redirection back to `/pilot-access`.

---

## Section M: Step 11 — Supervised Tunnel Shutdown

Immediately shut down the tunnel upon test completion (or when 15 minutes have elapsed):

```powershell
# Execute emergency / planned tunnel shutdown
powershell -ExecutionPolicy Bypass -File .\scripts\pilot\stop-tunnel.ps1
```

The script will:
1. Terminate only the PID recorded in `.tunnel.pid`.
2. Clear `APPROVED_PILOT_HOSTNAME=` in `.env.staging`.
3. Restart `app-staging` to restore strict fail-closed origin isolation.
4. Remove temporary PID files.

---

## Section N: Step 12 — Post-Test Cleanup & Verification

Run the automated cleanup verification script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pilot\verify-cleanup.ps1
```

Confirm:
- [ ] No `cloudflared` process is running.
- [ ] `APPROVED_PILOT_HOSTNAME` is completely cleared in `.env.staging`.
- [ ] All 3 staging containers remain healthy.
- [ ] Database volumes are preserved and intact.
- [ ] `git status` reports only untracked log files (if any) or remains clean.

---

## Section O: Emergency Procedures

If any unexpected condition occurs (e.g., unauthorized traffic detected, unknown error, or process hang), run the following emergency sequence immediately:

```powershell
# 1. Force kill ALL cloudflared processes
powershell -ExecutionPolicy Bypass -File .\scripts\pilot\stop-tunnel.ps1 -ForceAll

# 2. Or execute direct PowerShell emergency one-liner
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue

# 3. Restore fail-closed origin in staging
(Get-Content .env.staging) -replace 'APPROVED_PILOT_HOSTNAME=.*', 'APPROVED_PILOT_HOSTNAME=' | Set-Content .env.staging
docker compose -f docker-compose.staging.yml restart app-staging

# 4. Invalidate all pilot sessions in staging PostgreSQL
docker compose -f docker-compose.staging.yml exec -T postgres-staging psql -U nexora_staging -d nexora_staging_db -c "UPDATE \"pilot_sessions\" SET \"status\" = 'REVOKED' WHERE \"status\" = 'ACTIVE';"
```

**End of Runbook.**
