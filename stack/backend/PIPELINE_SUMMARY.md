# 📊 AEGIS-FIN Daily Pipeline System

## What You Have Now

### ✅ Automated Daily Pipeline
- **Runs automatically** every weekday at 6:30 PM IST (1:00 PM UTC)
- **Processes all companies** with latest market data
- **Stores results** in Supabase database
- **Auto-cleans old data** to stay within free tier limits
- **Fully logged** for monitoring and debugging

### ✅ Smart Data Management
- **6-month retention** (180 days) - configurable
- **Automatic cleanup** after each successful run
- **Storage optimization** - keeps only necessary data
- **No manual intervention** required

### ✅ Easy Setup & Management
- **Windows Task Scheduler** integration
- **One-command setup** via batch script
- **Resume capability** if interrupted
- **Full documentation** included

---

## Files Created

### Core Pipeline
- `daily_pipeline.py` - Main automated pipeline with cleanup
- `cleanup_old_data_simple.py` - Manual cleanup utility
- `cleanup_old_data_batch.py` - Batch cleanup (for large datasets)

### Setup & Management
- `setup_daily_task.bat` - Windows Task Scheduler setup
- `QUICK_START.md` - Quick reference guide
- `DAILY_PIPELINE_GUIDE.md` - Complete documentation
- `DATA_RETENTION_POLICY.md` - Storage management details
- `PIPELINE_SUMMARY.md` - This file

### Modified Files
- `backend/db/supabase_gateway.py` - Updated retention from 3 years to 6 months
- `frontend/src/lib/api.js` - Reduced query limits for efficiency

---

## How to Use

### Option 1: Automated (Recommended)
```bash
# One-time setup (run as Administrator)
cd backend
setup_daily_task.bat
```
✅ Pipeline runs automatically every weekday at 6:30 PM IST

### Option 2: Manual Run
```bash
# Run once now
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Option 3: Scheduled Service
```bash
# Run as background service
venv/Scripts/python.exe backend/daily_pipeline.py --schedule
```

---

## Daily Workflow

```
┌─────────────────────────────────────────┐
│  6:30 PM IST (After Market Close)       │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Step 1: Pre-compute Sector Data        │
│  - Fetch all sector indices             │
│  - Calculate sector metrics             │
│  - Compute sector health scores         │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Step 2: Process Each Company           │
│  - Fetch latest stock data              │
│  - Calculate company metrics            │
│  - Compute correlations                 │
│  - Analyze balance sheet                │
│  - Run ML predictions                   │
│  - Store in Supabase                    │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Step 3: Auto-Cleanup Old Data          │
│  - Delete rows older than 6 months      │
│  - Free up database storage             │
│  - Keep only necessary data             │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Step 4: Log Results & Complete         │
│  - Record success/failures              │
│  - Update progress file                 │
│  - Ready for next day                   │
└─────────────────────────────────────────┘
```

---

## Storage Impact

### Before Optimization
- **Retention:** 3 years
- **Storage:** ~500MB+ (approaching free tier limit)
- **Risk:** Database overflow

### After Optimization
- **Retention:** 6 months (configurable)
- **Storage:** ~100-200MB (well within limits)
- **Benefit:** 60-80% storage reduction

### Cleanup Results (First Run)
- ✅ Deleted **25,549 old rows**
- ✅ Freed significant storage space
- ✅ Database optimized for daily operations

---

## Configuration Options

### Change Schedule Time
```bash
# Run at 2:00 PM UTC (7:30 PM IST)
python daily_pipeline.py --schedule --time 14:00
```

### Adjust Data Retention
```bash
# Keep only 3 months
python daily_pipeline.py --schedule --retention-days 90

# Keep 1 year
python daily_pipeline.py --schedule --retention-days 365
```

### Disable Auto-Cleanup
```bash
python daily_pipeline.py --schedule --no-cleanup
```

---

## Monitoring

### Check Logs
```bash
# View recent activity
type backend\pipeline_run.log

# Watch live (PowerShell)
Get-Content backend\pipeline_run.log -Wait -Tail 50
```

### Check Progress
```bash
# See what's completed today
type backend\.pipeline_progress.json
```

### Check Task Status
```bash
# View scheduled task
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"

# Run task manually
schtasks /Run /TN "AEGIS-FIN-Daily-Pipeline"
```

---

## Performance

### Expected Runtime
- **10 companies:** ~5-10 minutes
- **50 companies:** ~20-30 minutes
- **100+ companies:** ~45-60 minutes

### Optimization Tips
1. ✅ Runs during off-peak hours (after market close)
2. ✅ Uses resume capability to skip completed companies
3. ✅ Includes rate limiting to avoid API throttling
4. ✅ Batch processing for efficiency

---

## Key Benefits

### 🤖 Automation
- No manual intervention needed
- Runs even when you're not logged in
- Handles errors gracefully with resume capability

### 💾 Storage Optimization
- Automatic cleanup keeps database lean
- Configurable retention period
- Stays within free tier limits

### 📊 Data Quality
- Always uses latest market data
- Consistent daily updates
- Full historical tracking (within retention period)

### 🔍 Monitoring
- Complete logging of all operations
- Progress tracking for resume capability
- Easy troubleshooting with detailed logs

### 🛠️ Flexibility
- Configurable schedule time
- Adjustable retention period
- Can run manually when needed
- Easy to modify and extend

---

## Troubleshooting

### Pipeline Not Running
1. Check Task Scheduler: `taskschd.msc`
2. Verify task exists: "AEGIS-FIN-Daily-Pipeline"
3. Check "Last Run Result" (0x0 = success)
4. Run manually to test

### Module Not Found Errors
```bash
venv/Scripts/pip.exe install -r backend/requirements.txt
```

### Environment Variables Missing
1. Check `backend/.env` exists
2. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set
3. Copy from `.env.example` if needed

### Cleanup Timeouts
- Normal for large tables
- Will be cleaned on next run
- Gateway also auto-cleans during pipeline execution

---

## Next Steps

### 1. Verify Setup
```bash
# Test run once
venv/Scripts/python.exe backend/daily_pipeline.py
```

### 2. Setup Automation
```bash
# Create Windows scheduled task
cd backend
setup_daily_task.bat
```

### 3. Monitor First Week
- Check logs daily
- Verify data is being stored
- Confirm cleanup is working

### 4. Adjust as Needed
- Change schedule time if needed
- Adjust retention period based on needs
- Monitor storage usage in Supabase dashboard

---

## Support & Documentation

📖 **Quick Start:** `QUICK_START.md`  
📚 **Full Guide:** `DAILY_PIPELINE_GUIDE.md`  
💾 **Data Retention:** `DATA_RETENTION_POLICY.md`  
🔧 **Configuration:** Edit `daily_pipeline.py`

---

## Summary

You now have a **fully automated daily pipeline** that:
- ✅ Runs automatically every weekday
- ✅ Processes all companies with latest data
- ✅ Stores results efficiently in Supabase
- ✅ Automatically manages storage to stay within limits
- ✅ Logs everything for monitoring
- ✅ Requires zero manual intervention

**Just set it up once and forget about it!** 🚀
