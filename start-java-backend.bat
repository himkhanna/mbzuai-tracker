@echo off
setlocal

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
set MAVEN_HOME=C:\Users\%USERNAME%\maven\apache-maven-3.9.6
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%

:: Load local secrets (git-ignored)
if exist "%~dp0secrets.bat" (
    call "%~dp0secrets.bat"
) else (
    echo WARNING: secrets.bat not found - Azure email ingestion will be disabled.
    echo Copy secrets.bat.template to secrets.bat and fill in your credentials.
)

cd /d "%~dp0server-java"

:: Build if JAR doesn't exist
if not exist "target\tracker-1.0.0.jar" (
    echo Building Spring Boot application...
    mvn package -DskipTests -q
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

echo Starting MBZUAI Tracker Java Backend...
echo API available at: http://localhost:3001
echo.
echo Credentials:
echo   Admin:       admin@mbzuai.ac.ae / Admin123!
echo   Vendor Mgmt: vendor.mgmt@mbzuai.ac.ae / Pass123!
echo   Store:       store@mbzuai.ac.ae / Pass123!
echo   IT:          it@mbzuai.ac.ae / Pass123!
echo   Asset:       asset@mbzuai.ac.ae / Pass123!
echo   Finance:     finance@mbzuai.ac.ae / Pass123!
echo.

java ^
  -Dspring.datasource.url=jdbc:postgresql://localhost:5433/mbzuai_tracker ^
  -Dspring.datasource.username=postgres ^
  -Dspring.datasource.password=postgres ^
  -Dspring.thymeleaf.check-template-location=false ^
  -Dspring.jpa.open-in-view=false ^
  -Dlogging.level.ae.mbzuai=INFO ^
  -Dapp.email-ingestion.enabled=true ^
  -Dapp.email-ingestion.azure-tenant-id=%AZURE_TENANT_ID% ^
  -Dapp.email-ingestion.azure-client-id=%AZURE_CLIENT_ID% ^
  -Dapp.email-ingestion.azure-client-secret=%AZURE_CLIENT_SECRET% ^
  -Dapp.email-ingestion.mailbox=%EMAIL_MAILBOX% ^
  -jar target\tracker-1.0.0.jar

pause
