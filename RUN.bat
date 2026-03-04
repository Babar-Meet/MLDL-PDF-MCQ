@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     MLDL PDF MCQ - Running Application
echo ========================================
echo.

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo [1/3] Checking Node.js backend dependencies...
if not exist "%PROJECT_DIR%backend\node_modules" (
    echo [INFO] Installing Node.js backend dependencies...
    cd /d "%PROJECT_DIR%backend"
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
)
echo [INFO] Backend dependencies OK.

echo.
echo [2/3] Checking frontend dependencies...
cd /d "%PROJECT_DIR%frontend"
if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo [INFO] Installing frontend base dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

REM Install Redux dependencies
echo [INFO] Installing Redux dependencies...
call npm install @reduxjs/toolkit react-redux

echo [INFO] Frontend dependencies OK.

echo.
echo [3/3] Starting Node.js backend on port 8001...
echo.

REM Start Node.js backend in a new window
start "Node.js Backend (Port 8001)" cmd /k "cd /d "%PROJECT_DIR%backend" && npm start"

REM Wait a moment for Node.js to start
timeout /t 2 /nobreak >nul

echo [INFO] Node.js backend started.
echo.
echo Starting frontend on port 5173...
echo.

REM Start frontend dev server in a new window
start "Frontend (Port 5173)" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo ========================================
echo     Application Started!
echo ========================================
echo.
echo Node.js Backend: http://localhost:8001 (Auth & API + MCQ Generation)
echo Frontend:        http://localhost:5173
echo.
echo IMPORTANT: Keep all terminal windows open!
echo.
echo If using Ollama for local AI, make sure it's running:
echo   Run 'ollama serve' in a separate terminal
echo.

pause
