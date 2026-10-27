# ==============================================================================
# NEXORA Commerce — Start Local Staging Stack
# Launches isolated staging containers, runs database migrations, and seeds demo data.
# Budget: LKR 0 / $0.00
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " NEXORA Commerce — Launching Local Staging Stack                  " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Verify .env.staging
if (-not (Test-Path ".env.staging")) {
    Write-Host "Creating .env.staging from .env.staging.example..." -ForegroundColor Yellow
    Copy-Item .env.staging.example .env.staging
}

# 2. Launch Docker Compose Staging Stack
Write-Host "`n[1/4] Starting Docker staging containers (PostgreSQL, App, Worker)..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting staging containers. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# 3. Wait for PostgreSQL container health
Write-Host "`n[2/4] Waiting for staging database readiness..." -ForegroundColor Cyan
$retries = 30
$dbHealthy = $false

while ($retries -gt 0) {
    $status = docker inspect --format='{{json .State.Health.Status}}' nexora-staging-postgres 2>$null
    if ($status -eq '"healthy"') {
        $dbHealthy = $true
        break
    }
    Start-Sleep -Seconds 2
    $retries--
    Write-Host "." -NoNewline
}

if (-not $dbHealthy) {
    Write-Host "`nStaging database container failed to reach healthy state." -ForegroundColor Red
    exit 1
}
Write-Host "`nStaging database is healthy." -ForegroundColor Green

# 4. Wait for Next.js App Readiness
Write-Host "`n[3/4] Waiting for Next.js staging application readiness on port 3005..." -ForegroundColor Cyan
$appRetries = 30
$appHealthy = $false

while ($appRetries -gt 0) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:3005/api/health" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res.status -eq "ok" -or $res.status -eq "healthy") {
            $appHealthy = $true
            break
        }
    } catch {
        # continue waiting
    }
    Start-Sleep -Seconds 2
    $appRetries--
    Write-Host "." -NoNewline
}

if (-not $appHealthy) {
    Write-Host "`nApp container still initializing. Will proceed with seed." -ForegroundColor Yellow
} else {
    Write-Host "`nApp health endpoint verified." -ForegroundColor Green
}

# 5. Seed Staging Demo Data
Write-Host "`n[4/4] Applying migrations and seeding pilot demo data..." -ForegroundColor Cyan
docker compose -f docker-compose.staging.yml exec -T app-staging npx tsx scripts/seed-pilot-demo.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPilot demo data successfully seeded!" -ForegroundColor Green
} else {
    Write-Host "`nNotice: Demo data script returned code $LASTEXITCODE. Check container logs." -ForegroundColor Yellow
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " Local Staging Environment is ACTIVE                              " -ForegroundColor Green
Write-Host " Storefront / Platform URL: http://localhost:3005                 " -ForegroundColor White
Write-Host " Health Endpoint:           http://localhost:3005/api/health      " -ForegroundColor Gray
Write-Host " Readiness Endpoint:        http://localhost:3005/api/ready       " -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan
