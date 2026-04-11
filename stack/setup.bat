@echo off
REM AEGIS-FIN One-Command Production Setup
REM Run this script to set up everything automatically

echo.
echo ========================================
echo   AEGIS-FIN Production Setup
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Run the setup script
echo Running automated setup...
echo.
venv\Scripts\python.exe backend\setup_production.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Setup Complete!
    echo ========================================
    echo.
    echo Your AEGIS-FIN system is ready!
    echo.
    echo Next steps:
    echo   1. Start frontend: cd frontend ^&^& npm install ^&^& npm run dev
    echo   2. Open browser: http://localhost:5173
    echo.
    echo The pipeline will run automatically every weekday at 6:30 PM IST
    echo.
) else (
    echo.
    echo ========================================
    echo   Setup Failed
    echo ========================================
    echo.
    echo Please check the errors above and try again.
    echo.
)

pause
