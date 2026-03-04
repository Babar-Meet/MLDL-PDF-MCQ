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

REM Check if Python is installed
where python >nul 2>nul
set "PYTHON_AVAILABLE=%errorlevel%"

REM Check if pip is available
where pip >nul 2>nul
set "PIP_AVAILABLE=%errorlevel%"

echo.
echo [1/5] Checking and installing Python dependencies...

REM Install Python dependencies if pip is available
if %PIP_AVAILABLE% equ 0 (
    echo [INFO] Installing Python dependencies...
    pip install fastapi uvicorn python-multipart pydantic PyPDF2 >nul 2>nul
    echo [INFO] Python dependencies installed.
) else (
    echo [WARNING] pip is not available. Python backend may not work.
    echo Please install Python and pip to enable MCQ generation.
)

REM Install Node.js backend dependencies
echo.
echo [2/5] Checking Node.js backend dependencies...
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
echo [3/5] Checking frontend dependencies...
REM Install Redux dependencies
cd /d "%PROJECT_DIR%frontend"
echo [INFO] Installing frontend dependencies (including Redux)...
call npm install @reduxjs/toolkit react-redux

if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo [INFO] Installing frontend base dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)
echo [INFO] Frontend dependencies OK.

echo.
echo [4/5] Starting Python backend on port 8000 (MCQ Generation)...
echo.

REM Start Python backend in a new window
if %PIP_AVAILABLE% equ 0 (
    start "Python Backend (Port 8000)" cmd /k "cd /d "%PROJECT_DIR%backend" && python main.py"
) else (
    start "Python Backend (Port 8000)" cmd /k "echo [WARNING] Python not found. Install Python to enable MCQ generation. && cmd /k"
)

REM Wait a moment for Python to start
timeout /t 3 /nobreak >nul

echo [INFO] Python backend started.
echo.
echo [5/5] Starting Node.js backend on port 8001 (Auth & API)...
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
echo Python Backend:  http://localhost:8000 (MCQ Generation)
echo Node.js Backend: http://localhost:8001 (Auth & API)
echo Frontend:        http://localhost:5173
echo.
echo IMPORTANT: Keep all terminal windows open!
echo.
echo Ports:
echo - "Python Backend" - MCQ generation (port 8000)
echo - "Node.js Backend" - Auth & API (port 8001)
echo - "Frontend" - Web UI (port 5173)
echo.

pause
