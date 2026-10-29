# NEXORA Commerce — Windows 11 Cloudflared Installation & Verification Guide

**Date:** October 29, 2026  
**Host Platform:** Windows 11 Pro / Enterprise (Build 22631, 23H2)  
**Package:** `Cloudflare.cloudflared` (Official Cloudflare Tunnel Daemon)  
**Security Baseline:** Private Local Staging Isolated on Loopback `127.0.0.1`  
**Financial Budget:** LKR 0.00 / $0.00 (Zero hosting or software licensing expense)  

---

## 1. Executive Summary & Security Boundary

This document specifies the verified procedure for installing, inspecting, and auditing the official Cloudflare `cloudflared` command-line interface on Windows 11 for the **NEXORA Commerce Zero-Cost Technical Pilot**.

### Strict Operational Boundary
- **No Tunnel Running:** The daemon is never started as a background service or persistent process.
- **No Internet Exposure:** The local staging environment remains bound strictly to loopback (`127.0.0.1`).
- **No Unauthorized Software Changes:** Software installation is never executed automatically; it requires explicit owner approval.
- **Zero Cost:** The official Cloudflare CLI and Quick Tunnel features operate entirely within the free tier with zero subscription obligations.

---

## 2. Installation Prerequisites

The host machine has been audited with read-only inspection commands:

| Prerequisite Component | Detected Host Version | Compatibility Status | Notes |
|:---|:---:|:---:|:---|
| **Operating System** | Windows 11 (Build 22631.4391) | **COMPATIBLE** | Supported 64-bit architecture |
| **PowerShell** | 5.1.22621.4391 | **COMPATIBLE** | Built-in Windows PowerShell |
| **Windows Package Manager** | `winget` v1.29.380 | **COMPATIBLE** | Official Microsoft package client ready |
| **Docker Compose** | v2.x with Docker Desktop | **HEALTHY** | Staging stack active on `127.0.0.1:3005` |
| **Staging DB Isolation** | PostgreSQL 16 on `127.0.0.1:5433` | **HEALTHY** | Development DB on port 5432 untouched |

---

## 3. Official Package Information

The package metadata was queried directly from the official Microsoft Windows Package Manager repository (`winget show --id Cloudflare.cloudflared -e --source winget`):

- **Package Identifier:** `Cloudflare.cloudflared`
- **Moniker:** `cloudflared`
- **Publisher:** `cloudflare` (Cloudflare, Inc.)
- **Official Publisher URL:** [https://www.cloudflare.com/](https://www.cloudflare.com/)
- **Repository Source:** `winget` (Official Community Repository)
- **Verified Package Version:** `2026.10.5`
- **License:** `Apache-2.0` (Open Source)
- **Installer Type:** `wix` (Windows Installer MSI)
- **Installer URL:** `https://github.com/cloudflare/cloudflared/releases/download/2026.10.5/cloudflared-windows-amd64.msi`
- **Installer SHA-256 Digest:** `13de1bd2d40f0d896fc7875d663f9180c1bace50981349cd323f50711643d01d`
- **Release Date:** October 27, 2026
- **Offline Distribution Supported:** Yes

> [!IMPORTANT]
> Never download or execute `cloudflared.exe` from third-party websites or untrusted package repositories. Always verify that the publisher is `cloudflare` and the source is `winget`.

---

## 4. Installation Command & Approval Checkpoint

To prevent unintentional modifications to the operator's workstation, the installation command must be reviewed and explicitly authorized by the project owner prior to execution.

### Exact Installation Command
```powershell
winget install --id Cloudflare.cloudflared -e --source winget
```

### Installation Parameters Explained
- `--id Cloudflare.cloudflared`: Targets the exact official package identifier.
- `-e` (`--exact`): Enforces an exact, case-sensitive match to prevent typosquatting attacks.
- `--source winget`: Explicitly restricts the download source to the official Microsoft `winget` repository.

---

## 5. Post-Installation Verification Commands

Once approved and executed by the operator, run the following commands to verify that `cloudflared` is correctly registered in the system environment:

### Step 1: Check CLI Version
```powershell
cloudflared --version
```
*Expected Output:*
```
cloudflared version 2026.10.5 (built 2026-10-27-...)
```

### Step 2: Check Command Path Resolution
```powershell
Get-Command cloudflared | Select-Object -Property Name, Source, CommandType
```
*Expected Output:*
```
Name            Source                                                      CommandType
----            ------                                                      -----------
cloudflared.exe C:\Program Files (x86)\cloudflared\cloudflared.exe          Application
```

### Step 3: Check Installed Package Record
```powershell
winget list --id Cloudflare.cloudflared -e
```
*Expected Output:*
```
Name        Id                     Version   Source
---------------------------------------------------
cloudflared Cloudflare.cloudflared 2026.10.5 winget
```

### Step 4: Run the Automated Verification Script
Execute the dedicated read-only verification script:
```powershell
.\scripts\pilot\verify-cloudflared-installation.ps1
```

---

## 6. Staging Network Isolation Audit

To guarantee that NEXORA cannot be accessed across the local area network (LAN / Wi-Fi) prior to explicit tunnel establishment, the staging stack port bindings in `docker-compose.staging.yml` are restricted to the local loopback interface (`127.0.0.1`):

| Service | Container Name | Host Port Binding | Scope | Security Assessment |
|:---|:---|:---:|:---:|:---|
| **Next.js Web App** | `nexora-staging-app` | `127.0.0.1:3005:3000` | Loopback only | **SECURE** — Inaccessible to LAN peers |
| **Staging PostgreSQL** | `nexora-staging-postgres` | `127.0.0.1:5433:5432` | Loopback only | **SECURE** — Inaccessible to LAN peers |
| **Background Worker** | `nexora-staging-worker` | *None* | Internal bridge only | **SECURE** — Zero published host ports |
| **Development PostgreSQL**| `nexora-postgres` | `0.0.0.0:5432:5432` | Isolated dev DB | **SECURE** — 100% separate volume/schema |

---

## 7. Security Checks & Exposure Audit

The following checks confirm that the system is completely sealed:

1. **Process Audit:**
   ```powershell
   Get-Process -Name cloudflared -ErrorAction SilentlyContinue
   ```
   *Result:* Returns no active processes.

2. **Windows Service Audit:**
   ```powershell
   Get-Service -Name *cloudflare* -ErrorAction SilentlyContinue
   ```
   *Result:* Returns no registered Windows services. The daemon does NOT run on boot.

3. **Origin Shield Audit:**
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/pilot/status"
   ```
   *Result:* `gateEnabled: true`, `isUnlocked: false`, `approvedHostnameConfigured: false`.

4. **Edge Host Header Validation:**
   Any request with a Host header that does not match `127.0.0.1` or `localhost` receives `HTTP 403 Forbidden` (`INVALID_HOST_HEADER`).

---

## 8. Troubleshooting & Common Questions

### Issue: `winget` command not found
- **Cause:** Running an older Windows 10/11 build or Windows Server without App Installer.
- **Solution:** Install the App Installer package from Microsoft Store or GitHub releases (`microsoft/winget-cli`). On Windows 11 Build 22631, `winget` is pre-installed (`v1.29.380`).

### Issue: `cloudflared` command not found in PowerShell immediately after install
- **Cause:** Current PowerShell session has an outdated `$env:PATH` environment cache.
- **Solution:** Close and reopen the PowerShell terminal, or refresh the path:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```

### Issue: Accidentally started `cloudflared` as a Windows service
- **Cause:** Running `cloudflared service install`.
- **Solution:** Immediately remove the service:
  ```powershell
  cloudflared service uninstall
  ```
  NEXORA's zero-cost pilot exclusively uses ephemeral, user-managed processes.

---

## 9. Current Limitations & Pre-Execution Status

- **Status:** **PREPARATION COMPLETE — AWAITING INSTALLATION APPROVAL**
- **Binary State:** Missing from host PATH (not yet installed).
- **Network State:** Local staging healthy and sealed on `127.0.0.1`.
- **Tunnel State:** Never opened.
- **Approval Checkpoint:** The operator must run the installation command or grant permission before live tunnel verification can proceed.
