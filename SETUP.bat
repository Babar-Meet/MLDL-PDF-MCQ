@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     MLDL PDF MCQ - Setup Script
echo ========================================
echo.

REM Get the script directory (project root)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%"

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] npm found.
echo.

REM ========================================
REM STEP 1: Install backend dependencies
REM ========================================
echo [STEP 1/3] Installing backend dependencies...
echo.

cd /d "%PROJECT_DIR%backend"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to navigate to backend directory.
    pause
    exit /b 1
)

echo [INFO] Current directory: %CD%
echo [INFO] Running npm install...
echo.

call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)

echo [INFO] Backend dependencies installed successfully.
echo.

REM ========================================
REM STEP 2: Install frontend dependencies
REM ========================================
echo [STEP 2/3] Installing frontend dependencies...
echo.

cd /d "%PROJECT_DIR%frontend"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to navigate to frontend directory.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)

echo [INFO] Current directory: %CD%
echo [INFO] Running npm install...
echo.

call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies.
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 1
)

echo [INFO] Frontend dependencies installed successfully.
echo.

REM ========================================
REM STEP 3: Create .env file if it doesn't exist
REM ========================================
echo [STEP 3/3] Setting up backend environment variables...
echo.

cd /d "%PROJECT_DIR%backend"

if exist ".env" (
    echo [INFO] .env file already exists. Skipping creation.
) else (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy /Y ".env.example" ".env" >nul
        if %errorlevel% equ 0 (
            echo [INFO] .env file created successfully.
        ) else (
            echo [WARNING] Failed to create .env file. You may need to create it manually.
        )
    ) else (
        echo [WARNING] .env.example not found. Cannot create .env automatically.
    )
)

REM Go back to project root
cd /d "%PROJECT_DIR%"

echo.
echo ========================================
echo     Setup Complete!
echo ========================================
echo.
echo [SUCCESS] Backend dependencies installed
echo [SUCCESS] Frontend dependencies installed
echo [SUCCESS] Environment configuration ready
echo.
echo Next steps:
echo   1. Run RUN.bat to start the application
echo.
echo The application will open in your browser at:
echo   http://localhost:5173
echo.
echo Backend API runs on: http://localhost:8000
echo.

pause
