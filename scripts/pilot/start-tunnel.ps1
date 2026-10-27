# ==============================================================================
# NEXORA Commerce — Start Cloudflare Quick Tunnel (On-Demand Pilot Access)
# IMPORTANT: DO NOT RUN WITHOUT EXPLICIT STAKEHOLDER APPROVAL.
# Budget: LKR 0 / $0.00
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host " WARNING: EXTERNAL TUNNEL ACTIVATION                             " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "You are about to launch an ephemeral Cloudflare Quick Tunnel." -ForegroundColor White
Write-Host "This will generate a temporary public URL pointing to your" -ForegroundColor White
Write-Host "local staging instance (http://localhost:3005)." -ForegroundColor White
Write-Host ""
Write-Host "SECURITY REQUIREMENTS:" -ForegroundColor Cyan
Write-Host "1. Ensure PILOT_ACCESS_GATE_ENABLED=true in .env.staging." -ForegroundColor White
Write-Host "2. Have your PILOT_ACCESS_KEYS ready to provide to testers." -ForegroundColor White
Write-Host "3. Once cloudflared outputs your https://*.trycloudflare.com URL:" -ForegroundColor White
Write-Host "   Run: .\scripts\pilot\prepare-approved-host.ps1 -Hostname <your-url>" -ForegroundColor White
Write-Host "4. NEVER leave the tunnel running unattended." -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Yellow

# Verify cloudflared is installed
$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredCmd) {
    Write-Host "`nERROR: cloudflared CLI was not found in your PATH." -ForegroundColor Red
    Write-Host "Install it for zero cost with: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}

# Require explicit confirmation
$confirmation = Read-Host "`nDo you have explicit authorization to open the pilot tunnel now? (type 'CONFIRM' to proceed)"
if ($confirmation -ne "CONFIRM") {
    Write-Host "Tunnel activation cancelled. No network routes were modified." -ForegroundColor Green
    exit 0
}

Write-Host "`nStarting Cloudflare Quick Tunnel pointing to http://localhost:3005..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C at any time to terminate the tunnel.`n" -ForegroundColor Gray

# Launch cloudflared tunnel
cloudflared tunnel --url http://localhost:3005
