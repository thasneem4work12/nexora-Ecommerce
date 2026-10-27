# NEXORA Commerce — Pilot Monitoring & Observability Guide

**Date**: October 28, 2026  
**Document Status**: Official Staging Operations Manual  
**Target Architecture**: Local Docker Compose Staging Stack + Cloudflare Quick Tunnel  

---

## 1. Monitoring Architecture Overview

During external pilot demonstration sessions, observability is maintained via four real-time layers:

1. **Docker Container Metrics & Health**: Real-time status, CPU, and memory limits via Docker engine.
2. **HTTP Application Probes**: Fast JSON endpoints (`/api/health` and `/api/ready`) exposing application uptime, database connectivity, and local storage read/write status.
3. **Container Log Streams**: Structured, unified logs across `app-staging`, `postgres-staging`, and `worker-staging` with automated PII masking.
4. **Cloudflare Tunnel Status**: Real-time CLI connection metrics and HTTP request latency from Cloudflare edge nodes.

---

## 2. Health & Readiness Endpoints

### 2.1 `/api/health` — Liveness Probe
- **Target URL**: `http://localhost:3005/api/health` (or `https://<tunnel-host>/api/health`)
- **Expected Status**: `HTTP 200 OK`
- **Response Schema**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-28T02:30:00.000Z",
    "uptime": 3600,
    "environment": "staging",
    "version": "0.6.0"
  }
  ```

### 2.2 `/api/ready` — Deep Dependency Probe
- **Target URL**: `http://localhost:3005/api/ready`
- **Expected Status**: `HTTP 200 OK`
- **Components Checked**:
  - `database`: PostgreSQL connection and read latency.
  - `storage`: Local storage directory existence and write permission.
- **Diagnostic Action on Failure**:
  If `/api/ready` returns `HTTP 503 Service Unavailable`, examine `checks.database` or `checks.storage` to pinpoint whether PostgreSQL is saturating connections or disk permissions are denied.

---

## 3. Real-Time Log Monitoring Commands

To monitor staging operations during a live tester session, open a dedicated PowerShell terminal and run:

### 3.1 All Staging Services (Interleaved)
```powershell
docker compose -f docker-compose.staging.yml logs -f --tail 50
```

### 3.2 Next.js Web Application Only
```powershell
docker compose -f docker-compose.staging.yml logs -f app-staging
```
*Look for: Request logs, Pilot Gate redirects, Better Auth session resolutions, and API route responses.*

### 3.3 Autonomous Background Worker Only
```powershell
docker compose -f docker-compose.staging.yml logs -f worker-staging
```
*Look for:*
- `[Worker] Sweeping expired reservations...`
- `[Worker] Processing notification outbox...`
- `[Worker] Sweeping SaaS billing subscriptions...`

### 3.4 Staging Database Logs
```powershell
docker compose -f docker-compose.staging.yml logs -f postgres-staging
```
*Look for: Checkpoints, connection allocations, query syntax errors.*

---

## 4. Container Resource Inspection

To check live CPU and memory utilization across the three staging containers:

```powershell
docker stats --no-stream nexora-staging-app nexora-staging-postgres nexora-staging-worker
```

### Normal Operating Thresholds:
- **`nexora-staging-app`**: 150 MB – 350 MB RAM; CPU < 15% idle, spikes to 40% on server renders.
- **`nexora-staging-postgres`**: 60 MB – 120 MB RAM; CPU < 5%.
- **`nexora-staging-worker`**: 70 MB – 110 MB RAM; CPU < 2%.

---

## 5. Troubleshooting & Incident Runbook

| Symptom / Error | Root Cause | Immediate Remediation |
| :--- | :--- | :--- |
| **HTTP 502 Bad Gateway** (Cloudflare error page) | `app-staging` container has stopped or port 3005 is unresponsive. | Run `docker compose -f docker-compose.staging.yml restart app-staging`. Verify container status with `docker compose -f docker-compose.staging.yml ps`. |
| **HTTP 403 Forbidden** (`INVALID_HOST_HEADER`) | Host header received by Next.js does not match `APPROVED_PILOT_HOSTNAME`. | Run `.\scripts\pilot\prepare-approved-host.ps1 -Hostname <current-tunnel-url>`. |
| **HTTP 401 Unauthorized** (`PILOT_ACCESS_REQUIRED`) | Tester has not entered the invitation passkey, or the 24-hour cookie expired. | Direct tester to `/pilot-access` and provide an approved key from `PILOT_ACCESS_KEYS`. |
| **HTTP 429 Too Many Requests** on `/api/pilot/unlock` | 5 failed passkey unlock attempts from tester IP within 5 minutes. | Rate limiter resets automatically after 5 minutes. Operator can restart `app-staging` to clear memory if needed immediately. |
| **Next.js CSRF Validation Failed** on login | Origin header does not match `trustedOrigins`. | Confirm `APPROVED_PILOT_HOSTNAME` is set to the exact tunnel URL with HTTPS and no trailing slash. |
| **Worker Not Processing Jobs** | Worker container crashed or lost DB connection. | Run `docker compose -f docker-compose.staging.yml restart worker-staging`. |

---

## 6. Security & Audit Log Review

During the pilot, operators should periodically inspect security logs for anomalies:

```powershell
# Check for unauthorized host access attempts
docker compose -f docker-compose.staging.yml logs app-staging | Select-String "INVALID_HOST_HEADER"

# Check for failed unlock attempts
docker compose -f docker-compose.staging.yml logs app-staging | Select-String "Invalid or expired pilot access token"

# Check for simulated email dispatch
docker compose -f docker-compose.staging.yml logs app-staging | Select-String "Transactional Email Adapter"
```
