param (
    [string]$Hostname
)

# ==============================================================================
# NEXORA Commerce — Prepare Approved Pilot Hostname
# Validates and registers an ephemeral tunnel URL into the staging environment.
# Enforces strict origin security: NO wildcards, HTTPS only.
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Approved Pilot Hostname Configuration          " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

if (-not $Hostname) {
    $Hostname = Read-Host "Enter the ephemeral tunnel URL (e.g. https://your-tunnel.trycloudflare.com)"
}

$Hostname = $Hostname.Trim()

# 1. Validation: Must start with https://
if (-not ($Hostname.StartsWith("https://"))) {
    Write-Host "ERROR: Hostname must use HTTPS protocol (starts with https://)." -ForegroundColor Red
    exit 1
}

# 2. Validation: Must not contain wildcards
if ($Hostname.Contains("*")) {
    Write-Host "SECURITY ERROR: Wildcard hostnames (*) are strictly forbidden." -ForegroundColor Red
    exit 1
}

# 3. Parse and validate URL
try {
    $uri = [System.Uri]::new($Hostname)
    if ($uri.Host.Length -lt 4) {
        throw "Host too short"
    }
} catch {
    Write-Host "ERROR: Invalid URL format: $Hostname" -ForegroundColor Red
    exit 1
}

Write-Host "Validating host: $($uri.Host)... OK" -ForegroundColor Green

# 4. Inject into .env.staging
$envFile = ".env.staging"
if (-not (Test-Path $envFile)) {
    Copy-Item .env.staging.example $envFile
}

$content = Get-Content $envFile -Raw
if ($content -match "APPROVED_PILOT_HOSTNAME=.*") {
    $content = $content -replace "APPROVED_PILOT_HOSTNAME=.*", "APPROVED_PILOT_HOSTNAME=$Hostname"
} else {
    $content += "`nAPPROVED_PILOT_HOSTNAME=$Hostname`n"
}

Set-Content -Path $envFile -Value $content
Write-Host "Updated APPROVED_PILOT_HOSTNAME=$Hostname in $envFile" -ForegroundColor Green

# 5. Reload application container to apply origin updates
Write-Host "Restarting app-staging container to reload trusted origins..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml restart app-staging

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " Approved pilot host registration complete.                       " -ForegroundColor Green
Write-Host " Host: $Hostname" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
