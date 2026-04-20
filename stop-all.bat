@echo off
setlocal

:: ── Self-elevate if not already admin ────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cls
echo.
echo  ============================================
echo   MBZUAI Tracker  -  Stopping All Services
echo  ============================================
echo.

:: ── 1. Frontend ───────────────────────────────────────────────────────────────
echo  [1/3]  Stopping Frontend...
taskkill /FI "WINDOWTITLE eq MBZUAI-Frontend" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
echo         Done

:: ── 2. Backend ────────────────────────────────────────────────────────────────
echo  [2/3]  Stopping Backend...
taskkill /FI "WINDOWTITLE eq MBZUAI-Backend" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 "') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
echo         Done

:: ── 3. PostgreSQL ─────────────────────────────────────────────────────────────
echo  [3/3]  Stopping PostgreSQL...
net stop postgresql-x64-18 >nul 2>&1
if %errorlevel% equ 0 (
    echo         Done
) else (
    echo         Already stopped
)

echo.
echo  ============================================
echo   All services stopped.
echo  ============================================
echo.
pause
