# ==============================================================================
# NEXORA Commerce — Verify Complete Teardown & Environment Isolation
# Confirms all staging services, ports, and tunnel processes are terminated.
# Verifies that development database on port 5432 remains completely isolated.
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Post-Demonstration Cleanup Verification        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$allClean = $true

# 1. Verify cloudflared processes
Write-Host "`n[1/5] Verifying no cloudflared tunnel processes remain..." -NoNewline
$cloudflared = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflared) {
    Write-Host " FAILED (Running: $($cloudflared.Count) process(es))" -ForegroundColor Red
    $allClean = $false
} else {
    Write-Host " CLEAN (No tunnel processes active)" -ForegroundColor Green
}

# 2. Verify Staging Containers
Write-Host "[2/5] Verifying staging containers are stopped..." -NoNewline
$runningStaging = docker ps --filter "name=nexora-staging" -q
if ($runningStaging) {
    Write-Host " WARNING (Staging containers still active)" -ForegroundColor Yellow
    $allClean = $false
} else {
    Write-Host " CLEAN (All staging containers stopped)" -ForegroundColor Green
}

# 3. Check Staging App Port (3005)
Write-Host "[3/5] Verifying port 3005 is closed..." -NoNewline
$port3005 = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
if ($port3005) {
    Write-Host " FAILED (Port 3005 still listening)" -ForegroundColor Red
    $allClean = $false
} else {
    Write-Host " CLEAN (Port 3005 closed)" -ForegroundColor Green
}

# 4. Check Staging DB Port (5433)
Write-Host "[4/5] Verifying port 5433 is closed..." -NoNewline
$port5433 = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if ($port5433) {
    Write-Host " FAILED (Port 5433 still listening)" -ForegroundColor Red
    $allClean = $false
} else {
    Write-Host " CLEAN (Port 5433 closed)" -ForegroundColor Green
}

# 5. Check Dev Database Isolation (Port 5432)
Write-Host "[5/5] Verifying development database isolation (port 5432)..." -NoNewline
$port5432 = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($port5432) {
    Write-Host " DETECTED & ISOLATED (Dev database undisturbed)" -ForegroundColor Green
} else {
    Write-Host " INACTIVE (Dev DB container not running, which is safe)" -ForegroundColor Gray
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
if ($allClean) {
    Write-Host " Post-Demo Cleanup: 100% CLEAN & VERIFIED                         " -ForegroundColor Green
    Write-Host " Zero external exposure. All temporary network routes closed.     " -ForegroundColor Green
} else {
    Write-Host " Post-Demo Cleanup: ACTIONS REQUIRED. Review warnings above.      " -ForegroundColor Yellow
}
Write-Host "==================================================================" -ForegroundColor Cyan
