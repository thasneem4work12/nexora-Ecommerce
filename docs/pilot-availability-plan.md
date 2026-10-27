# NEXORA Commerce — Pilot Availability & Operational Plan

**Date**: October 28, 2026  
**Document Status**: Official Architecture & Operations Plan  
**Target Budget**: LKR 0 / month ($0.00 USD)  
**Host Environment**: Local Windows 11 Workstation + Docker Desktop + Ephemeral Quick Tunnel  

---

## 1. Executive Summary

Because NEXORA Commerce operates under a strict **LKR 0 / month** hosting budget for the initial technical pilot, it leverages the developer's existing Windows 11 workstation running isolated Docker Compose containers rather than commercial cloud hosting instances.

To deliver a high-performance, uninterrupted experience to external testers while maintaining absolute data sovereignty and zero financial cost, this operational plan defines workstation power management, Docker resource allocation, network stability standards, and a scheduled demonstration operating model.

---

## 2. Demonstration Window Operating Model

Unlike a public production SaaS that remains continuously available 24/7/365, the zero-cost pilot operates on a **Supervised Demonstration Window** model:

```
[ Scheduled Demo Window (e.g. 2 Hours) ]
   ├── Step 1: Workstation AC Power & Awake Active
   ├── Step 2: Run start-local-staging.ps1
   ├── Step 3: Run start-tunnel.ps1 (Obtain trycloudflare.com URL)
   ├── Step 4: Run prepare-approved-host.ps1 -Hostname <url>
   ├── Step 5: Distribute URL + Pilot Invitation Passkey to Invited Testers
   ├── Step 6: Supervised Testing & Feedback Collection
   └── Step 7: Run stop-tunnel.ps1 & stop-local-staging.ps1 (Immediate Teardown)
```

### Key Operational Guarantees:
1. **Zero Unattended Exposure**: The external tunnel is NEVER left running unattended or overnight.
2. **Deterministic Uptime**: High availability is concentrated during agreed 1–2 hour testing slots.
3. **Instant Isolation**: Terminating `cloudflared` instantly cuts off external network ingress.

---

## 3. Workstation Hardware & Power Configuration

To prevent premature disconnection or dropped requests during live tester interactions:

### 3.1 Power Supply
- Workstations (particularly laptops) MUST be connected to mains AC power.
- Battery operation is prohibited during active demonstration sessions.

### 3.2 Sleep & Hibernation Prevention
- **Windows Power & Sleep**: Set "When plugged in, turn off my screen after" to 1 hour; set "Put my device to sleep after" to **Never**.
- **Microsoft PowerToys Awake**: Activate PowerToys Awake in "Keep awake indefinitely" or "Keep awake until expiration" mode (matching session duration).
- **Windows Update**: Pause Windows Updates during the demonstration day to prevent unexpected background reboots.

---

## 4. Docker Desktop Resource Allocation

To prevent staging containers from starving host workstation processes while ensuring rapid Next.js SSR response times:

| Resource | Recommended Allocation | Minimum Allocation |
| :--- | :--- | :--- |
| **Virtual CPUs** | 4 Cores | 2 Cores |
| **Memory (RAM)** | 4.0 GB | 2.5 GB |
| **Swap Space** | 1.0 GB | 512 MB |
| **Disk Storage** | 20 GB (WSL2 vhdx) | 10 GB |

### Container Memory Boundaries in `docker-compose.staging.yml`:
- `nexora-staging-app`: 1.5 GB memory limit.
- `nexora-staging-postgres`: 1.0 GB memory limit.
- `nexora-staging-worker`: 512 MB memory limit.

---

## 5. Network Connectivity & Bandwidth

Cloudflare Quick Tunnel proxies external client traffic through Cloudflare's global edge network down to the workstation's local port 3005:

- **Upstream Bandwidth**: Minimum 10 Mbps upstream connection recommended to stream product images and assets smoothly to remote mobile clients.
- **Connection Type**: Wired Gigabit Ethernet (preferred) or 5 GHz Wi-Fi within line-of-sight of the router. Avoid 2.4 GHz Wi-Fi or cellular tethering during demonstrations.
- **Port Conflict Safeguards**: Staging containers bind to external host ports `3005` (App) and `5433` (PostgreSQL), guaranteeing zero port conflict with development containers on ports `3000` and `5432`.

---

## 6. Pre-Demo Operator Checklist (T-15 Minutes)

- [ ] Connect workstation to AC mains power.
- [ ] Close bandwidth-heavy background software (torrents, steam, video rendering).
- [ ] Enable PowerToys Awake.
- [ ] Run `.\scripts\pilot\check-prerequisites.ps1`.
- [ ] Run `.\scripts\pilot\start-local-staging.ps1`.
- [ ] Run `.\scripts\pilot\check-staging-health.ps1` to confirm `ok` on `/api/health` and `/api/ready`.
- [ ] Confirm development database on port 5432 is untouched.

---

## 7. Post-Demo Teardown Protocol (T+0 Minutes)

Immediately upon concluding the tester demonstration session:
1. Run `.\scripts\pilot\stop-tunnel.ps1` (verifies all `cloudflared` processes killed).
2. Run `.\scripts\pilot\stop-local-staging.ps1` (shuts down staging containers).
3. Run `.\scripts\pilot\verify-cleanup.ps1` (confirms closed ports and clean state).
4. Deactivate PowerToys Awake.
