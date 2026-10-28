# NEXORA Commerce — Zero-Cost External Pilot Operator Guide

**Document Status**: Official Staging Operations Manual  
**Target Infrastructure**: Local Windows 11 Workstation + Docker Desktop + Cloudflare Quick Tunnel  
**Operating Budget**: Exactly LKR 0 / month ($0.00 USD)  
**Security Classification**: Confidential — Invitation-Only Technical Pilot  

---

## 1. Introduction & Architecture Overview

NEXORA Commerce is engineered as a multi-tenant, editorial-grade e-commerce SaaS platform.

For the external technical pilot, the platform is hosted on the operator's local Windows 11 workstation using isolated Docker Compose staging containers and an on-demand, ephemeral Cloudflare Quick Tunnel. This architecture achieves **three critical goals**:

1. **Absolute Zero Financial Cost (LKR 0 / month)**: Eliminates recurring cloud hosting, cloud database, serverless compute, and DNS subscription costs.
2. **Strict Isolation & Synthetic Testing**: Staging operates against a dedicated PostgreSQL database container with synthetic personas and simulated payment flows.
3. **Multi-Tenant Experience**: Allows invited testers to experience the complete platform (multi-store switching, custom brand themes, catalog browsing, cart operations, mock checkouts, concierge support, and platform superadmin controls) on real mobile and desktop devices.

---

## 2. Infrastructure Architecture & Network Flow

```
                      INTERNET / REMOTE TESTERS
                     (iOS Safari / Android Chrome)
                                  │
                                  ▼  HTTPS (Port 443)
              ┌────────────────────────────────────────┐
              │    Cloudflare Global Edge Network      │
              │   (Ephemeral *.trycloudflare.com)      │
              │   *Terminates TLS; Proxies HTTP payload│
              └───────────────────┬────────────────────┘
                                  │ Encrypted HTTP/2 Tunnel
                                  ▼
              ┌────────────────────────────────────────┐
              │      Windows 11 Workstation            │
              │  cloudflared.exe (Tunnel Process)     │
              └───────────────────┬────────────────────┘
                                  │ HTTP (Port 3005)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Docker Compose Staging Network (nexora-staging-network)                │
│                                                                        │
│  ┌─────────────────────────┐         ┌──────────────────────────────┐  │
│  │   nexora-staging-app    │◄───────►│   nexora-staging-postgres    │  │
│  │   Next.js 15 Standalone │         │   PostgreSQL 16 Engine       │  │
│  │   Port 3005:3000        │         │   Port 5433:5432 (Isolated)  │  │
│  └───────────┬─────────────┘         └──────────────▲───────────────┘  │
│              │                                      │                  │
│              │ (Local Disk / Persistent Volume)     │                  │
│              ▼                                      │                  │
│  ┌─────────────────────────┐         ┌──────────────┴───────────────┐  │
│  │     Staging Uploads     │         │    nexora-staging-worker     │  │
│  │     (Product Imagery)   │         │    Background Sweeper Daemon │  │
│  └─────────────────────────┘         └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Cloudflare Quick Tunnel Privacy & Exposure Review

> [!IMPORTANT]
> **Edge Decryption & Third-Party Privacy Notice**:
> Ephemeral Cloudflare Quick Tunnels (`trycloudflare.com`) operate as reverse proxies that **terminate TLS encryption at Cloudflare's global edge network**.
> - Incoming HTTP requests (headers, cookies, query parameters, and form/POST payloads) are decrypted at the Cloudflare edge before forwarding over the secure tunnel to the local machine.
> - **Zero Real Customer Data**: Because NEXORA operates exclusively with synthetic mock catalog and customer data during the pilot, no real Personally Identifiable Information (PII) or real payment cardholder data ever transits the tunnel.
> - **Internal Service Boundaries**: Cloudflare Quick Tunnel forwards traffic **exclusively** to the Next.js HTTP application port (3005). PostgreSQL (port 5433 / 5432), Docker daemon sockets, background worker processes, and environment files (`.env`, `.env.staging`) are **never exposed to or tunneled by Cloudflare**.
> - **Zero DNS/Account Requirement**: Quick Tunnels require no Cloudflare user account, API token, or registered domain name, ensuring zero configuration leakage.

---

## 4. The 4 Golden Safety Rules of the Pilot

> [!CAUTION]
> **Rule 1: NEVER Run the Tunnel Unattended.**  
> The external Cloudflare tunnel must be opened ONLY during supervised demonstration slots (1–2 hours) with explicit stakeholder approval. Close the tunnel immediately after the session concludes.

> [!IMPORTANT]
> **Rule 2: NEVER Disable the Pilot Access Gate.**  
> `PILOT_ACCESS_GATE_ENABLED=true` must remain active at all times when an external tunnel is open. An unauthenticated Quick Tunnel is publicly accessible on the internet; the application-level gate is the primary barrier stopping unauthorized traffic.

> [!WARNING]
> **Rule 3: NEVER Use Live Payments or Real Credentials.**  
> All checkouts, cards, and SaaS subscriptions are simulated using synthetic sandboxes. Real credit card numbers or production API credentials must never be entered.

> [!IMPORTANT]
> **Rule 4: NEVER Share Multi-Use or Static Secrets.**  
> Each tester receives an individual, cryptographically random single-use token (`nxr_pilot_...`). Passing the pilot gate only grants entry through the network perimeter; it never bestows Better Auth roles or administrative privileges.

---

## 5. End-to-End Operational Lifecycle

### Phase 1: Pre-Demonstration Setup (T - 15 Minutes)
1. Ensure the workstation is plugged into mains AC power.
2. Open Microsoft PowerToys Awake (or adjust Windows Power & Sleep to "Never sleep").
3. Open a PowerShell terminal in the repository root:
   ```powershell
   .\scripts\pilot\check-prerequisites.ps1
   ```
4. Confirm Docker Desktop is running and ports 3005 and 5433 are available.

### Phase 2: Start Local Staging & Seed Data (T - 10 Minutes)
1. Launch the local staging containers:
   ```powershell
   .\scripts\pilot\start-local-staging.ps1
   ```
2. The script will automatically:
   - Start PostgreSQL, App, and Worker containers.
   - Wait for healthy status across all services.
   - Apply Prisma migrations to the isolated staging database.
   - Run `seed-pilot-demo.ts` to populate the 3 demo stores, synthetic customers, orders, tickets, and SaaS subscriptions.
3. Verify health locally:
   ```powershell
   .\scripts\pilot\check-staging-health.ps1
   ```
   Confirm that `http://localhost:3005/api/health` returns `healthy`.

### Phase 3: Generate Individual Tester Invitations (T - 5 Minutes)
Generate individual, single-use access tokens for each invited reviewer:
```powershell
npx tsx scripts/create-pilot-invitation.ts --name "Elena Rostova" --email "customer.luxury@example.com" --hours 48
```
The script will output:
- Unique Invitation ID
- Expiration timestamp (default 48 hours)
- Single-use redemption allowance
- **One-time invitation token (`nxr_pilot_<random>`)**

*Repeat for each tester. Only the SHA-256 hash is persisted in PostgreSQL.*

### Phase 4: Launch Ephemeral Tunnel with Fail-Closed Handshake (When Approved) (T - 2 Minutes)
1. Launch the tunnel launcher script:
   ```powershell
   .\scripts\pilot\start-tunnel.ps1
   ```
2. Type `CONFIRM` at the prompt.
3. The script automatically:
   - Verifies staging app health and gate activation.
   - Spawns `cloudflared` and acquires `https://*.trycloudflare.com`.
   - Validates hostname syntax (strictly no wildcards).
   - Injects `APPROVED_PILOT_HOSTNAME` into `.env.staging` and reloads `app-staging`.
   - Executes an automated **Safe Origin Verification Handshake**:
     - Tests `/api/health` connectivity via tunnel.
     - Confirms unauthenticated root traffic redirects to `/pilot-access`.
     - Confirms unauthorized Host headers receive 403 Forbidden.
   - Aborts and kills the process immediately if any check fails (fail-closed).

### Phase 5: Onboard Invited Testers (T - 0 Minutes)
Distribute the personalized brief to each invited tester via secure channel (e.g. WhatsApp, Signal, or Email):

```text
Welcome to the NEXORA Commerce Technical Pilot Demonstration!

Access URL: https://[assigned-subdomain].trycloudflare.com
Your One-Time Pilot Token: [INDIVIDUAL_TOKEN_FROM_PHASE_3]

Instructions:
1. Open the URL on your mobile browser or laptop.
2. Enter your assigned single-use pilot token to unlock the demonstration portal.
3. Explore the 3 curated luxury stores:
   - NEXORA Haute Couture: /store/nexora (Editorial Luxury theme)
   - Lumina Audio & Tech: /store/lumina-tech (Modern Minimal theme)
   - Apex Kicks & Streetwear: /store/apex-kicks (Orange Energy theme)
4. Add items to your bag and proceed through simulated checkout.
   (No real payments are processed; use any dummy card details in mock mode).
5. File a concierge inquiry under your account orders.
```

### Phase 6: Supervised Monitoring During Session
Open a PowerShell window to observe live server and worker ticks:
```powershell
docker compose -f docker-compose.staging.yml logs -f --tail 25
```
Watch for:
- Gate redemptions (`INVITATION_REDEEMED`).
- Rate limiting enforcement on brute force attempts (`UNLOCK_FAILED_RATE_LIMITED`).
- Order placement events.
- Simulated transactional email dispatches with masked PII (`jo***e@example.com`).

### Phase 7: Instant Revocation & Post-Demonstration Teardown
1. If an individual token needs immediate revocation during the pilot:
   ```powershell
   npx tsx scripts/revoke-pilot-invitation.ts --invitation <invitation-id>
   ```
2. Stop the external tunnel (kills process, clears origin, resets container):
   ```powershell
   .\scripts\pilot\stop-tunnel.ps1
   ```
3. Stop the local staging containers:
   ```powershell
   .\scripts\pilot\stop-local-staging.ps1
   ```
4. Verify 100% clean teardown:
   ```powershell
   .\scripts\pilot\verify-cleanup.ps1
   ```
   *Confirms ports 3005 and 5433 are closed and dev database on port 5432 remains undisturbed.*

---

## 6. Multi-Store Test Matrix & Seeded Accounts

| Store Brand | Route / URL | Active Theme | Seeded Products | Sample Customer Login |
| :--- | :--- | :--- | :--- | :--- |
| **NEXORA Haute Couture** | `/store/nexora` | Editorial Luxury | Cashmere Trench, French Oxfords | `customer.luxury@example.com` |
| **Lumina Audio & Tech** | `/store/lumina-tech` | Modern Minimal | Acoustic Pro Headphones, Reference DAC | `tester.tech@example.com` |
| **Apex Kicks & Streetwear** | `/store/apex-kicks` | Orange Energy | Quantum High-Tops, Carbon Runners | `tester.street@example.com` |
| **Platform Superadmin** | `/platform` | Superadmin Studio | Platform Overview, Tenant Directory, SaaS Plans | `admin@nexoracommerce.com` |

---

## 7. Zero-Cost Budget Verification

- **Compute & Server Hosting**: $0.00 / month (Local workstation CPU/RAM).
- **Database Hosting**: $0.00 / month (Local Docker PostgreSQL 16 on SSD).
- **Tunnel & Domain**: $0.00 / month (Cloudflare Quick Tunnel `trycloudflare.com`).
- **Media Asset Storage**: $0.00 / month (Docker persistent volume).
- **Email Infrastructure**: $0.00 / month (Simulated transactional outbox logger).
- **Payment Gateway**: $0.00 / month (Simulated sandbox mock provider).
- **TOTAL MONTHLY OPERATING COST**: **LKR 0.00 / $0.00 USD**
