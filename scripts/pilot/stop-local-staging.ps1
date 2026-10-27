# ==============================================================================
# NEXORA Commerce — Stop Local Staging Environment
# Safely shuts down staging containers (PostgreSQL, App, Worker).
# Persistent database volumes are preserved.
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Shutting Down Local Staging Stack              " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Ensure any external tunnel is stopped first
$tunnelProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($tunnelProcesses) {
    Write-Host "Stopping active cloudflared tunnel..." -ForegroundColor Yellow
    Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
}

# Stop Docker staging services
Write-Host "Stopping staging Docker containers..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nAll staging containers stopped safely." -ForegroundColor Green
    Write-Host "Persistent volumes preserved for future sessions." -ForegroundColor Gray
} else {
    Write-Host "`nDocker compose down completed with code $LASTEXITCODE." -ForegroundColor Yellow
}

Write-Host "==================================================================" -ForegroundColor Cyan
