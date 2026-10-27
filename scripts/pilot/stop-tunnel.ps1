# ==============================================================================
# NEXORA Commerce — Stop Cloudflare Quick Tunnel
# Terminates all running cloudflared tunnel processes immediately.
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Terminating External Pilot Tunnel              " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$tunnelProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue

if ($tunnelProcesses) {
    Write-Host "Found $($tunnelProcesses.Count) running cloudflared process(es). Terminating..." -ForegroundColor Yellow
    Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "All cloudflared processes stopped successfully." -ForegroundColor Green
} else {
    Write-Host "No active cloudflared processes found." -ForegroundColor Gray
}

# Optional cleanup of APPROVED_PILOT_HOSTNAME in .env.staging
$envFile = ".env.staging"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "APPROVED_PILOT_HOSTNAME=https://.*") {
        $content = $content -replace "APPROVED_PILOT_HOSTNAME=https://.*", "APPROVED_PILOT_HOSTNAME="
        Set-Content -Path $envFile -Value $content
        Write-Host "Cleared APPROVED_PILOT_HOSTNAME in $envFile" -ForegroundColor Gray
    }
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " External tunnel access is CLOSED. Workstation is private.         " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
