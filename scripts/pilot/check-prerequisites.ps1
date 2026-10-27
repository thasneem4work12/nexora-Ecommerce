# ==============================================================================
# NEXORA Commerce — Zero-Cost Pilot Prerequisites Check
# Evaluates local Windows 11 workstation readiness for zero-cost staging pilot.
# Budget: LKR 0 / $0.00
# ==============================================================================

Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' NEXORA Commerce — Zero-Cost Pilot Prerequisites Verification     ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan

$allPassed = $true

# 1. Check Node.js
Write-Host "`n[1/6] Checking Node.js installation..." -NoNewline
try {
    $nodeVersion = node -v
    Write-Host " OK ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Host ' FAILED (Node.js not found in PATH)' -ForegroundColor Red
    $allPassed = $false
}

# 2. Check Docker Daemon
Write-Host '[2/6] Checking Docker Desktop daemon status...' -NoNewline
try {
    $dockerInfo = docker info --format '{{.ServerVersion}}' 2>$null
    if ($dockerInfo) {
        Write-Host " OK (Docker Engine v$dockerInfo)" -ForegroundColor Green
    } else {
        Write-Host ' FAILED (Docker daemon is not running)' -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host ' FAILED (Docker CLI not accessible)' -ForegroundColor Red
    $allPassed = $false
}

# 3. Check Staging Environment Configuration
Write-Host '[3/6] Checking .env.staging configuration...' -NoNewline
if (Test-Path '.env.staging') {
    Write-Host ' OK (.env.staging exists)' -ForegroundColor Green
} else {
    Write-Host ' WARNING (.env.staging not found, copy from .env.staging.example)' -ForegroundColor Yellow
    Write-Host '    Run: Copy-Item .env.staging.example .env.staging' -ForegroundColor Gray
}

# 4. Check Port 3005 (Staging App Port)
Write-Host '[4/6] Checking port 3005 (Staging App)...' -NoNewline
$port3005 = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
if ($port3005) {
    Write-Host " IN USE (Process ID: $($port3005.OwningProcess))" -ForegroundColor Yellow
} else {
    Write-Host ' AVAILABLE' -ForegroundColor Green
}

# 5. Check Port 5433 (Staging PostgreSQL Port)
Write-Host '[5/6] Checking port 5433 (Staging Database)...' -NoNewline
$port5433 = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if ($port5433) {
    Write-Host " IN USE (Process ID: $($port5433.OwningProcess))" -ForegroundColor Yellow
} else {
    Write-Host ' AVAILABLE' -ForegroundColor Green
}

# 6. Check cloudflared CLI (Optional for local-only, required for tunnel)
Write-Host '[6/6] Checking cloudflared CLI availability...' -NoNewline
$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredCmd) {
    Write-Host " OK (Found at $($cloudflaredCmd.Source))" -ForegroundColor Green
} else {
    Write-Host ' NOT DETECTED (Optional for local staging; required only if opening Quick Tunnel)' -ForegroundColor Gray
    Write-Host '    Zero-cost download: winget install Cloudflare.cloudflared' -ForegroundColor Gray
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host ' Prerequisites Check: READY FOR LOCAL STAGING' -ForegroundColor Green
} else {
    Write-Host ' Prerequisites Check: ISSUES DETECTED. Review errors above.' -ForegroundColor Red
}
Write-Host '==================================================================' -ForegroundColor Cyan
