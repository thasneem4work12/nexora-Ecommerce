# NEXORA Commerce — Zero-Cost External Pilot Preparation Report

**Document Status**: Official Architecture & Readiness Evaluation  
**Assessment Date**: October 28, 2026  
**Auditor**: NEXORA Platform Architecture & Quality Assurance Group  
**Target Operating Budget**: LKR 0.00 / month ($0.00 USD)  
**Target Operating Model**: Local Windows 11 Workstation + Docker Desktop + Ephemeral Cloudflare Quick Tunnel  

---

## 1. Executive Summary & Readiness Verdict

This report certifies the complete technical preparation, security hardening, multi-store demo data provisioning, and operational tooling for conducting a zero-cost, invitation-only external pilot of NEXORA Commerce.

### 1.1 Readiness Tiers Evaluation

| Readiness Tier | Evaluation Verdict | Rationale & Gate Conditions |
| :--- | :---: | :--- |
| **Tier 1: Local Technical Readiness** | **PASS** | Complete Docker Compose stack (Next.js 15, PostgreSQL 16, background worker), isolated staging network, health/readiness probes, and 14/14 pilot security tests passing. |
| **Tier 2: External Invitation-Only Pilot Readiness** | **CONDITIONAL PASS** | Architecture, security gate, and automation scripts are 100% prepared. Opening the external tunnel is strictly gated on explicit owner authorization and dynamic hostname injection. |
| **Tier 3: Public Commercial Production Readiness** | **BLOCKED (BY DESIGN)** | Strictly blocked under the LKR 0 budget constraint: real merchant processing accounts, live PayHere integration, public domain registration, and SLA-backed cloud infrastructure are intentionally not activated. |

---

## 2. Zero-Cost Budget Verification

All components operate strictly at **LKR 0 / month ($0.00 USD)** without recurring cloud subscriptions, hidden serverless bills, or credit card requirements:

| Infrastructure Layer | Zero-Cost Implementation Strategy | Monthly Recurring Cost |
| :--- | :--- | :---: |
| **Web & API Compute** | Next.js 15 Standalone Docker container on local workstation | **LKR 0.00** |
| **Relational Database** | PostgreSQL 16 container with persistent SSD volume mount | **LKR 0.00** |
| **Background Sweeper** | Standalone Node.js worker container polling interval sweeps | **LKR 0.00** |
| **Media / Asset Storage** | Local persistent Docker volume (`./public/uploads` mount) | **LKR 0.00** |
| **External Network Ingress** | Ephemeral Cloudflare Quick Tunnel (`*.trycloudflare.com`) | **LKR 0.00** |
| **Pilot Access Gating** | Cryptographic HMAC-SHA256 session cookie + middleware | **LKR 0.00** |
| **Transactional Email** | Simulated outbox logger with automated PII masking | **LKR 0.00** |
| **Customer Payments** | Simulated sandbox mock payment provider | **LKR 0.00** |
| **SaaS Billing System** | Internal simulation provider with mock invoices | **LKR 0.00** |
| **TOTAL MONTHLY RUN RATE** | **STRICTLY ZERO** | **LKR 0.00** |

---

## 3. Architecture & Implementation Summary

### 3.1 Pilot Security Gate (`src/lib/pilot-gate.ts` & `src/middleware.ts`)
- **HMAC-SHA256 Signed Session Tokens**: Pilot access keys are cryptographically signed with timestamp payload (`key:timestamp`).
- **Timing-Safe Equality**: Signatures are evaluated using `crypto.timingSafeEqual` to defeat timing side-channel attacks.
- **Dynamic Key Revocation**: Tokens verify that the key remains present in `PILOT_ACCESS_KEYS`, enabling instantaneous revocation of compromised passkeys.
- **24-Hour Expiration**: Session cookies expire automatically after 24 hours.
- **Strict Host Header Validation**: Blocks HTTP host header poisoning, subdomain trickery, and unauthorized proxying by validating against `APPROVED_PILOT_HOSTNAME` and localhost loopbacks.
- **Rate-Limited Unlock Portal**: The `/pilot-access` unlock endpoint enforces an in-memory rate limit (max 5 failed attempts per IP per 5 minutes).

### 3.2 Dynamic Better Auth Configuration (`src/lib/auth.ts`)
- Rather than employing insecure wildcards (`*.trycloudflare.com`), the exact ephemeral hostname generated during tunnel startup is injected into `APPROVED_PILOT_HOSTNAME` and registered in Better Auth `trustedOrigins`.
- Enforces `useSecureCookies: true` over HTTPS tunnels while preserving CSRF protection.

### 3.3 Visual Demo Environment Feedback (`src/components/common/DemoEnvironmentBanner.tsx`)
- Displayed across all storefronts, checkouts, and admin views when `NEXT_PUBLIC_DEMO_MODE=true`.
- Prominently informs testers: *"DEMO ENVIRONMENT — All financial transactions, customer checkouts, and SaaS subscriptions are simulated. No real money is charged."*
- Features dismissible controls and sandbox mode badges.

### 3.4 PII-Masked Notification Service (`src/services/notification.service.ts`)
- Implemented `maskEmail()` to redact recipient addresses (`jo***e@example.com`) in log streams.
- Respects `EMAIL_DELIVERY_MODE` (`SIMULATED`, `LOG_ONLY`, `DISABLED`), preventing accidental outbound email leaks or SMTP exceptions.

### 3.5 Synthetic Multi-Store Demo Data Seeder (`scripts/seed-pilot-demo.ts`)
Fully idempotent seed routine provisioning 3 distinct brand universes:
1. **NEXORA Haute Couture** (`default-store` / `nexora`): Editorial Luxury theme, cashmere trenches, calfskin footwear, customer Elena Rostova, delivered luxury orders, bespoke atelier tickets.
2. **Lumina Audio & Tech** (`biz-lumina-tech` / `lumina-tech`): Modern Minimal theme, studio reference headphones and DACs, customer David Miller, active SaaS Growth subscription.
3. **Apex Kicks & Streetwear** (`biz-apex-kicks` / `apex-kicks`): Orange Energy theme, high-velocity sneakers, customer Jordan Reed, active SaaS Starter subscription.

---

## 4. Windows 11 Automation Tooling (`scripts/pilot/`)

Eight turnkey PowerShell automation scripts were authored to streamline pilot operations:

1. `check-prerequisites.ps1`: Validates Node.js, Docker Desktop, `.env.staging`, port availability (3005, 5433), and `cloudflared`.
2. `start-local-staging.ps1`: Launches Docker Compose stack, validates container health, applies migrations, and seeds demo data.
3. `check-staging-health.ps1`: Probes `/api/health`, `/api/ready`, and inspects worker sweep logs.
4. `prepare-approved-host.ps1`: Validates tunnel URL (HTTPS only, no wildcards) and injects into `.env.staging`.
5. `start-tunnel.ps1`: Interactive tunnel launcher with safety warnings (**PREPARED, NOT EXECUTED**).
6. `stop-tunnel.ps1`: Terminates `cloudflared` processes and clears ephemeral host configurations.
7. `stop-local-staging.ps1`: Safely shuts down staging containers while preserving persistent volumes.
8. `verify-cleanup.ps1`: Confirms closed ports and isolation of the primary development database on port 5432.

---

## 5. Security & Verification Audit

### 5.1 Pilot Security Test Suite (`src/services/pilot-security.test.ts`)
- **Test Results**: 14 tests executed, 14 passed (100% pass rate).
- **Coverage**:
  - Valid token creation and verification.
  - Unauthorized key rejection.
  - Tampered signature rejection.
  - Tampered payload rejection.
  - Expired token (25h) rejection.
  - Localhost and loopback validation.
  - Exact approved host matching.
  - Spoofed host header rejection.
  - Subdomain and wildcard attack rejection.
  - Email PII masking across short and long addresses.
  - Null/undefined email handling.
  - Environment validator wildcard rejection.

---

## 6. Pilot Demonstration Operating Protocol

When authorized by the project sponsor, the operator will follow this exact sequence:

```powershell
# 1. Verify workstation readiness
.\scripts\pilot\check-prerequisites.ps1

# 2. Launch staging containers and seed demo data
.\scripts\pilot\start-local-staging.ps1

# 3. Open Cloudflare Quick Tunnel (Supervised slot only)
.\scripts\pilot\start-tunnel.ps1

# 4. In a second window, register the generated URL
.\scripts\pilot\prepare-approved-host.ps1 -Hostname https://<generated>.trycloudflare.com

# 5. Distribute URL + Passkey to testers

# 6. Monitor live sessions
docker compose -f docker-compose.staging.yml logs -f --tail 25

# 7. Post-demo immediate teardown
.\scripts\pilot\stop-tunnel.ps1
.\scripts\pilot\stop-local-staging.ps1
.\scripts\pilot\verify-cleanup.ps1
```

---

## 7. Quality Assurance Sign-Off

- **Prisma Schema**: Validated (`npx prisma validate` passed).
- **TypeScript Compiler**: 0 errors (`npx tsc --noEmit` passed).
- **Vitest Unit/Integration Suite**: All tests passing.
- **Documentation**: Feasibility Report, Availability Plan, Mobile Testing Checklist, Monitoring Guide, Operator Guide, and Preparation Report completed.
- **Git Branch**: `pilot/zero-cost-prep` ready for final commit and tagging (`zero-cost-pilot-prepared`).
