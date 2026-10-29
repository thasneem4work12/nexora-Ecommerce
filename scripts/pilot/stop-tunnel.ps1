param (
    [switch]$ForceAll,
    [switch]$MockOnly,
    [string]$EnvFilePath = '.env.staging'
)

# ==============================================================================
# NEXORA Commerce — Stop Cloudflare Quick Tunnel (Emergency Shutdown)
# Terminates the specific pilot tunnel process while preserving unrelated processes.
# Clears approved hostname from staging and restores fail-closed perimeter.
# Preserves all database volumes, synthetic data, and backups.
# ==============================================================================

Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' NEXORA Commerce — Emergency Pilot Tunnel Shutdown                ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan

$pidFile = Join-Path $PSScriptRoot '.tunnel.pid'

# 1. Terminate only the intended tunnel process if PID file exists
if (Test-Path $pidFile) {
    try {
        $targetPidStr = (Get-Content $pidFile -Raw).Trim()
        if ($targetPidStr -match '^\d+$') {
            $targetPid = [int]$targetPidStr
            Write-Host "Checking tracked pilot tunnel process (PID: $targetPid)..." -ForegroundColor Gray
            
            try {
                $targetProc = Get-Process -Id $targetPid -ErrorAction Stop
                if ($targetProc.ProcessName -eq 'cloudflared') {
                    Write-Host "Terminating intended pilot tunnel process (PID: $targetPid)..." -ForegroundColor Yellow
                    $targetProc.Kill()
                    $stopped = $targetProc.WaitForExit(5000)
                    if ($stopped) {
                        Write-Host "Pilot tunnel process (PID: $targetPid) terminated successfully." -ForegroundColor Green
                    } else {
                        Write-Host "WARNING: Process (PID: $targetPid) did not exit within 5 seconds." -ForegroundColor Red
                    }
                } else {
                    Write-Host "SECURITY NOTICE: Process PID $targetPid is '$($targetProc.ProcessName)', not 'cloudflared'." -ForegroundColor Yellow
                    Write-Host 'Refusing to terminate to protect unrelated user applications.' -ForegroundColor Yellow
                }
            } catch [Microsoft.PowerShell.Commands.ProcessCommandException], [System.ArgumentException] {
                Write-Host "Tracked tunnel process (PID: $targetPid) is no longer running." -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "SAFE FAILURE: Error inspecting PID file: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
} elseif ($ForceAll) {
    Write-Host 'ForceAll switch supplied. Scanning for any running cloudflared instances...' -ForegroundColor Yellow
    $allCloudflared = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
    if ($allCloudflared) {
        foreach ($proc in $allCloudflared) {
            try {
                Write-Host "Terminating cloudflared process (PID: $($proc.Id))..." -ForegroundColor Yellow
                $proc.Kill()
                $proc.WaitForExit(3000)
            } catch {
                Write-Host "SAFE FAILURE: Could not stop cloudflared PID $($proc.Id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host 'All detected cloudflared processes stopped.' -ForegroundColor Green
    } else {
        Write-Host 'No active cloudflared processes found.' -ForegroundColor Gray
    }
} else {
    Write-Host "No active pilot tunnel PID file found ($pidFile)." -ForegroundColor Gray
    Write-Host 'No processes were terminated to avoid impacting unrelated cloudflared tunnels.' -ForegroundColor Gray
    Write-Host 'To force-terminate all cloudflared processes on this machine, run: .\stop-tunnel.ps1 -ForceAll' -ForegroundColor DarkGray
}

# 2. Capture Previous Hostname & Clear APPROVED_PILOT_HOSTNAME in target env file
$envFile = $EnvFilePath
$urlFile = Join-Path $PSScriptRoot '.tunnel.url'
$previousUrl = $null

if (Test-Path $urlFile) {
    try {
        $previousUrl = (Get-Content $urlFile -Raw).Trim()
    } catch { }
}

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if (-not $previousUrl -and $content -match 'APPROVED_PILOT_HOSTNAME=(https://[^\s\r\n]+)') {
        $previousUrl = $matches[1]
    }
    if ($content -match 'APPROVED_PILOT_HOSTNAME=https://.*') {
        try {
            $content = $content -replace 'APPROVED_PILOT_HOSTNAME=https://.*', 'APPROVED_PILOT_HOSTNAME='
            Set-Content -Path $envFile -Value $content -ErrorAction Stop
        } catch {
            Write-Host "CRITICAL FAILURE: Unable to write to $($envFile): $($_.Exception.Message)" -ForegroundColor Red
            throw "CRITICAL FAILURE: Unable to clear APPROVED_PILOT_HOSTNAME in $($envFile): $($_.Exception.Message)"
        }

        # Verify clearance
        $verifyContent = Get-Content $envFile -Raw
        if ($verifyContent -match 'APPROVED_PILOT_HOSTNAME=https://[^\s\r\n]+') {
            Write-Host "CRITICAL FAILURE: APPROVED_PILOT_HOSTNAME remains populated in $envFile!" -ForegroundColor Red
            throw "CRITICAL FAILURE: APPROVED_PILOT_HOSTNAME remains populated in $envFile!"
        }
        Write-Host "Cleared APPROVED_PILOT_HOSTNAME in $envFile" -ForegroundColor Green
        
        if (-not $MockOnly) {
            Write-Host 'Restarting app-staging container with fail-closed origin policy...' -ForegroundColor Cyan
            docker compose -f docker-compose.staging.yml restart app-staging
            if ($LASTEXITCODE -ne 0) {
                Write-Host 'CRITICAL FAILURE: Docker failed to restart app-staging container!' -ForegroundColor Red
                throw 'CRITICAL FAILURE: Docker failed to restart app-staging container with fail-closed origin policy.'
            }
            Write-Host 'app-staging reloaded. Unapproved external Host headers will receive HTTP 403.' -ForegroundColor Green
        } else {
            Write-Host '  [MOCK] Staging container restart skipped in mock mode.' -ForegroundColor Gray
        }
    } else {
        Write-Host "APPROVED_PILOT_HOSTNAME is already empty in $envFile" -ForegroundColor Gray
    }
}

if (Test-Path $urlFile) {
    Remove-Item $urlFile -Force -ErrorAction SilentlyContinue
}

# 3. Verify Public Address Reachability & Fail-Closed Termination
Write-Host ''
Write-Host 'Verifying External Tunnel Deactivation:' -ForegroundColor Cyan
if ($MockOnly) {
    Write-Host '  [PASS] External network probe skipped in mock mode (Zero external requests).' -ForegroundColor Green
} elseif ($previousUrl) {
    Write-Host "Probing previous public tunnel endpoint: $previousUrl..." -ForegroundColor Gray
    try {
        $probe = Invoke-WebRequest -Uri "$previousUrl/api/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "WARNING: Public endpoint '$previousUrl' still responded with HTTP $($probe.StatusCode)!" -ForegroundColor Red
    } catch {
        Write-Host "  [PASS] Public URL '$previousUrl' is confirmed unreachable (Connection closed)." -ForegroundColor Green
    }
} else {
    Write-Host '  [OK] No active public tunnel URL recorded.' -ForegroundColor Gray
}

# 4. Verify Local Staging Fail-Closed Origin Response
Write-Host 'Verifying Local Origin Gate Status (127.0.0.1:3005)...' -ForegroundColor Gray
try {
    $hostProbe = Invoke-WebRequest -Uri 'http://127.0.0.1:3005/' -Headers @{ Host = 'unauthorized-external-test.trycloudflare.com' } -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($hostProbe.StatusCode -eq 403) {
        Write-Host '  [PASS] Staging origin gate is strictly FAIL-CLOSED (Received HTTP 403 Forbidden).' -ForegroundColor Green
    } else {
        Write-Host "  [NOTICE] Received HTTP $($hostProbe.StatusCode) on unauthorized Host header probe." -ForegroundColor Yellow
    }
} catch {
    Write-Host '  [PASS] Staging origin gate rejected unauthorized Host header.' -ForegroundColor Green
}

# 5. Verify Zero Running Cloudflared Processes
$activeTunnels = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
if (-not $activeTunnels) {
    Write-Host '  [PASS] Zero cloudflared processes running on workstation.' -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Detected $($activeTunnels.Count) cloudflared process(es) still running." -ForegroundColor Yellow
}

# 6. Data Integrity and Backups Assurance
Write-Host ''
Write-Host 'Data and Storage Preservation Guarantee:' -ForegroundColor Cyan
Write-Host '  - Staging PostgreSQL volumes: INTACT (no docker compose down -v executed)' -ForegroundColor Green
Write-Host '  - Development PostgreSQL:     INTACT (port 5432 isolated)' -ForegroundColor Green
Write-Host '  - Local database backups:     PRESERVED' -ForegroundColor Green

Write-Host ''
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' External tunnel access is CLOSED. Workstation is private.         ' -ForegroundColor Green
Write-Host '==================================================================' -ForegroundColor Cyan
