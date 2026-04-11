@echo off
REM Quick script to push all updates to GitHub
REM Vercel will automatically deploy the changes

echo.
echo ========================================
echo   Pushing Updates to GitHub
echo ========================================
echo.

REM Show what will be committed
echo Checking changes...
git status
echo.

REM Confirm
set /p confirm="Push all changes to GitHub? (y/n): "
if /i not "%confirm%"=="y" (
    echo Push cancelled.
    pause
    exit /b
)

echo.
echo Adding all changes...
git add .

echo.
echo Committing changes...
git commit -m "feat: Production-ready automated pipeline system

Major improvements:
- Automated daily pipeline with 6-month data retention
- One-command setup script (setup.bat)
- Comprehensive documentation for deployment
- Vercel deployment guides and checklists
- Data cleanup automation
- Environment variable validation
- Optimized Supabase queries
- Production setup automation

Backend:
- daily_pipeline.py: Main automated pipeline
- setup_production.py: Automated setup
- cleanup utilities for data management
- Updated supabase_gateway.py: 6-month retention
- Windows Task Scheduler integration

Frontend:
- Reduced query limits for efficiency
- Better error handling
- Environment variable templates

Documentation:
- Complete setup guides
- Vercel deployment guide
- Production deployment checklist
- Daily pipeline guide
- Data retention policy

This update makes the system production-ready with automated daily updates and smart storage management."

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   Commit Failed
    echo ========================================
    echo.
    echo Check the error message above.
    echo You may need to configure git:
    echo   git config --global user.name "Your Name"
    echo   git config --global user.email "your@email.com"
    echo.
    pause
    exit /b 1
)

echo.
echo Pushing to GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Success!
    echo ========================================
    echo.
    echo Changes pushed to GitHub successfully!
    echo.
    echo Vercel will automatically:
    echo   1. Detect the new commit
    echo   2. Build the frontend
    echo   3. Deploy to production
    echo   4. Update your live site (2-3 minutes)
    echo.
    echo Check deployment status:
    echo   https://vercel.com/dashboard
    echo.
    echo Your live site:
    echo   https://your-app.vercel.app
    echo.
) else (
    echo.
    echo ========================================
    echo   Push Failed
    echo ========================================
    echo.
    echo Common issues:
    echo   1. Not authenticated - run: git config credential.helper store
    echo   2. No remote set - run: git remote add origin your-repo-url
    echo   3. Branch doesn't exist - run: git push -u origin main
    echo.
    echo Try:
    echo   git remote -v  (check remote URL)
    echo   git pull origin main  (pull latest first)
    echo.
)

pause
