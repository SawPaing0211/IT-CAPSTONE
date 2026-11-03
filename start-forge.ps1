# start-forge.ps1
# One-click startup for Forge.Dev: backend, frontend, and both Cloudflare tunnels.
# Opens 4 visible windows (backend, frontend, backend tunnel, frontend tunnel),
# waits for both tunnel URLs to appear, then rewrites the .env files and
# (re)starts the backend so it picks up the correct CORS origin.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$logDir      = Join-Path $root ".forge-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$backendTunnelLog  = Join-Path $logDir "backend-tunnel.log"
$frontendTunnelLog = Join-Path $logDir "frontend-tunnel.log"
Remove-Item $backendTunnelLog, $frontendTunnelLog -ErrorAction SilentlyContinue

function Wait-ForTunnelUrl($logPath, $label) {
    Write-Host "Waiting for $label tunnel URL..." -ForegroundColor Yellow
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $logPath) {
            $content = Get-Content $logPath -Raw -ErrorAction SilentlyContinue
            if ($content -match "(https://[a-zA-Z0-9\-]+\.trycloudflare\.com)") {
                Write-Host "$label tunnel is up: $($matches[1])" -ForegroundColor Green
                return $matches[1]
            }
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Timed out waiting for $label tunnel URL. Check the $label tunnel window for errors."
}

# ---------------------------------------------------------------
# 1. Start the frontend dev server (Vite, fixed on port 5300)
# ---------------------------------------------------------------
Write-Host "Starting frontend dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd `"$frontendDir`"; npm run dev"
) -WindowStyle Normal

# ---------------------------------------------------------------
# 2. Start backend tunnel (cloudflared -> localhost:5000), capture its URL
# ---------------------------------------------------------------
Write-Host "Starting backend Cloudflare tunnel..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cloudflared tunnel --url http://localhost:5000 2>&1 | Tee-Object -FilePath `"$backendTunnelLog`""
) -WindowStyle Normal

$backendUrl = Wait-ForTunnelUrl $backendTunnelLog "backend"

# ---------------------------------------------------------------
# 3. Write frontend/.env.local with the backend tunnel URL
# ---------------------------------------------------------------
Set-Content -Path (Join-Path $frontendDir ".env.local") -Value "VITE_API_URL=$backendUrl"
Write-Host "Updated frontend/.env.local -> VITE_API_URL=$backendUrl" -ForegroundColor Green

# ---------------------------------------------------------------
# 4. Start frontend tunnel (cloudflared -> localhost:5300), capture its URL
# ---------------------------------------------------------------
Write-Host "Starting frontend Cloudflare tunnel..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cloudflared tunnel --url http://localhost:5300 2>&1 | Tee-Object -FilePath `"$frontendTunnelLog`""
) -WindowStyle Normal

$frontendUrl = Wait-ForTunnelUrl $frontendTunnelLog "frontend"

# ---------------------------------------------------------------
# 5. Update backend/.env CORS_ORIGINS, preserving every other line
# ---------------------------------------------------------------
$envPath = Join-Path $backendDir ".env"
$lines = @()
if (Test-Path $envPath) {
    $lines = @(Get-Content $envPath | Where-Object { $_ -notmatch "^CORS_ORIGINS=" })
}
$lines += "CORS_ORIGINS=$frontendUrl,http://localhost:5300"
Set-Content -Path $envPath -Value $lines
Write-Host "Updated backend/.env -> CORS_ORIGINS=$frontendUrl,http://localhost:5300" -ForegroundColor Green

# ---------------------------------------------------------------
# 6. Start the backend (after CORS is correct, so no restart needed later)
# ---------------------------------------------------------------
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd `"$backendDir`"; .\venv\Scripts\Activate.ps1; python app.py"
) -WindowStyle Normal

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Start-Sleep -Seconds 2
Write-Host ""
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host " Forge.Dev is starting up. Give it about 5-10 seconds," -ForegroundColor Magenta
Write-Host " then open this link -- this is the one to share/demo:" -ForegroundColor Magenta
Write-Host ""
Write-Host "   $frontendUrl" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host ""
Write-Host " (Backend API, for reference only: $backendUrl)" -ForegroundColor DarkGray
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "4 windows are now open: frontend, backend, and their two tunnels." -ForegroundColor Gray
Write-Host "Keep all 4 windows open for the whole session. Close them when you're done." -ForegroundColor Gray
Read-Host "Press Enter to close this launcher window (the other 4 windows will stay open)"
