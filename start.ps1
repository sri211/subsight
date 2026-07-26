# SubSight Quick-Start Script
# Run this from the reddit-intel folder: .\start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "`n SubSight Quick-Start" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Check .env exists
if (-not (Test-Path "$backend\.env")) {
    Write-Host "`n [!] No .env file found. Copying from example..." -ForegroundColor Yellow
    Copy-Item "$backend\.env.example" "$backend\.env"
    Write-Host "     Edit $backend\.env with your API keys, then re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n Starting backend (FastAPI) on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; if (Test-Path 'venv\Scripts\activate') { .\venv\Scripts\activate }; uvicorn app.main:app --reload --port 8000"

Start-Sleep 2

Write-Host " Starting frontend (Vite) on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"

Write-Host "`n Both servers starting..." -ForegroundColor Cyan
Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " Backend:  http://localhost:8000/docs`n" -ForegroundColor White
