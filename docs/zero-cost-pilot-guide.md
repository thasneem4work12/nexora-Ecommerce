# NEXORA Commerce — Zero-Cost External Pilot Operator Guide

**Document Status**: Official Staging Operations Manual  
**Target Infrastructure**: Local Windows 11 Workstation + Docker Desktop + Cloudflare Quick Tunnel  
**Operating Budget**: Exactly LKR 0 / month ($0.00 USD)  
**Security Classification**: Confidential — Invitation-Only Technical Pilot  

---

## 1. Introduction & Architecture Overview

NEXORA Commerce is engineered as a multi-tenant, editorial-grade e-commerce SaaS platform.

For the initial external technical pilot, the platform is hosted on the developer's local Windows 11 workstation using isolated Docker Compose containers and an on-demand, ephemeral Cloudflare Quick Tunnel. This architecture achieves **three critical goals**:

1. **Absolute Zero Financial Cost (LKR 0 / month)**: Eliminates recurring cloud hosting, cloud database, serverless compute, and DNS subscription costs.
2. **Complete Data Sovereignty & Safety**: Zero sensitive customer data, API keys, or financial records are placed on third-party cloud hosting providers.
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

## 3. The 3 Golden Safety Rules of the Pilot

> [!CAUTION]
> **Rule 1: NEVER Run the Tunnel Unattended.**  
> The external Cloudflare tunnel must be opened ONLY during supervised demonstration slots (1–2 hours) with explicit stakeholder approval. Close the tunnel immediately after the session concludes.

> [!IMPORTANT]
> **Rule 2: NEVER Disable the Pilot Access Gate.**  
> `PILOT_ACCESS_GATE_ENABLED=true` must remain active at all times when an external tunnel is open. An unauthenticated Quick Tunnel is publicly indexable; the application-level gate is the primary barrier stopping unauthorized traffic.

> [!WARNING]
> **Rule 3: NEVER Use Live Payments or Real Credentials.**  
> All checkouts, cards, and SaaS subscriptions are simulated using synthetic sandboxes. Real credit card numbers or production API credentials must never be entered.

---

## 4. End-to-End Operational Lifecycle

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

### Phase 3: Launch Ephemeral Tunnel (When Approved) (T - 5 Minutes)
1. Launch the tunnel launcher script:
   ```powershell
   .\scripts\pilot\start-tunnel.ps1
   ```
2. Type `CONFIRM` at the prompt.
3. `cloudflared` will display your unique ephemeral URL:
   `https://[random-subdomain].trycloudflare.com`
4. In a second PowerShell window, register this hostname into Better Auth:
   ```powershell
   .\scripts\pilot\prepare-approved-host.ps1 -Hostname https://[random-subdomain].trycloudflare.com
   ```
   *This automatically validates the URL (no wildcards allowed) and updates `app-staging`.*

### Phase 4: Onboard Invited Testers (T - 0 Minutes)
Distribute the following brief to your invited testers via secure channel (e.g. WhatsApp, Signal, or Email):

```text
Welcome to the NEXORA Commerce Technical Pilot Demonstration!

URL: https://[random-subdomain].trycloudflare.com
Invitation Passkey: pilot_luxury_demo_2026

Instructions:
1. Tap the URL on your mobile phone or laptop.
2. Enter the Invitation Passkey to unlock the secure demonstration portal.
3. Explore the 3 curated luxury stores:
   - NEXORA Haute Couture: /store/nexora (Editorial Luxury theme)
   - Lumina Audio & Tech: /store/lumina-tech (Modern Minimal theme)
   - Apex Kicks & Streetwear: /store/apex-kicks (Orange Energy theme)
4. Add items to your bag and proceed through simulated checkout.
   (No real payments are processed; use any dummy card details in mock mode).
5. File a concierge inquiry under your account orders.
```

### Phase 5: Supervised Monitoring During Session
Open a PowerShell window to observe live server and worker ticks:
```powershell
docker compose -f docker-compose.staging.yml logs -f --tail 25
```
Watch for:
- Gate unlocks (`Pilot access granted`).
- Order placement events.
- Simulated transactional email dispatches with masked PII (`jo***e@example.com`).

### Phase 6: Post-Demonstration Immediate Teardown (T + Session End)
1. Stop the external tunnel:
   ```powershell
   .\scripts\pilot\stop-tunnel.ps1
   ```
2. Stop the local staging containers:
   ```powershell
   .\scripts\pilot\stop-local-staging.ps1
   ```
3. Verify 100% clean teardown:
   ```powershell
   .\scripts\pilot\verify-cleanup.ps1
   ```
   *Confirms ports 3005 and 5433 are closed and dev database on port 5432 remains undisturbed.*

---

## 5. Multi-Store Test Matrix & Seeded Accounts

| Store Brand | Route / URL | Active Theme | Seeded Products | Sample Customer Login |
| :--- | :--- | :--- | :--- | :--- |
| **NEXORA Haute Couture** | `/store/nexora` | Editorial Luxury | Cashmere Trench, French Oxfords | `customer.luxury@example.com` |
| **Lumina Audio & Tech** | `/store/lumina-tech` | Modern Minimal | Acoustic Pro Headphones, Reference DAC | `tester.tech@example.com` |
| **Apex Kicks & Streetwear** | `/store/apex-kicks` | Orange Energy | Quantum High-Tops, Carbon Runners | `tester.street@example.com` |
| **Platform Superadmin** | `/platform` | Superadmin Studio | Platform Overview, Tenant Directory, SaaS Plans | `admin@nexoracommerce.com` |

---

## 6. Zero-Cost Budget Verification

- **Compute & Server Hosting**: $0.00 / month (Local workstation CPU/RAM).
- **Database Hosting**: $0.00 / month (Local Docker PostgreSQL 16 on SSD).
- **Tunnel & Domain**: $0.00 / month (Cloudflare Quick Tunnel `trycloudflare.com`).
- **Media Asset Storage**: $0.00 / month (Docker persistent volume).
- **Email Infrastructure**: $0.00 / month (Simulated transactional outbox logger).
- **Payment Gateway**: $0.00 / month (Simulated sandbox mock provider).
- **TOTAL MONTHLY OPERATING COST**: **LKR 0.00 / $0.00 USD**
