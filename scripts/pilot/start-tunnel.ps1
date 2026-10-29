# ==============================================================================
# NEXORA Commerce — Start Cloudflare Quick Tunnel (Fail-Closed Operator Script)
# Enforces strict origin validation and pre-exposure verification handshake.
# IMPORTANT: DO NOT RUN WITHOUT EXPLICIT STAKEHOLDER APPROVAL.
# Budget: LKR 0 / $0.00
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host " NEXORA Commerce — Fail-Closed Pilot Tunnel Activation            " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "This script starts an ephemeral Cloudflare Quick Tunnel with" -ForegroundColor White
Write-Host "automated fail-closed origin registration and security handshake." -ForegroundColor White
Write-Host ""

# 1. Verify Prerequisites
$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredCmd) {
    Write-Host "ERROR: cloudflared CLI was not found in your PATH." -ForegroundColor Red
    Write-Host "Install it with: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}

$envFile = ".env.staging"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.staging file does not exist. Run start-local-staging.ps1 first." -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch "PILOT_ACCESS_GATE_ENABLED\s*=\s*[\"']?true[\"']?") {
    Write-Host "SECURITY HALT: PILOT_ACCESS_GATE_ENABLED is not set to 'true' in $envFile." -ForegroundColor Red
    Write-Host "The external tunnel will NOT be started while the perimeter gate is disabled." -ForegroundColor Red
    exit 1
}

# 2. Check local staging health before opening tunnel
Write-Host "Checking local staging application health on http://localhost:3005..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3005/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($healthCheck.status -ne "ok") {
        throw "Unexpected status: $($healthCheck.status)"
    }
    Write-Host "Local staging health check passed: $($healthCheck.service) is healthy." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Local staging application is not responding at http://localhost:3005/api/health." -ForegroundColor Red
    Write-Host "Please start the staging stack with .\scripts\pilot\start-local-staging.ps1 first." -ForegroundColor Yellow
    exit 1
}

# 3. Require explicit confirmation
$confirmation = Read-Host "`nDo you have explicit authorization to open the pilot tunnel now? (type 'CONFIRM' to proceed)"
if ($confirmation -ne "CONFIRM") {
    Write-Host "Tunnel activation cancelled. No network routes were modified." -ForegroundColor Green
    exit 0
}

Write-Host "`n[1/4] Launching ephemeral cloudflared tunnel process..." -ForegroundColor Cyan

# Prepare log file for cloudflared output
$tunnelLog = [System.IO.Path]::GetTempFileName()
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cloudflared"
$psi.Arguments = "tunnel --url http://localhost:3005 --no-autoupdate"
$psi.RedirectStandardError = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$tunnelProcess = New-Object System.Diagnostics.Process
$tunnelProcess.StartInfo = $psi

$tunnelPidFile = "$PSScriptRoot\.tunnel.pid"

try {
    $tunnelProcess.Start() | Out-Null
    Set-Content -Path $tunnelPidFile -Value $tunnelProcess.Id -Force
    Write-Host "Waiting for Cloudflare edge to allocate temporary hostname (PID: $($tunnelProcess.Id))..." -ForegroundColor Gray

    $allocatedUrl = $null
    $timeoutSeconds = 30
    $startTime = Get-Date

    while (-not $allocatedUrl -and ((Get-Date) - $startTime).TotalSeconds -lt $timeoutSeconds) {
        Start-Sleep -Milliseconds 500
        while (-not $tunnelProcess.StandardError.EndOfStream) {
            $line = $tunnelProcess.StandardError.ReadLine()
            Add-Content -Path $tunnelLog -Value $line
            if ($line -match "(https://[a-zA-Z0-9\-]+\.trycloudflare\.com)") {
                $allocatedUrl = $matches[1]
                break
            }
        }
    }

    if (-not $allocatedUrl) {
        throw "Failed to acquire a trycloudflare.com URL within $timeoutSeconds seconds. Check $tunnelLog for details."
    }

    # Strict regex validation on allocated URL
    if ($allocatedUrl -notmatch "^https:\/\/[a-z0-9\-]+\.trycloudflare\.com$") {
        throw "Acquired URL '$allocatedUrl' does not match strict trycloudflare.com hostname policy."
    }

    Write-Host "[2/4] Acquired ephemeral tunnel URL: $allocatedUrl" -ForegroundColor Green

    # Register hostname in .env.staging and reload app container
    Write-Host "[3/4] Registering approved hostname in staging environment and reloading origin gate..." -ForegroundColor Cyan
    & "$PSScriptRoot\prepare-approved-host.ps1" -Hostname $allocatedUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to register approved hostname into staging environment."
    }

    # Safe Verification Handshake
    Write-Host "[4/4] Executing safe origin verification handshake..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3

    # Test 1: Verify health via tunnel
    $tunnelHealth = Invoke-RestMethod -Uri "$allocatedUrl/api/health" -Method Get -TimeoutSec 10 -ErrorAction Stop
    if ($tunnelHealth.status -ne "ok") {
        throw "Verification handshake failed: /api/health returned unexpected payload via tunnel."
    }
    Write-Host "  ✓ Tunnel connectivity & health probe: OK" -ForegroundColor Green

    # Test 2: Verify pilot access gate intercepts unauthenticated access
    $gateProbe = Invoke-WebRequest -Uri "$allocatedUrl/" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    $statusCode = $gateProbe.StatusCode
    $location = $gateProbe.Headers["Location"]
    if ($statusCode -notin @(307, 302, 303) -and $location -notmatch "/pilot-access") {
        throw "Verification handshake failed: Gate did not redirect unauthenticated request to /pilot-access. Status: $statusCode."
    }
    Write-Host "  ✓ Perimeter security gate enforcement: OK (Redirected to /pilot-access)" -ForegroundColor Green

    # Handshake passed
    Write-Host "`n==================================================================" -ForegroundColor Green
    Write-Host " SAFE VERIFICATION HANDSHAKE PASSED                               " -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "Public Staging URL: $allocatedUrl" -ForegroundColor Yellow
    Write-Host "Gate Enforcement:   ACTIVE (All unauthenticated visitors redirected)" -ForegroundColor Green
    Write-Host "Origin Validation:  FAIL-CLOSED (Unauthorized Host headers blocked)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Testers require single-use invitation tokens created via:" -ForegroundColor White
    Write-Host "  npm run pilot:invite -- --name 'Tester Name'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press Ctrl+C or type 'q' and press Enter to terminate the tunnel.`n" -ForegroundColor Yellow

    # Monitor loop
    while (-not $tunnelProcess.HasExited) {
        Start-Sleep -Seconds 1
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.KeyChar -eq 'q' -or $key.KeyChar -eq 'Q') {
                break
            }
        }
    }

} catch {
    Write-Host "`nSECURITY ABORT: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Terminating tunnel process immediately to maintain fail-closed state." -ForegroundColor Red
} finally {
    Write-Host "`nExecuting fail-closed cleanup..." -ForegroundColor Yellow
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
        $tunnelProcess.Kill()
        Write-Host "Cloudflare tunnel process terminated." -ForegroundColor Green
    }

    # Reset APPROVED_PILOT_HOSTNAME to prevent lingering origin allowance
    if (Test-Path $envFile) {
        $cleanContent = Get-Content $envFile -Raw
        $cleanContent = $cleanContent -replace "APPROVED_PILOT_HOSTNAME=.*", "APPROVED_PILOT_HOSTNAME="
        Set-Content -Path $envFile -Value $cleanContent
        Write-Host "Cleared APPROVED_PILOT_HOSTNAME in $envFile." -ForegroundColor Green
        docker compose -f docker-compose.staging.yml restart app-staging 2>$null | Out-Null
        Write-Host "Restarted app-staging container with closed origin." -ForegroundColor Green
    }

    if (Test-Path $tunnelLog) {
        Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $tunnelPidFile) {
        Remove-Item $tunnelPidFile -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Tunnel shutdown complete. System is completely sealed." -ForegroundColor Green
}
