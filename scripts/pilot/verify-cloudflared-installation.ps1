# ==============================================================================
# NEXORA Commerce — Cloudflared Installation and Staging Isolation Verifier
# Strictly read-only verification script.
# Never opens tunnels, never installs packages, never exposes secrets.
# ==============================================================================

Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' NEXORA Commerce — Cloudflared and Staging Isolation Verification ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ''

$results = @()

function Record-Check {
    param (
        [string]$CheckName,
        [string]$Status, # PASS, FAIL, WARNING
        [string]$Details
    )
    $script:results += [PSCustomObject]@{
        Check   = $CheckName
        Status  = $Status
        Details = $Details
    }
}

# 1. Check Windows Package Manager (winget)
Write-Host '[1/7] Inspecting Windows Package Manager (winget)...' -ForegroundColor Gray
$wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
if ($wingetCmd) {
    try {
        $wingetVer = (winget --version).Trim()
        Record-Check 'Windows Package Manager (winget)' 'PASS' "Available ($wingetVer)"
        Write-Host "  [OK] winget is available ($wingetVer)" -ForegroundColor Green
    } catch {
        Record-Check 'Windows Package Manager (winget)' 'WARNING' 'Binary found but execution failed'
        Write-Host '  [!] winget execution failed' -ForegroundColor Yellow
    }
} else {
    Record-Check 'Windows Package Manager (winget)' 'FAIL' 'winget CLI not found in PATH'
    Write-Host '  [X] winget is not available' -ForegroundColor Red
}

# 2. Check cloudflared CLI Installation and Version
Write-Host '[2/7] Checking for cloudflared executable in system PATH...' -ForegroundColor Gray

# Refresh environment PATH from registry to pick up newly installed tools
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

if ($cloudflaredCmd) {
    $cfPath = if ($cloudflaredCmd.Source) { $cloudflaredCmd.Source } else { $cloudflaredCmd.FullName }
    try {
        $cfVer = (& "$cfPath" --version) -join ' '
        Record-Check 'cloudflared CLI Binary' 'PASS' "Installed at $cfPath"
        Record-Check 'cloudflared Version' 'PASS' "$cfVer"
        Write-Host "  [OK] cloudflared installed: $cfPath" -ForegroundColor Green
        Write-Host "  [OK] Version: $cfVer" -ForegroundColor Green
    } catch {
        Record-Check 'cloudflared CLI Binary' 'WARNING' "Binary at $cfPath but version check failed"
        Write-Host "  [!] Found binary at $cfPath but could not execute --version" -ForegroundColor Yellow
    }
} else {
    Record-Check 'cloudflared CLI Binary' 'FAIL' 'Not installed (Run: winget install --id Cloudflare.cloudflared -e --source winget)'
    Record-Check 'cloudflared Version' 'FAIL' 'N/A (Executable missing)'
    Write-Host '  [X] cloudflared is NOT installed in system PATH.' -ForegroundColor Red
    Write-Host '      Install command: winget install --id Cloudflare.cloudflared -e --source winget' -ForegroundColor Yellow
}

# 3. Detect Running cloudflared Processes
Write-Host '[3/7] Scanning for active cloudflared processes...' -ForegroundColor Gray
$runningProcesses = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
if ($runningProcesses) {
    $pids = ($runningProcesses | ForEach-Object { $_.Id }) -join ', '
    Record-Check 'Active cloudflared Processes' 'WARNING' "Detected running PID(s): $pids"
    Write-Host "  [!] WARNING: Running cloudflared process detected: PID $pids" -ForegroundColor Yellow
} else {
    Record-Check 'Active cloudflared Processes' 'PASS' 'None running (System unexposed)'
    Write-Host '  [OK] No active cloudflared processes detected' -ForegroundColor Green
}

# 4. Detect cloudflared Windows Services
Write-Host '[4/7] Scanning for cloudflared Windows services...' -ForegroundColor Gray
$cfServices = Get-Service -Name '*cloudflare*' -ErrorAction SilentlyContinue
if ($cfServices) {
    $srvNames = ($cfServices | ForEach-Object { "$($_.Name) ($($_.Status))" }) -join ', '
    Record-Check 'cloudflared Windows Service' 'WARNING' "Service detected: $srvNames"
    Write-Host "  [!] WARNING: Service detected: $srvNames" -ForegroundColor Yellow
} else {
    Record-Check 'cloudflared Windows Service' 'PASS' 'None installed (No persistent background daemon)'
    Write-Host '  [OK] No cloudflared Windows services registered' -ForegroundColor Green
}

# 5. Check Local Staging Network Port Bindings
Write-Host '[5/7] Verifying staging Docker network isolation and loopback bindings...' -ForegroundColor Gray
$dockerPs = docker ps --format '{{.Names}}|{{.Ports}}' 2>$null

$appBoundLoopback = $false
$dbBoundLoopback = $false
$workerPublished = $false

if ($dockerPs) {
    foreach ($line in $dockerPs -split "`n") {
        if (-not $line.Trim()) { continue }
        $parts = $line.Split('|')
        $cName = $parts[0].Trim()
        $cPorts = if ($parts.Length -gt 1) { $parts[1].Trim() } else { '' }

        if ($cName -eq 'nexora-staging-app') {
            if ($cPorts -match '127\.0\.0\.1:3005') {
                $appBoundLoopback = $true
            }
        } elseif ($cName -eq 'nexora-staging-postgres') {
            if ($cPorts -match '127\.0\.0\.1:5433') {
                $dbBoundLoopback = $true
            }
        } elseif ($cName -eq 'nexora-staging-worker') {
            if ($cPorts -match '->') {
                $workerPublished = $true
            }
        }
    }
}

if ($appBoundLoopback) {
    Record-Check 'Next.js Staging Port Binding' 'PASS' 'Bound strictly to loopback (127.0.0.1:3005)'
    Write-Host '  [OK] nexora-staging-app bound to 127.0.0.1:3005' -ForegroundColor Green
} else {
    Record-Check 'Next.js Staging Port Binding' 'WARNING' 'Not bound to 127.0.0.1 (Check docker-compose.staging.yml)'
    Write-Host '  [!] nexora-staging-app is not bound to 127.0.0.1:3005' -ForegroundColor Yellow
}

if ($dbBoundLoopback) {
    Record-Check 'Postgres Staging Port Binding' 'PASS' 'Bound strictly to loopback (127.0.0.1:5433)'
    Write-Host '  [OK] nexora-staging-postgres bound to 127.0.0.1:5433' -ForegroundColor Green
} else {
    Record-Check 'Postgres Staging Port Binding' 'WARNING' 'Not bound to 127.0.0.1 (Check docker-compose.staging.yml)'
    Write-Host '  [!] nexora-staging-postgres is not bound to 127.0.0.1:5433' -ForegroundColor Yellow
}

if (-not $workerPublished) {
    Record-Check 'Background Worker Port Exposure' 'PASS' 'Zero host ports published (Headless)'
    Write-Host '  [OK] nexora-staging-worker has zero host ports exposed' -ForegroundColor Green
} else {
    Record-Check 'Background Worker Port Exposure' 'FAIL' 'Worker ports exposed to host'
    Write-Host '  [X] nexora-staging-worker published ports to host' -ForegroundColor Red
}

# 6. Check Staging Application Health
Write-Host '[6/7] Verifying staging health and pilot gate status on http://127.0.0.1:3005...' -ForegroundColor Gray
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3005/api/health' -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($health.status -eq 'ok') {
        Record-Check 'Staging Application Health (/api/health)' 'PASS' "Status: OK (Service: $($health.service))"
        Write-Host '  [OK] /api/health returned OK' -ForegroundColor Green
    } else {
        Record-Check 'Staging Application Health (/api/health)' 'WARNING' "Status: $($health.status)"
        Write-Host '  [!] /api/health returned unexpected payload' -ForegroundColor Yellow
    }
} catch {
    Record-Check 'Staging Application Health (/api/health)' 'FAIL' 'Unreachable on http://127.0.0.1:3005'
    Write-Host "  [X] /api/health unreachable: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $pilotStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:3005/api/pilot/status' -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($pilotStatus.gateEnabled -eq $true -and $pilotStatus.approvedHostnameConfigured -eq $false) {
        Record-Check 'Pilot Gate and Origin Shield' 'PASS' 'Gate ACTIVE, Hostname Shield UNAPPROVED (Fail-Closed)'
        Write-Host '  [OK] Pilot Gate active and Fail-Closed shield enforced' -ForegroundColor Green
    } else {
        Record-Check 'Pilot Gate and Origin Shield' 'WARNING' "gateEnabled=$($pilotStatus.gateEnabled), approvedHostConfigured=$($pilotStatus.approvedHostnameConfigured)"
        Write-Host '  [!] Pilot gate status unexpected' -ForegroundColor Yellow
    }
} catch {
    Record-Check 'Pilot Gate and Origin Shield' 'FAIL' 'Pilot status endpoint unreachable'
    Write-Host '  [X] /api/pilot/status unreachable' -ForegroundColor Red
}

# 7. Summary Report Table
Write-Host ''
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' VERIFICATION SUMMARY SCORECARD                                   ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan

$results | Format-Table -Property Check, Status, Details -AutoSize

$hasFails = ($results | Where-Object { $_.Status -eq 'FAIL' }).Count -gt 0
$hasWarnings = ($results | Where-Object { $_.Status -eq 'WARNING' }).Count -gt 0

Write-Host '------------------------------------------------------------------' -ForegroundColor Gray
if ($hasFails) {
    Write-Host 'VERDICT: PREREQUISITES PENDING' -ForegroundColor Red
    Write-Host 'Action Required: Operator approval needed to install official cloudflared package via winget.' -ForegroundColor Yellow
} elseif ($hasWarnings) {
    Write-Host 'VERDICT: READY WITH WARNINGS' -ForegroundColor Yellow
} else {
    Write-Host 'VERDICT: FULLY COMPLIANT AND READY' -ForegroundColor Green
}
Write-Host '==================================================================' -ForegroundColor Cyan
