# NEXORA Commerce — Stage 2 Supervised External Connectivity Test Results

> [!NOTE]
> **AWAITING SUPERVISED TEST EXECUTION**  
> This document is the official execution results template for Stage 2 Supervised External Connectivity Testing.  
> All test points are initialized to `NOT TESTED` and will be completed by the operator during supervised execution.

---

## 1. Execution Metadata

| Parameter | Recorded Value |
| :--- | :--- |
| **Execution Date** | *[YYYY-MM-DD HH:MM:SS UTC+5:30]* |
| **Operator / Role** | *Store Owner (`owner@nexoracommerce.com`)* |
| **Test Duration** | *[__ minutes (Max limit: 15 minutes)]* |
| **Git Commit Checkpoint** | *[commit hash on `pilot/zero-cost-prep`]* |
| **Assigned Quick Tunnel Hostname** | `https://[ephemeral-id].trycloudflare.com` |
| **Staging Application Port** | `127.0.0.1:3005` (Loopback strictly isolated) |
| **Staging PostgreSQL Port** | `127.0.0.1:5433` (Loopback strictly isolated) |
| **Payment Mode** | `ALLOW_MOCK_PAYMENT="true"` (Simulated Sandbox) |
| **Email Mode** | `EMAIL_DELIVERY_MODE="SIMULATED"` (Outbox Worker Only) |
| **Hosting Subscription Cost** | **LKR 0.00 / $0.00** |

---

## 2. Comprehensive 20-Point Acceptance Test Matrix

| ID | Test Case | Route / Layer | Expected Behavior | Actual Observation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TP-01** | Public Health Check | `GET /api/health` | Returns HTTP 200 `{"status":"ok"}` without pilot session | *Awaiting supervised run* | `NOT TESTED` |
| **TP-02** | Public Readiness Check | `GET /api/ready` | Returns HTTP 200 `{"status":"ready"}` without pilot session | *Awaiting supervised run* | `NOT TESTED` |
| **TP-03** | Root Access Without Session | `GET /` | Redirects to `/pilot-access?returnUrl=/` | *Awaiting supervised run* | `NOT TESTED` |
| **TP-04** | Storefront Access Without Session | `GET /products` | Redirects to `/pilot-access?returnUrl=/products` | *Awaiting supervised run* | `NOT TESTED` |
| **TP-05** | Direct API Access Without Session | `GET /api/cart` | Returns HTTP 401 `{"code":"PILOT_ACCESS_REQUIRED"}` | *Awaiting supervised run* | `NOT TESTED` |
| **TP-06** | Pilot Unlock Portal Page | `GET /pilot-access` | Returns HTTP 200 with form inputs and styling | *Awaiting supervised run* | `NOT TESTED` |
| **TP-07** | Invalid Passkey Rejection | `POST /api/pilot/unlock` | Returns HTTP 401 `{"code":"INVALID_TOKEN"}` | *Awaiting supervised run* | `NOT TESTED` |
| **TP-08** | Single-Use Passkey Redemption | `POST /api/pilot/unlock` | Returns HTTP 200, sets `nexora_pilot_session` cookie | *Awaiting supervised run* | `NOT TESTED` |
| **TP-09** | Session Cookie Security Flags | Cookie Header | `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (HTTPS) | *Awaiting supervised run* | `NOT TESTED` |
| **TP-10** | Storefront Homepage Access | `GET /` | Returns HTTP 200 with brand header and hero sections | *Awaiting supervised run* | `NOT TESTED` |
| **TP-11** | Product Catalog Browsing | `GET /products` | Returns HTTP 200 rendering synthetic products in LKR | *Awaiting supervised run* | `NOT TESTED` |
| **TP-12** | Shopping Bag Operations | Browser / UI | Items added to cart drawer, quantity updates reactive | *Awaiting supervised run* | `NOT TESTED` |
| **TP-13** | Mock Checkout Execution | `/checkout` | Order placed successfully using simulated `MOCK` provider | *Awaiting supervised run* | `NOT TESTED` |
| **TP-14** | Email Delivery Simulation | Database Worker | Confirmation recorded in `EmailOutbox`; zero SMTP traffic | *Awaiting supervised run* | `NOT TESTED` |
| **TP-15** | Single-Use Replay Prevention | `POST /api/pilot/unlock` | Second redemption of same passkey rejected with HTTP 401 | *Awaiting supervised run* | `NOT TESTED` |
| **TP-16** | Persistent Rate Limiting | `POST /api/pilot/unlock` | 5 consecutive invalid attempts trigger HTTP 429 | *Awaiting supervised run* | `NOT TESTED` |
| **TP-17** | Platform Admin Access Control | `GET /admin/pilot` | Denied to unauthenticated user (redirects to `/sign-in`) | *Awaiting supervised run* | `NOT TESTED` |
| **TP-18** | Better Auth Role Isolation | `/api/auth/*` | Pilot cookie confers zero Better Auth user permissions | *Awaiting supervised run* | `NOT TESTED` |
| **TP-19** | Multi-Tenant Data Isolation | Database Schema | Business data isolated between `default-store` & `lumina-tech` | *Awaiting supervised run* | `NOT TESTED` |
| **TP-20** | Session Revocation & Lockout | `POST /api/pilot/lock` | Session cookie cleared, subsequent navigation blocked | *Awaiting supervised run* | `NOT TESTED` |

---

## 3. Edge Middleware & Origin Policy Audit

| Check | Specification | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **Pre-Approval Origin Gate** | Ephemeral hostname rejected prior to approval (`APPROVED_PILOT_HOSTNAME`) | *Awaiting supervised run* | `NOT TESTED` |
| **Spoofed Host Header Gate** | Arbitrary Host headers return HTTP 403 `INVALID_HOST_HEADER` | *Awaiting supervised run* | `NOT TESTED` |
| **Exact Origin Matching** | Wildcard `*` rejected by Zod schema and `validateHostHeader` | *Awaiting supervised run* | `NOT TESTED` |
| **Safe Callback Redirects** | Open redirect attacks blocked; only internal paths permitted | *Awaiting supervised run* | `NOT TESTED` |

---

## 4. Network Exposure & Process Boundary Audit

| Check | Expected Binding | Observed Binding | Status |
| :--- | :--- | :--- | :--- |
| **Next.js Staging Port** | `127.0.0.1:3005` strictly | *Awaiting supervised run* | `NOT TESTED` |
| **PostgreSQL Staging Port** | `127.0.0.1:5433` strictly | *Awaiting supervised run* | `NOT TESTED` |
| **Dev PostgreSQL Isolation** | Port 5432 untouched | *Awaiting supervised run* | `NOT TESTED` |
| **Tunnel Daemon Mode** | Foreground script only; no Windows service | *Awaiting supervised run* | `NOT TESTED` |

---

## 5. Post-Test Cleanup & Rollback Audit

| Check | Expected State | Observed State | Status |
| :--- | :--- | :--- | :--- |
| **Cloudflared Process Terminated** | No running `cloudflared.exe` | *Awaiting supervised run* | `NOT TESTED` |
| **Origin Policy Cleared** | `APPROVED_PILOT_HOSTNAME=` in `.env.staging` | *Awaiting supervised run* | `NOT TESTED` |
| **app-staging Reloaded** | Container reloaded with fail-closed origin | *Awaiting supervised run* | `NOT TESTED` |
| **Docker Containers Healthy** | 3/3 containers healthy | *Awaiting supervised run* | `NOT TESTED` |
| **Data Volumes Intact** | Zero volume drops; synthetic data preserved | *Awaiting supervised run* | `NOT TESTED` |

---

## 6. Sign-off & Release Certification

| Role | Signatory | Decision | Date |
| :--- | :--- | :--- | :--- |
| **Store Owner / Operator** | *[Awaiting signature]* | `PENDING_SUPERVISED_TEST` | *[Pending]* |
| **DevSecOps / QA Lead** | *Antigravity AI Lead* | `OFFLINE_PREPARATION_ACCEPTED` | 2026-10-29 |
