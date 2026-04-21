@echo off
title MBZUAI-Backend
cd /d "%~dp0"

:: Load local secrets (git-ignored)
if exist "%~dp0secrets.bat" (
    call "%~dp0secrets.bat"
) else (
    echo WARNING: secrets.bat not found - Azure email ingestion will be disabled.
)

cd /d "%~dp0server-java"

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

java -Dspring.datasource.url=jdbc:postgresql://localhost:5433/mbzuai_tracker -Dspring.datasource.username=postgres -Dspring.datasource.password=postgres -Dspring.thymeleaf.check-template-location=false -Dspring.jpa.open-in-view=false -Dlogging.level.ae.mbzuai=INFO -Dapp.email-ingestion.enabled=true -Dapp.email-ingestion.azure-tenant-id=%AZURE_TENANT_ID% -Dapp.email-ingestion.azure-client-id=%AZURE_CLIENT_ID% -Dapp.email-ingestion.azure-client-secret=%AZURE_CLIENT_SECRET% -Dapp.email-ingestion.mailbox=%EMAIL_MAILBOX% -jar target\tracker-1.0.0.jar

echo.
echo Backend stopped. Press any key to close.
pause >nul
