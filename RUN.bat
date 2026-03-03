@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     MLDL PDF MCQ - Running Application
echo ========================================
echo.

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"

REM Check if conda is installed
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Conda is not installed or not in PATH.
    echo Please install Anaconda or Miniconda from https://www.anaconda.com/download
    echo.
    pause
    exit /b 1
)

REM Check if environment "MLDLMCQ" exists
conda env list | findstr /b /c:"MLDLMCQ " >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Environment 'MLDLMCQ' does not exist.
    echo Please run SETUP.bat first to create the environment.
    echo.
    echo To create the environment, run:
    echo   SETUP.bat
    echo.
    pause
    exit /b 1
)

echo [1/5] Activating conda environment 'MLDLMCQ'...
call conda activate MLDLMCQ
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate environment.
    echo Please run SETUP.bat first to create the environment.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/5] Starting backend server on port 8000...
echo.

REM Start backend server in a new window with conda activated
start "Backend Server" cmd /k "conda activate MLDLMCQ && cd /d "%PROJECT_DIR%backend" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/5] Waiting for backend to start (5 seconds)...
timeout /t 5 /nobreak >nul

echo.
echo [4/5] Starting frontend development server on port 5173...
echo.

REM Start frontend dev server in a new window with conda activated
start "Frontend Server" cmd /k "conda activate MLDLMCQ && cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo [5/5] Waiting for frontend to start (3 seconds)...
timeout /t 3 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo ========================================
echo     Application Started!
echo ========================================
echo.
echo Backend API:   http://localhost:8000
echo Frontend:      http://localhost:5173
echo.
echo IMPORTANT: Keep both terminal windows open!
echo.
echo - "Backend Server" window - runs the API server
echo - "Frontend Server" window - runs the dev server
echo.
echo To stop the servers, close these terminal windows.
echo.
pause
