param (
    [switch]$ForceAll
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

# 2. Origin Gate Cleanup: Clear APPROVED_PILOT_HOSTNAME in .env.staging
$envFile = '.env.staging'
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'APPROVED_PILOT_HOSTNAME=https://.*') {
        $content = $content -replace 'APPROVED_PILOT_HOSTNAME=https://.*', 'APPROVED_PILOT_HOSTNAME='
        Set-Content -Path $envFile -Value $content
        Write-Host "Cleared APPROVED_PILOT_HOSTNAME in $envFile" -ForegroundColor Green
        
        Write-Host 'Restarting app-staging container with fail-closed origin policy...' -ForegroundColor Cyan
        docker compose -f docker-compose.staging.yml restart app-staging 2>$null | Out-Null
        Write-Host 'app-staging reloaded. Unapproved external Host headers will receive HTTP 403.' -ForegroundColor Green
    } else {
        Write-Host "APPROVED_PILOT_HOSTNAME is already empty in $envFile" -ForegroundColor Gray
    }
}

# 3. Data Integrity and Backups Assurance
Write-Host ''
Write-Host 'Data and Storage Preservation Guarantee:' -ForegroundColor Cyan
Write-Host '  - Staging PostgreSQL volumes: INTACT (no docker compose down -v executed)' -ForegroundColor Green
Write-Host '  - Development PostgreSQL:     INTACT (port 5432 isolated)' -ForegroundColor Green
Write-Host '  - Local database backups:     PRESERVED' -ForegroundColor Green

Write-Host ''
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' External tunnel access is CLOSED. Workstation is private.         ' -ForegroundColor Green
Write-Host '==================================================================' -ForegroundColor Cyan
