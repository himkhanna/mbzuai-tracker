@echo off
setlocal EnableDelayedExpansion

:: ── Self-elevate if not already admin ────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set SCRIPT_DIR=%~dp0
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
set MAVEN_HOME=C:\Users\%USERNAME%\maven\apache-maven-3.9.6
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%

cls
echo.
echo  ============================================
echo   MBZUAI Tracker  -  Starting All Services
echo  ============================================
echo.

:: ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
echo  [1/3]  PostgreSQL...
net start postgresql-x64-18 >nul 2>&1
if %errorlevel% equ 0 (
    echo         Started  OK
) else (
    echo         Already running  OK
)

:: ── 2. Java Backend ───────────────────────────────────────────────────────────
echo  [2/3]  Java Backend...

cd /d "%SCRIPT_DIR%server-java"
if not exist "target\tracker-1.0.0.jar" (
    echo         JAR not found - building now ^(~60s first time^)...
    call mvn package -DskipTests -q
    if errorlevel 1 (
        echo         BUILD FAILED. Press any key to exit.
        pause >nul
        exit /b 1
    )
    echo         Build done
)

start "MBZUAI-Backend" "%SCRIPT_DIR%_start-backend.bat"
echo         Window opened

:: Poll until backend responds (max 90s)
echo         Waiting for Spring Boot to start...
set /a SECS=0
:POLL
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/auth/me 2>nul | findstr /r "401 200 403" >nul
if not errorlevel 1 goto BACKEND_UP
set /a SECS+=3
if !SECS! lss 90 goto POLL
echo         Timeout - check the Backend window for errors
goto FRONTEND

:BACKEND_UP
echo         Ready  OK

:: ── 3. Frontend ───────────────────────────────────────────────────────────────
:FRONTEND
echo  [3/3]  Frontend ^(Vite^)...

cd /d "%SCRIPT_DIR%client"
if not exist "node_modules" (
    echo         Installing npm packages...
    call npm install --silent
)

start "MBZUAI-Frontend" cmd /k "title MBZUAI-Frontend && npm run dev"
echo         Window opened

timeout /t 4 /nobreak >nul

:: ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo  ============================================
echo   All services running!
echo.
echo   Frontend :  http://localhost:5173
echo   Backend  :  http://localhost:3001
echo.
echo   Login    :  admin@mbzuai.ac.ae
echo   Password :  Admin123!
echo.
echo   Run stop-all.bat to stop everything.
echo  ============================================
echo.

start "" "http://localhost:5173"

echo  This launcher window will close in 5 seconds...
timeout /t 5 /nobreak >nul
