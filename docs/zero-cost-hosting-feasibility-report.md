# NEXORA Commerce — Zero-Cost Hosting Feasibility Report

**Audit Date**: October 28, 2026  
**Document Status**: Official Architecture Evaluation  
**Target Budget**: LKR 0 / month ($0.00 USD)  
**Evaluator**: NEXORA Platform Architecture Group  

---

## 1. Executive Summary & Recommendation

NEXORA Commerce requires:
1. A Next.js 15 full-stack application (server-rendered dynamic routes, API endpoints, server actions).
2. A PostgreSQL 16 database with relational constraints, foreign keys, row-level locks, and complex indexes.
3. An autonomous, durable background worker continuously executing sweeps (stock reservation recovery, notification outbox dispatch, SaaS subscription lifecycle transitions).
4. Persistent file storage for uploaded catalog product imagery (`LocalStorageProvider` or S3).
5. Strict tenant isolation, cryptographic signature verification, and secure HTTPS session management.

### Architectural Recommendation
For the upcoming **zero-cost, invitation-only technical pilot**, the recommended architecture is:

> **Primary Recommendation**: **Local Docker Compose on Windows 11 + On-Demand Cloudflare Quick Tunnel** (activated only during live, supervised demonstration sessions with explicit owner authorization).

This approach incurs **LKR 0** in hosting fees, requires **no credit card signup**, exposes **zero real customer data**, runs on verified local hardware, and keeps the database and storage completely under developer control.

---

## 2. Comprehensive Provider Evaluation Matrix

| Evaluation Criteria | 1. Local Docker + Cloudflare Quick Tunnel | 2. Oracle Cloud Always Free VM | 3. Render Free | 4. Vercel Hobby |
| :--- | :---: | :---: | :---: | :---: |
| **Monthly Infrastructure Cost** | **LKR 0** ($0.00) | **LKR 0** ($0.00) | **LKR 0** ($0.00) | **LKR 0** ($0.00) |
| **Credit Card Requirement** | **None** (No external account) | **Mandatory** ($100 verification hold, strict fraud screening) | **None** for basic tier | **None** for Hobby tier |
| **Commercial-Use License Terms** | **Unrestricted** (Self-hosted on owner workstation) | **Allowed** within Always Free limits | **Allowed** with severe technical limits | **STRICTLY FORBIDDEN** (Hobby is personal / non-commercial only) |
| **PostgreSQL 16 Support** | **Full** (Docker PostgreSQL 16 container, unlimited storage) | **Full** (Self-hosted container on VM) | **CRITICAL LIMITATION**: Free DB deleted after 30 days! | **None native** (Requires 3rd party Neon/Supabase) |
| **Background Worker Support** | **Full** (Continuous container polling every 10s) | **Full** (Systemd service or Docker worker container) | **None** (Workers require paid $7/mo instance) | **None** (Serverless functions only; max 15s execution) |
| **Persistent File Storage** | **Full** (Docker persistent volumes on host SSD) | **Full** (50GB+ Block Storage included) | **Ephemeral** (Files wiped on redeploy) | **None** (Read-only filesystem; requires paid AWS/R2 S3) |
| **Uptime & Sleep Behavior** | Manual uptime (Controlled during demo windows) | Always-On (Unless idle reclaimed by Oracle) | **Spins down after 15m** (50s cold start delay) | Always-On serverless edge |
| **Operational Complexity** | **Low** (`docker compose up`) | **High** (Linux sysadmin, firewall, security lists) | **Medium** | **Low** |
| **Overall Feasibility Verdict** | **RECOMMENDED FOR PILOT** | **VIABLE LONG-TERM (CARD BLOCKED)** | **REJECTED (DATA LOSS RISK)** | **REJECTED (TOS & ARCH BLOCKED)** |

---

## 3. In-Depth Provider Analysis

### Provider 1: Local Docker + Cloudflare Quick Tunnel (Recommended)
- **Architecture**: Next.js 15 container (`app-staging`), PostgreSQL 16 container (`postgres-staging`), and autonomous worker container (`worker-staging`) running via `docker-compose.staging.yml`. When external access is required for an approved testing session, `cloudflared` launches an ephemeral tunnel directly pointing to port 3005.
- **Cost**: Exactly LKR 0. Zero hosting subscriptions.
- **Card Requirement**: Zero. No payment card or billing profile required.
- **Advantages**:
  1. Full control over data; zero cloud leakage.
  2. Persistent Docker volumes for database and catalog image uploads.
  3. Continuous background worker polling with zero added cost.
  4. Instant teardown: closing the terminal immediately terminates external access.
- **Limitations & Mitigations**:
  - *Limitation*: Windows 11 host must remain awake during demonstration sessions.  
    *Mitigation*: Configure Windows Power Toys "Awake" or Windows Power settings during active test windows.
  - *Limitation*: Cloudflare Quick Tunnel creates public `*.trycloudflare.com` URL without built-in Cloudflare Access Zero Trust policies.  
    *Mitigation*: Enforce an **Application-Level Pilot Security Gate** (`/pilot-access`) requiring pre-shared pilot tokens before any storefront or admin page can be viewed.

---

### Provider 2: Oracle Cloud Always Free VM (Compute Instance)
- **Architecture**: 1x VM.Standard.A1.Flex (ARM Ampere, up to 4 OCPUs, 24 GB RAM, 200 GB block storage) running Ubuntu Linux and Docker.
- **Cost**: LKR 0 under Always Free Tier.
- **Card Requirement**: **High Risk Blocker**. Oracle requires a valid international credit card during registration and places a temporary $100 authorization hold. Furthermore, users in South Asia (including Sri Lanka) experience high registration failure rates ("Error processing transaction") due to strict automated fraud filters, even with legitimate cards.
- **Commercial Terms**: Permitted for commercial use within resource boundaries.
- **Limitations**:
  - High setup complexity: requires configuring Oracle Virtual Cloud Network (VCN), Security Lists, iptables, SSH key management, and automated backup cron jobs.
  - Risk of instance reclamation if compute utilization falls below 20% for 7 days.
- **Verdict**: Excellent long-term free tier if an account already exists, but **blocked for immediate zero-friction pilot** due to mandatory credit card verification.

---

### Provider 3: Render Free Tier
- **Architecture**: Free Web Service + Free PostgreSQL database.
- **Cost**: LKR 0.
- **Critical Blockers**:
  1. **30-Day Database Expiration**: Render Free PostgreSQL databases are **permanently deleted after 30 days**. All catalog, order, and customer records would be wiped.
  2. **No Persistent Disk on Free Web Services**: Any product images uploaded through `LocalStorageProvider` are stored on ephemeral disks that are purged every time the application spins down or redeploys.
  3. **15-Minute Inactivity Spin-Down**: Free web services sleep after 15 minutes of inactivity. Incoming requests suffer a **50-second cold-start latency**, rendering responsive client demonstrations impossible.
  4. **Background Workers Unavailable**: Render does not offer background workers on the free tier (starts at $7/month per worker).
- **Verdict**: **REJECTED**. Unsuitable for NEXORA Commerce.

---

### Provider 4: Vercel Hobby Tier
- **Architecture**: Serverless Next.js edge deployment.
- **Cost**: LKR 0.
- **Critical Blockers**:
  1. **Terms of Service Violation**: Section 2 of Vercel Hobby Terms explicitly states that the Hobby tier is **strictly for non-commercial, personal projects**. Deploying a multi-tenant SaaS e-commerce platform for external commercial pilots violates Vercel Terms of Service and risks immediate account suspension.
  2. **Serverless Execution Limits**: Maximum function execution time is 10–15 seconds. Long-running database operations, report exports, or batch processing can trigger HTTP 504 timeouts.
  3. **No Continuous Background Worker**: Vercel does not support persistent background daemons or continuous interval polling. Background jobs require Vercel Cron (limited on Hobby) or external schedulers.
  4. **Read-Only Serverless Filesystem**: The `/app` filesystem in serverless functions is strictly read-only (except `/tmp` which is ephemeral). Catalog image uploads cannot be saved to disk.
- **Verdict**: **REJECTED**. Violates terms of service and incompatible with local storage and background workers.

---

## 4. Final Recommendation & Implementation Roadmap

| Pilot Phase | Selected Architecture | Key Security Controls |
| :--- | :--- | :--- |
| **Phase A: Local Pilot Preparation** | Docker Compose on Windows 11 host (`app-staging`, `worker-staging`, `postgres-staging`) | Local-only ports (`3005`, `5433`). Full synthetic seed data. Zero external network exposure. |
| **Phase B: Supervised Technical Pilot** | Local Docker Compose + Ephemeral Cloudflare Quick Tunnel | Application-Level Pilot Access Gate (`/pilot-access`). Dynamic hostname injection for Better Auth. Staging demo payment banner. |
| **Phase C: Production Launch (Future)** | Managed Cloud VPS (or approved cloud container provider) + Managed PostgreSQL + S3 Storage | Dedicated domain, TLS certificates, PayHere live merchant integration, live email transport. |
