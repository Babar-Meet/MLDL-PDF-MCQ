@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     MLDL PDF MCQ - Setup Script
echo ========================================
echo.

REM Get the script directory (project root)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%"

REM Check if conda is installed
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Conda is not installed or not in PATH.
    echo Please install Anaconda or Miniconda from https://www.anaconda.com/download
    echo.
    pause
    exit /b 1
)

echo [INFO] Conda found.
echo.

REM Check if environment already exists
call conda env list >nul 2>&1
call conda env list | findstr /i /C:"MLDLMCQ" >nul
if %errorlevel% equ 0 (
    echo [INFO] Environment 'MLDLMCQ' already exists.
    echo [INFO] Activating existing environment...
    call conda activate MLDLMCQ
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to activate environment.
        pause
        exit /b 1
    )
    echo [INFO] Environment activated successfully.
) else (
    echo [INFO] Environment 'MLDLMCQ' does not exist.
    echo.
    echo [STEP 1/5] Creating conda environment 'MLDLMCQ' with Python 3.10...
    echo [INFO] This may take a few minutes...
    call conda create -n MLDLMCQ python=3.10 -y
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create conda environment.
        pause
        exit /b 1
    )
    echo [INFO] Environment created successfully.
    echo.
    echo [STEP 2/5] Activating environment...
    call conda activate MLDLMCQ
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to activate environment.
        pause
        exit /b 1
    )
    echo [INFO] Environment activated successfully.
)

echo.
echo [STEP 3/5] Installing backend dependencies...
echo.

REM Check if pip is available
where pip >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pip not found. Trying to install pip first...
    python -m ensurepip --default-pip
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pip.
        pause
        exit /b 1
    )
)

REM Install backend dependencies using absolute path
pip install -r "%PROJECT_DIR%backend\requirements.txt"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    echo [INFO] Make sure backend/requirements.txt exists and is valid.
    pause
    exit /b 1
)

echo.
echo [STEP 4/5] Backend dependencies installed successfully.
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] npm found.
echo.

REM Install frontend dependencies
echo [STEP 5/5] Installing frontend dependencies...
echo.

REM Change to frontend directory using absolute path
cd /d "%PROJECT_DIR%frontend"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to navigate to frontend directory.
    echo [INFO] Make sure the frontend directory exists at: %PROJECT_DIR%frontend
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

REM Go back to project root
cd /d "%PROJECT_DIR%"

echo.
echo ========================================
echo     Setup Complete!
echo ========================================
echo.
echo [SUCCESS] Backend dependencies installed (including uvicorn)
echo [SUCCESS] Frontend dependencies installed (including vite)
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
