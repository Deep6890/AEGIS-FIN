@echo off
REM Setup Windows Task Scheduler for Daily Pipeline
REM This creates a scheduled task that runs the pipeline daily at 6:30 PM IST (1:00 PM UTC)

echo ========================================
echo AEGIS-FIN Daily Pipeline Setup
echo ========================================
echo.

REM Get the current directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set VENV_PYTHON=%PROJECT_ROOT%\venv\Scripts\python.exe
set PIPELINE_SCRIPT=%SCRIPT_DIR%daily_pipeline.py

echo Project Root: %PROJECT_ROOT%
echo Python: %VENV_PYTHON%
echo Pipeline Script: %PIPELINE_SCRIPT%
echo.

REM Check if venv exists
if not exist "%VENV_PYTHON%" (
    echo ERROR: Virtual environment not found at %VENV_PYTHON%
    echo Please create venv first: python -m venv venv
    pause
    exit /b 1
)

echo Creating Windows Scheduled Task...
echo Task Name: AEGIS-FIN-Daily-Pipeline
echo Schedule: Daily at 6:30 PM IST (1:00 PM UTC)
echo.

REM Create the scheduled task
schtasks /Create /TN "AEGIS-FIN-Daily-Pipeline" /TR "\"%VENV_PYTHON%\" \"%PIPELINE_SCRIPT%\"" /SC DAILY /ST 13:00 /F

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Task created successfully
    echo ========================================
    echo.
    echo The pipeline will run daily at 1:00 PM UTC (6:30 PM IST)
    echo.
    echo To manage the task:
    echo   - View: taskschd.msc
    echo   - Run now: schtasks /Run /TN "AEGIS-FIN-Daily-Pipeline"
    echo   - Delete: schtasks /Delete /TN "AEGIS-FIN-Daily-Pipeline" /F
    echo.
) else (
    echo.
    echo ERROR: Failed to create scheduled task
    echo Please run this script as Administrator
    echo.
)

pause
