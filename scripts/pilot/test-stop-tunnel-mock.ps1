# ==============================================================================
# NEXORA Commerce — Mock Test for Shutdown & Hostname-Reset Logic
# Verifies PID targeting safety, origin reset, and critical failure reporting
# Strictly OFFLINE: Makes ZERO external HTTP requests
# ==============================================================================

$ErrorActionPreference = 'Stop'

Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' NEXORA Commerce — Stop-Tunnel Mock Safety & Reset Test Harness   ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan

$mockEnvFile = Join-Path $PSScriptRoot '.env.staging.mock'
$mockPidFile = Join-Path $PSScriptRoot '.tunnel.pid'
$mockUrlFile = Join-Path $PSScriptRoot '.tunnel.url'

$testsPassed = 0
$totalTests = 3

try {
    # --------------------------------------------------------------------------
    # Test 1: PID-Targeting Safety (Refuses to kill non-cloudflared process)
    # --------------------------------------------------------------------------
    Write-Host "`n[Test 1/3] Testing PID Safety (Non-cloudflared process protection)..." -ForegroundColor Yellow
    $currentPid = $PID
    Set-Content -Path $mockPidFile -Value $currentPid

    # Run stop-tunnel in mock mode with a dummy env file
    Set-Content -Path $mockEnvFile -Value 'APPROVED_PILOT_HOSTNAME='
    & "$PSScriptRoot\stop-tunnel.ps1" -MockOnly -EnvFilePath $mockEnvFile

    # Confirm current process is still alive and PID file was safely cleaned up
    $procStillRunning = Get-Process -Id $currentPid -ErrorAction SilentlyContinue
    if ($procStillRunning -and -not (Test-Path $mockPidFile)) {
        Write-Host '  [PASS] Test 1: Refused to kill non-cloudflared process (PID protected).' -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host '  [FAIL] Test 1: Process protection logic failed!' -ForegroundColor Red
    }

    # --------------------------------------------------------------------------
    # Test 2: Hostname Reset & Clearance Verification
    # --------------------------------------------------------------------------
    Write-Host "`n[Test 2/3] Testing Hostname Reset in Staging Configuration..." -ForegroundColor Yellow
    Set-Content -Path $mockEnvFile -Value "APPROVED_PILOT_HOSTNAME=https://mock-ephemeral-123.trycloudflare.com`nNODE_ENV=staging"
    Set-Content -Path $mockUrlFile -Value "https://mock-ephemeral-123.trycloudflare.com"

    & "$PSScriptRoot\stop-tunnel.ps1" -MockOnly -EnvFilePath $mockEnvFile

    $clearedContent = Get-Content $mockEnvFile -Raw
    if ($clearedContent -match 'APPROVED_PILOT_HOSTNAME=\r?$' -or $clearedContent -match 'APPROVED_PILOT_HOSTNAME=\n') {
        if (-not (Test-Path $mockUrlFile)) {
            Write-Host '  [PASS] Test 2: Hostname cleared and .tunnel.url removed cleanly.' -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host '  [FAIL] Test 2: .tunnel.url was not cleaned up!' -ForegroundColor Red
        }
    } else {
        Write-Host "  [FAIL] Test 2: APPROVED_PILOT_HOSTNAME was not cleared! Content: $clearedContent" -ForegroundColor Red
    }

    # --------------------------------------------------------------------------
    # Test 3: Critical Failure on Unwritable Configuration
    # --------------------------------------------------------------------------
    Write-Host "`n[Test 3/3] Testing Critical Failure on Unwritable Configuration..." -ForegroundColor Yellow
    Set-Content -Path $mockEnvFile -Value "APPROVED_PILOT_HOSTNAME=https://mock-immutable-999.trycloudflare.com"
    Set-ItemProperty -Path $mockEnvFile -Name IsReadOnly -Value $true

    $threwExpectedError = $false
    try {
        & "$PSScriptRoot\stop-tunnel.ps1" -MockOnly -EnvFilePath $mockEnvFile
    } catch {
        if ($_.Exception.Message -match 'CRITICAL FAILURE') {
            $threwExpectedError = $true
            Write-Host "  [PASS] Test 3: Unwritable env file produced CRITICAL FAILURE as required: $($_.Exception.Message)" -ForegroundColor Green
            $testsPassed++
        }
    } finally {
        Set-ItemProperty -Path $mockEnvFile -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue
    }

    if (-not $threwExpectedError) {
        Write-Host '  [FAIL] Test 3: Script did not throw critical error on unwritable file!' -ForegroundColor Red
    }

} finally {
    Remove-Item $mockEnvFile -Force -ErrorAction SilentlyContinue
    Remove-Item $mockPidFile -Force -ErrorAction SilentlyContinue
    Remove-Item $mockUrlFile -Force -ErrorAction SilentlyContinue
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " MOCK SHUTDOWN TEST RESULT: $testsPassed/$totalTests PASSED $(if ($testsPassed -eq $totalTests) {'(ALL CHECKS VERIFIED)'} else {'(FAILURES DETECTED)'})" -ForegroundColor $(if ($testsPassed -eq $totalTests) {'Green'} else {'Red'})
Write-Host '==================================================================' -ForegroundColor Cyan

if ($testsPassed -ne $totalTests) {
    exit 1
}
