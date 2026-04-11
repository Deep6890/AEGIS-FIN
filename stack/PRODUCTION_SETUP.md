# 🚀 AEGIS-FIN Production Setup Guide

## Quick Setup (5 Minutes)

### Step 1: Run Automated Setup
```bash
# From project root
venv/Scripts/python.exe backend/setup_production.py
```

This script will:
- ✅ Check environment configuration
- ✅ Install all dependencies
- ✅ Run initial data population (optional)
- ✅ Set up Windows Task Scheduler
- ✅ Verify everything works

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Step 3: Access Application
Open browser: `http://localhost:5173`

---

## What's Automated

### Daily Pipeline (Runs Automatically)
- **Schedule:** Every weekday at 6:30 PM IST (1:00 PM UTC)
- **Duration:** 45-60 minutes
- **What it does:**
  1. Fetches latest market data for all companies
  2. Calculates metrics, correlations, ML predictions
  3. Stores everything in Supabase
  4. Automatically cleans up old data (>6 months)
  5. Logs all activity

### Data Management
- **Retention:** 6 months (configurable)
- **Auto-cleanup:** After each successful run
- **Storage:** ~100-200MB (well within 500MB free tier)

---

## Fixing Frontend Issues

### Issue 1: Live Market Bar Not Updating

**Problem:** CORS proxy not working  
**Solution:** The live market hook uses `corsproxy.io` which should work. If it doesn't:

1. Check browser console for errors
2. Try alternative proxy in `frontend/src/hooks/useLiveMarket.js`:
   ```javascript
   // Option 1: allorigins
   const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${YF_BASE}/${symbol}?interval=1d&range=2d`)}`;
   
   // Option 2: cors-anywhere (if you set up your own)
   const url = `https://your-cors-proxy.herokuapp.com/${YF_BASE}/${symbol}?interval=1d&range=2d`;
   ```

### Issue 2: "Warming Up" Messages Everywhere

**Problem:** No data in database  
**Solution:** Run the pipeline to populate data

```bash
# Run once to populate all data
venv/Scripts/python.exe backend/daily_pipeline.py
```

This will take 45-60 minutes but will populate:
- All sector data
- All company metrics
- Correlations
- Balance sheets
- ML predictions

### Issue 3: Empty Pages (Sectors, Correlation, Balance Sheet)

**Problem:** Pipeline hasn't run yet  
**Solution:** Same as above - run the pipeline once

### Issue 4: VIX Z-Score Not Showing

**Problem:** Macro overlay data missing  
**Solution:** Pipeline populates this automatically

### Issue 5: Pipeline Monitor Shows "No Runs"

**Problem:** Pipeline hasn't been executed  
**Solution:** Run pipeline manually or wait for scheduled run

---

## Manual Commands

### Run Pipeline Once
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Run Pipeline with Custom Settings
```bash
# Keep only 3 months of data
venv/Scripts/python.exe backend/daily_pipeline.py --retention-days 90

# Run without cleanup
venv/Scripts/python.exe backend/daily_pipeline.py --no-cleanup
```

### Start Scheduled Service
```bash
venv/Scripts/python.exe backend/daily_pipeline.py --schedule
```

### Manual Cleanup
```bash
venv/Scripts/python.exe backend/cleanup_old_data_simple.py
```

### Check Logs
```bash
# Windows
type backend\pipeline_run.log

# PowerShell (live)
Get-Content backend\pipeline_run.log -Wait -Tail 50
```

### Check Progress
```bash
type backend\.pipeline_progress.json
```

---

## Windows Task Scheduler

### View Task
```bash
taskschd.msc
```

### Run Task Manually
```bash
schtasks /Run /TN "AEGIS-FIN-Daily-Pipeline"
```

### Check Task Status
```bash
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"
```

### Delete Task
```bash
schtasks /Delete /TN "AEGIS-FIN-Daily-Pipeline" /F
```

---

## Troubleshooting

### Frontend Shows No Data

**Check 1:** Is Supabase configured?
```bash
# Check backend/.env has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

**Check 2:** Has pipeline run?
```bash
# Check if pipeline has run
type backend\pipeline_run.log
```

**Check 3:** Is data in Supabase?
- Open Supabase dashboard
- Check `companies` table has rows
- Check `sector_health` table has rows

**Solution:** Run pipeline once
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Live Market Data Not Loading

**Check 1:** Browser console errors
- Open DevTools (F12)
- Check Console tab for errors

**Check 2:** CORS proxy working
- Try accessing: https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/^NSEI
- Should return JSON data

**Solution:** If proxy not working, use alternative in code (see above)

### Pipeline Fails

**Check 1:** Dependencies installed
```bash
venv/Scripts/pip.exe install -r backend/requirements.txt
```

**Check 2:** Environment variables set
```bash
# Check backend/.env exists and has correct values
```

**Check 3:** Internet connection
- Pipeline needs to fetch data from Yahoo Finance
- Check firewall/proxy settings

**Check 4:** Supabase connection
```bash
# Test connection
venv/Scripts/python.exe -c "from supabase import create_client; import os; from dotenv import load_dotenv; load_dotenv('backend/.env'); sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY')); print('Connected:', sb.table('companies').select('id').limit(1).execute())"
```

### Task Scheduler Not Running

**Check 1:** Task exists
```bash
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"
```

**Check 2:** Task enabled
- Open Task Scheduler (taskschd.msc)
- Find "AEGIS-FIN-Daily-Pipeline"
- Check "Status" is "Ready"
- Check "Next Run Time" is set

**Check 3:** Run manually to test
```bash
schtasks /Run /TN "AEGIS-FIN-Daily-Pipeline"
```

**Check 4:** Check task history
- Open Task Scheduler
- Right-click task → Properties
- Go to History tab
- Check for errors

---

## Production Checklist

### Before Going Live

- [ ] Environment variables configured in `backend/.env`
- [ ] Dependencies installed: `pip install -r backend/requirements.txt`
- [ ] Initial pipeline run completed successfully
- [ ] Windows Task Scheduler configured
- [ ] Frontend running and showing data
- [ ] Live market bar updating
- [ ] All pages showing data (not "warming up")
- [ ] Logs being written to `backend/pipeline_run.log`

### After Going Live

- [ ] Monitor logs daily for first week
- [ ] Verify scheduled task runs successfully
- [ ] Check Supabase storage usage
- [ ] Confirm data is being updated daily
- [ ] Test all frontend pages work correctly

---

## Performance Optimization

### Expected Runtime
- **10 companies:** ~5-10 minutes
- **50 companies:** ~20-30 minutes
- **134 companies:** ~45-60 minutes

### Speed Tips
1. Run during off-peak hours (default: after market close)
2. Use `--resume` flag if interrupted
3. Increase sleep time if hitting rate limits
4. Consider splitting into batches for very large datasets

---

## Monitoring

### Daily Checks
```bash
# Check if pipeline ran today
type backend\pipeline_run.log | findstr /C:"DAILY PIPELINE JOB COMPLETED"

# Check for errors
type backend\pipeline_run.log | findstr /C:"ERROR"

# Check progress
type backend\.pipeline_progress.json
```

### Weekly Checks
- Review Supabase storage usage
- Check for any failed runs
- Verify data quality in frontend
- Review cleanup logs

### Monthly Checks
- Review retention policy (adjust if needed)
- Check for any performance issues
- Update dependencies if needed
- Backup important data

---

## Support

### Documentation
- **Quick Start:** `backend/QUICK_START.md`
- **Full Guide:** `backend/DAILY_PIPELINE_GUIDE.md`
- **Pipeline Summary:** `backend/PIPELINE_SUMMARY.md`
- **Data Retention:** `backend/DATA_RETENTION_POLICY.md`

### Common Issues
1. **No data in frontend** → Run pipeline once
2. **Live market not updating** → Check CORS proxy
3. **Pipeline fails** → Check logs and environment
4. **Task not running** → Check Task Scheduler settings

### Getting Help
1. Check logs: `backend/pipeline_run.log`
2. Check progress: `backend/.pipeline_progress.json`
3. Review documentation files
4. Check Supabase dashboard for data

---

## Summary

**Your system is now:**
- ✅ Fully automated (runs daily)
- ✅ Self-maintaining (auto-cleanup)
- ✅ Production-ready
- ✅ Monitored (full logging)
- ✅ Optimized (6-month retention)

**Just run the setup script and you're done!** 🚀

```bash
venv/Scripts/python.exe backend/setup_production.py
```
