# Daily Pipeline Automation Guide

## Overview
The daily pipeline system automatically:
1. ✅ Runs at scheduled time each day (after market close)
2. ✅ Processes all companies with latest market data
3. ✅ Stores results in Supabase
4. ✅ Automatically deletes old data (keeps last 6 months)
5. ✅ Logs everything for monitoring

## Quick Start

### Option 1: Run Once Now
```bash
# From project root
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Option 2: Run as Scheduled Service
```bash
# Run daily at 6:30 PM IST (1:00 PM UTC)
venv/Scripts/python.exe backend/daily_pipeline.py --schedule
```

### Option 3: Windows Task Scheduler (Recommended)
```bash
# Run as Administrator
cd backend
setup_daily_task.bat
```

This creates a Windows scheduled task that runs automatically every day.

## Configuration Options

### Custom Schedule Time
```bash
# Run at 2:00 PM UTC (7:30 PM IST)
python daily_pipeline.py --schedule --time 14:00
```

### Custom Data Retention
```bash
# Keep only 3 months of data (90 days)
python daily_pipeline.py --schedule --retention-days 90

# Keep 1 year of data (365 days)
python daily_pipeline.py --schedule --retention-days 365
```

### Disable Auto-Cleanup
```bash
# Run pipeline without automatic cleanup
python daily_pipeline.py --schedule --no-cleanup
```

## How It Works

### Daily Workflow
```
1. Pipeline Starts (scheduled time)
   ↓
2. Pre-compute Sector Data (once for all companies)
   ↓
3. Process Each Company
   - Fetch latest market data
   - Calculate metrics & correlations
   - Run ML predictions
   - Store in Supabase
   ↓
4. Auto-Cleanup Old Data
   - Delete rows older than retention period
   - Free up database storage
   ↓
5. Log Results & Complete
```

### Data Retention Strategy

**Default: 6 months (180 days)**

| Data Type | Retention | Why |
|-----------|-----------|-----|
| Sector Metrics | 6 months | Sufficient for trend analysis |
| Company Metrics | 6 months | Covers multiple quarters |
| Correlations | 6 months | Recent relationships matter most |
| ML Predictions | 6 months | Historical predictions for validation |
| Balance Sheets | 6 months | Latest financial health |

**Storage Impact:**
- Before: ~500MB+ (3 years of data)
- After: ~100-200MB (6 months of data)
- Savings: 60-80% reduction

## Monitoring

### Check Logs
```bash
# View recent logs
tail -n 100 backend/pipeline_run.log

# Watch live (Windows PowerShell)
Get-Content backend/pipeline_run.log -Wait -Tail 50
```

### Check Progress
```bash
# View progress file
cat backend/.pipeline_progress.json
```

### Manual Cleanup
```bash
# Run cleanup separately if needed
venv/Scripts/python.exe backend/cleanup_old_data_simple.py
```

## Windows Task Scheduler Management

### View Task
```bash
# Open Task Scheduler GUI
taskschd.msc
```

### Run Task Manually
```bash
schtasks /Run /TN "AEGIS-FIN-Daily-Pipeline"
```

### Delete Task
```bash
schtasks /Delete /TN "AEGIS-FIN-Daily-Pipeline" /F
```

### Check Task Status
```bash
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"
```

## Troubleshooting

### Pipeline Fails to Start
**Problem:** Module not found errors
**Solution:** 
```bash
# Install dependencies in venv
venv/Scripts/pip.exe install -r backend/requirements.txt
```

### Cleanup Timeouts
**Problem:** Some tables timeout during cleanup
**Solution:** These will be cleaned on next run. The gateway also auto-cleans during pipeline execution.

### No Data in Supabase
**Problem:** Environment variables not loaded
**Solution:** 
1. Check `backend/.env` exists
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
3. Copy from `.env.example` if needed

### Task Doesn't Run
**Problem:** Windows Task Scheduler not triggering
**Solution:**
1. Open Task Scheduler (`taskschd.msc`)
2. Find "AEGIS-FIN-Daily-Pipeline"
3. Check "Last Run Result" (should be 0x0 for success)
4. Verify "Next Run Time" is correct
5. Run manually to test: Right-click → Run

## Best Practices

### 1. Monitor First Week
- Check logs daily for first week
- Verify data is being stored correctly
- Confirm cleanup is working

### 2. Adjust Retention as Needed
- Start with 6 months (180 days)
- Increase if you need more historical data
- Decrease if approaching storage limits

### 3. Backup Important Data
- Export critical data before cleanup
- Keep CSV backups of key metrics
- Archive ML model predictions

### 4. Schedule During Off-Hours
- Default: 6:30 PM IST (after market close)
- Avoid peak usage times
- Consider server load

### 5. Set Up Alerts
- Monitor log file for errors
- Set up email notifications (optional)
- Track pipeline success rate

## Advanced Configuration

### Run Multiple Times Per Day
```bash
# Morning run at 9:00 AM UTC
python daily_pipeline.py --schedule --time 09:00

# Evening run at 1:00 PM UTC (in separate terminal)
python daily_pipeline.py --schedule --time 13:00
```

### Custom Cleanup Schedule
```python
# Edit daily_pipeline.py
RETENTION_DAYS = 90  # 3 months
CLEANUP_AFTER_RUN = True  # Always cleanup
```

### Selective Company Processing
```bash
# Process only first 10 companies
python run_pipeline.py --start 0 --end 10

# Resume from where it left off
python run_pipeline.py --resume
```

## Performance Optimization

### Expected Runtime
- **Small batch (10 companies):** ~5-10 minutes
- **Medium batch (50 companies):** ~20-30 minutes
- **Full batch (100+ companies):** ~45-60 minutes

### Speed Tips
1. Run during off-peak hours
2. Use `--resume` flag to skip completed companies
3. Increase sleep time between companies if hitting rate limits
4. Consider splitting into multiple smaller batches

## Support

### Common Commands Reference
```bash
# Run once now
venv/Scripts/python.exe backend/daily_pipeline.py

# Schedule daily
venv/Scripts/python.exe backend/daily_pipeline.py --schedule

# Custom time (2 PM UTC)
venv/Scripts/python.exe backend/daily_pipeline.py --schedule --time 14:00

# Keep 3 months only
venv/Scripts/python.exe backend/daily_pipeline.py --schedule --retention-days 90

# No auto-cleanup
venv/Scripts/python.exe backend/daily_pipeline.py --schedule --no-cleanup

# Manual cleanup
venv/Scripts/python.exe backend/cleanup_old_data_simple.py

# View logs
type backend\pipeline_run.log
```

### Need Help?
- Check logs: `backend/pipeline_run.log`
- Check progress: `backend/.pipeline_progress.json`
- Review errors in log file
- Verify .env configuration
