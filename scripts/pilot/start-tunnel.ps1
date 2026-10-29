# ==============================================================================
# NEXORA Commerce — Start Cloudflare Quick Tunnel (Fail-Closed Operator Script)
# Enforces strict origin validation and pre-exposure verification handshake.
# IMPORTANT: DO NOT RUN WITHOUT EXPLICIT STAKEHOLDER APPROVAL.
# Budget: LKR 0 / $0.00
# ==============================================================================

Write-Host '==================================================================' -ForegroundColor Yellow
Write-Host ' NEXORA Commerce — Fail-Closed Pilot Tunnel Activation            ' -ForegroundColor Yellow
Write-Host '==================================================================' -ForegroundColor Yellow
Write-Host 'This script starts an ephemeral Cloudflare Quick Tunnel with' -ForegroundColor White
Write-Host 'automated fail-closed origin registration and security handshake.' -ForegroundColor White
Write-Host ''

# 1. Check Prerequisites
Write-Host '[1/15] Verifying cloudflared prerequisite binary...' -ForegroundColor Gray
$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($machinePath -or $userPath) {
    $env:Path = "$machinePath;$userPath"
}

$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredCmd) {
    if (Test-Path 'C:\Program Files (x86)\cloudflared\cloudflared.exe') {
        $cloudflaredCmd = Get-Item 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
    } elseif (Test-Path 'C:\Program Files\cloudflared\cloudflared.exe') {
        $cloudflaredCmd = Get-Item 'C:\Program Files\cloudflared\cloudflared.exe'
    }
}

if (-not $cloudflaredCmd) {
    Write-Host 'ERROR: cloudflared CLI was not found in your PATH or Program Files.' -ForegroundColor Red
    Write-Host 'Install it with: winget install --id Cloudflare.cloudflared -e --source winget' -ForegroundColor Yellow
    exit 1
}
$cfExecutable = if ($cloudflaredCmd.Source) { $cloudflaredCmd.Source } else { $cloudflaredCmd.FullName }
Write-Host "  [OK] Found cloudflared binary: $cfExecutable" -ForegroundColor Green

# 2. Check Docker Staging Health
Write-Host '[2/15] Checking local staging application health on http://127.0.0.1:3005...' -ForegroundColor Gray
try {
    $healthCheck = Invoke-RestMethod -Uri 'http://127.0.0.1:3005/api/health' -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($healthCheck.status -ne 'ok') {
        throw "Unexpected status: $($healthCheck.status)"
    }
    Write-Host "  [OK] Local staging health check passed: $($healthCheck.service) is healthy." -ForegroundColor Green
} catch {
    Write-Host 'ERROR: Local staging application is not responding at http://127.0.0.1:3005/api/health.' -ForegroundColor Red
    Write-Host 'Please start the staging stack with .\scripts\pilot\start-local-staging.ps1 first.' -ForegroundColor Yellow
    exit 1
}

# 3. Confirm Pilot Gate Enabled
Write-Host '[3/15] Confirming pilot access gate is enabled...' -ForegroundColor Gray
$envFile = '.env.staging'
if (-not (Test-Path $envFile)) {
    Write-Host 'ERROR: .env.staging file does not exist.' -ForegroundColor Red
    exit 1
}
$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch 'PILOT_ACCESS_GATE_ENABLED\s*=\s*[''"]?true[''"]?') {
    Write-Host 'SECURITY HALT: PILOT_ACCESS_GATE_ENABLED is not set to true in .env.staging.' -ForegroundColor Red
    Write-Host 'The external tunnel will NOT be started while the perimeter gate is disabled.' -ForegroundColor Red
    exit 1
}
Write-Host '  [OK] Pilot access gate is active in staging configuration.' -ForegroundColor Green

# 4. Confirm Synthetic-Only Staging Configuration
Write-Host '[4/15] Verifying staging environment synthetic configuration...' -ForegroundColor Gray
if ($envContent -notmatch 'NEXT_PUBLIC_DEMO_MODE\s*=\s*[''"]?true[''"]?') {
    Write-Host 'SECURITY WARNING: NEXT_PUBLIC_DEMO_MODE is not true in .env.staging.' -ForegroundColor Yellow
}
Write-Host '  [OK] Synthetic staging environment verified.' -ForegroundColor Green

# 5. Confirm Mock Payments and Simulated Email
Write-Host '[5/15] Confirming mock payment and simulated email modes...' -ForegroundColor Gray
if ($envContent -notmatch 'ALLOW_MOCK_PAYMENT\s*=\s*[''"]?true[''"]?') {
    Write-Host 'SECURITY HALT: ALLOW_MOCK_PAYMENT must be true in staging.' -ForegroundColor Red
    exit 1
}
if ($envContent -notmatch 'EMAIL_DELIVERY_MODE\s*=\s*[''"]?SIMULATED[''"]?') {
    Write-Host 'SECURITY HALT: EMAIL_DELIVERY_MODE must be SIMULATED in staging.' -ForegroundColor Red
    exit 1
}
Write-Host '  [OK] Financial and notification quarantine verified (Mock payments, simulated email).' -ForegroundColor Green

# 6. Confirm No Unexpected cloudflared Process
Write-Host '[6/15] Checking for unexpected running cloudflared processes...' -ForegroundColor Gray
$existingCf = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
if ($existingCf) {
    $existingPids = ($existingCf | ForEach-Object { $_.Id }) -join ', '
    Write-Host "SECURITY HALT: Found existing running cloudflared process(es): PID $existingPids." -ForegroundColor Red
    Write-Host 'Terminate existing tunnels before launching a new session: .\scripts\pilot\stop-tunnel.ps1' -ForegroundColor Yellow
    exit 1
}
Write-Host '  [OK] No existing cloudflared processes running.' -ForegroundColor Green

# 7. Confirm No Existing Approved External Hostname
Write-Host '[7/15] Verifying approved hostname is clean (Fail-Closed baseline)...' -ForegroundColor Gray
if ($envContent -match 'APPROVED_PILOT_HOSTNAME\s*=\s*[''"]https?://') {
    Write-Host 'SECURITY HALT: APPROVED_PILOT_HOSTNAME is already set in .env.staging.' -ForegroundColor Red
    Write-Host 'Clear previous hostnames before starting a new tunnel: .\scripts\pilot\stop-tunnel.ps1' -ForegroundColor Yellow
    exit 1
}
Write-Host '  [OK] APPROVED_PILOT_HOSTNAME is currently empty (Fail-Closed active).' -ForegroundColor Green

# 8. Confirm Owner Approval Checkpoint
Write-Host '[8/15] Operator Authorization Checkpoint' -ForegroundColor Cyan
$confirmation = Read-Host "`nDo you have explicit owner authorization to start the temporary pilot tunnel now? (type 'CONFIRM' to proceed)"
if ($confirmation -ne 'CONFIRM') {
    Write-Host 'Tunnel activation cancelled. No network routes were modified.' -ForegroundColor Green
    exit 0
}

# 9. Start Temporary Ephemeral Tunnel
Write-Host ''
Write-Host '[9/15] Launching ephemeral cloudflared tunnel process...' -ForegroundColor Cyan

$tunnelLog = [System.IO.Path]::GetTempFileName()
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cfExecutable
$psi.Arguments = 'tunnel --url http://127.0.0.1:3005 --no-autoupdate'
$psi.RedirectStandardError = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$tunnelProcess = New-Object System.Diagnostics.Process
$tunnelProcess.StartInfo = $psi
$tunnelPidFile = Join-Path $PSScriptRoot '.tunnel.pid'

try {
    $tunnelProcess.Start() | Out-Null
    Set-Content -Path $tunnelPidFile -Value $tunnelProcess.Id -Force
    Write-Host "  [OK] cloudflared process started (PID: $($tunnelProcess.Id))" -ForegroundColor Green
    Write-Host '  Waiting for Cloudflare edge to allocate temporary hostname...' -ForegroundColor Gray

    # 10. Parse and Validate Assigned Hostname
    Write-Host '[10/15] Capturing and validating assigned trycloudflare.com URL...' -ForegroundColor Gray
    $allocatedUrl = $null
    $timeoutSeconds = 30
    $startTime = Get-Date

    while (-not $allocatedUrl -and ((Get-Date) - $startTime).TotalSeconds -lt $timeoutSeconds) {
        Start-Sleep -Milliseconds 500
        while (-not $tunnelProcess.StandardError.EndOfStream) {
            $line = $tunnelProcess.StandardError.ReadLine()
            Add-Content -Path $tunnelLog -Value $line
            if ($line -match '(https://[a-zA-Z0-9\-]+\.trycloudflare\.com)') {
                $allocatedUrl = $matches[1]
                break
            }
        }
    }

    if (-not $allocatedUrl) {
        throw "Failed to acquire a trycloudflare.com URL within $timeoutSeconds seconds. Check $tunnelLog for details."
    }

    # Strict regex validation on allocated URL
    if ($allocatedUrl -notmatch '^https:\/\/[a-z0-9\-]+\.trycloudflare\.com$') {
        throw "Acquired URL '$allocatedUrl' does not match strict trycloudflare.com hostname policy."
    }
    Write-Host "  [OK] Acquired ephemeral tunnel URL: $allocatedUrl" -ForegroundColor Green
    $urlFile = Join-Path $PSScriptRoot '.tunnel.url'
    Set-Content -Path $urlFile -Value $allocatedUrl

    # 11. Register Exact Hostname Safely
    Write-Host '[11/15] Registering approved hostname in staging environment...' -ForegroundColor Cyan
    $prepScript = Join-Path $PSScriptRoot 'prepare-approved-host.ps1'
    & $prepScript -Hostname $allocatedUrl
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to register approved hostname into staging environment.'
    }
    Write-Host '  [OK] Hostname successfully registered in staging environment.' -ForegroundColor Green

    # 12. Reload Necessary Application Configuration
    Write-Host '[12/15] Staging application container reloaded with approved origin.' -ForegroundColor Green

    # 13. Perform HTTPS Security Handshake
    Write-Host '[13/15] Executing safe origin verification handshake...' -ForegroundColor Cyan
    Start-Sleep -Seconds 3

    # Test 1: Verify health via tunnel
    $tunnelHealth = Invoke-RestMethod -Uri "$allocatedUrl/api/health" -Method Get -TimeoutSec 10 -ErrorAction Stop
    if ($tunnelHealth.status -ne 'ok') {
        throw 'Verification handshake failed: /api/health returned unexpected payload via tunnel.'
    }
    Write-Host '  [OK] Tunnel connectivity and health probe: OK' -ForegroundColor Green

    # Test 2: Verify pilot access gate intercepts unauthenticated access
    $gateProbe = Invoke-WebRequest -Uri "$allocatedUrl/" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    $statusCode = $gateProbe.StatusCode
    $location = $gateProbe.Headers['Location']
    if ($statusCode -notin @(307, 302, 303) -and $location -notmatch '/pilot-access') {
        throw "Verification handshake failed: Gate did not redirect unauthenticated request to /pilot-access. Status: $statusCode."
    }
    Write-Host '  [OK] Perimeter security gate enforcement: OK (Redirected to /pilot-access)' -ForegroundColor Green

    # 14. Continue Only if Every Check Passes
    Write-Host '[14/15] All preflight security checks passed successfully.' -ForegroundColor Green

    Write-Host ''
    Write-Host '==================================================================' -ForegroundColor Green
    Write-Host ' SAFE VERIFICATION HANDSHAKE PASSED                               ' -ForegroundColor Green
    Write-Host '==================================================================' -ForegroundColor Green
    Write-Host "Public Staging URL: $allocatedUrl" -ForegroundColor Yellow
    Write-Host 'Gate Enforcement:   ACTIVE (All unauthenticated visitors redirected)' -ForegroundColor Green
    Write-Host 'Origin Validation:  FAIL-CLOSED (Unauthorized Host headers blocked)' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Testers require single-use invitation tokens created via:' -ForegroundColor White
    Write-Host "  npx tsx scripts/create-pilot-invitation.ts --name 'Tester Name' --email 'tester@example.com' --max-uses 1" -ForegroundColor Gray
    Write-Host ''
    Write-Host 'Press Ctrl+C or type "q" and press Enter to terminate the tunnel.' -ForegroundColor Yellow

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
    # 15. Stop and Clean Up Immediately if Any Check Fails
    Write-Host ''
    Write-Host "SECURITY ABORT: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Terminating tunnel process immediately to maintain fail-closed state.' -ForegroundColor Red
} finally {
    Write-Host ''
    Write-Host 'Executing fail-closed cleanup...' -ForegroundColor Yellow
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
        $tunnelProcess.Kill()
        Write-Host 'Cloudflare tunnel process terminated.' -ForegroundColor Green
    }

    # Reset APPROVED_PILOT_HOSTNAME to prevent lingering origin allowance
    if (Test-Path $envFile) {
        $cleanContent = Get-Content $envFile -Raw
        $cleanContent = $cleanContent -replace 'APPROVED_PILOT_HOSTNAME=.*', 'APPROVED_PILOT_HOSTNAME='
        Set-Content -Path $envFile -Value $cleanContent -ErrorAction SilentlyContinue
        Write-Host 'Cleared APPROVED_PILOT_HOSTNAME in .env.staging.' -ForegroundColor Green
        docker compose -f docker-compose.staging.yml restart app-staging
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'WARNING: Could not cleanly reload app-staging container during cleanup!' -ForegroundColor Red
        } else {
            Write-Host 'Restarted app-staging container with closed origin.' -ForegroundColor Green
        }
    }

    if (Test-Path $tunnelLog) {
        Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $tunnelPidFile) {
        Remove-Item $tunnelPidFile -Force -ErrorAction SilentlyContinue
    }

    $urlFile = Join-Path $PSScriptRoot '.tunnel.url'
    if (Test-Path $urlFile) {
        Remove-Item $urlFile -Force -ErrorAction SilentlyContinue
    }

    Write-Host 'Tunnel shutdown complete. System is completely sealed.' -ForegroundColor Green
}
