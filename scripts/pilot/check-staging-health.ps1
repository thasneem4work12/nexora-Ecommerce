# ==============================================================================
# NEXORA Commerce — Check Staging Health & Service Status
# Probes running staging containers, health/readiness endpoints, and background worker.
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Staging Infrastructure Health Inspection       " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Container Status
Write-Host "`n[1/4] Inspecting Docker Compose Staging Services..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml ps

# 2. Application Health Probe
Write-Host "`n[2/4] Querying Application Health (/api/health)..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3005/api/health" -Method Get -TimeoutSec 5
    Write-Host " Status: $($health.status)" -ForegroundColor Green
    Write-Host " Response: $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host " Failed to connect to /api/health: $_" -ForegroundColor Red
}

# 3. Application Readiness Probe
Write-Host "`n[3/4] Querying Application Readiness (/api/ready)..." -ForegroundColor Cyan
try {
    $ready = Invoke-RestMethod -Uri "http://localhost:3005/api/ready" -Method Get -TimeoutSec 5
    Write-Host " Status: $($ready.status)" -ForegroundColor Green
    Write-Host " Database: $($ready.checks.database)" -ForegroundColor Gray
    Write-Host " Storage:  $($ready.checks.storage)" -ForegroundColor Gray
} catch {
    Write-Host " Failed to connect to /api/ready: $_" -ForegroundColor Red
}

# 4. Background Worker Inspection
Write-Host "`n[4/4] Inspecting Background Worker Sweep Logs..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml logs --tail 15 worker-staging

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " Health inspection completed.                                     " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
