# 🚀 AEGIS-FIN - Complete Setup Guide

## One-Command Setup

```bash
setup.bat
```

That's it! This will:
- ✅ Create virtual environment
- ✅ Install all dependencies
- ✅ Configure environment
- ✅ Run initial data population
- ✅ Set up Windows Task Scheduler
- ✅ Verify everything works

---

## What You Get

### Automated Daily Pipeline
- Runs every weekday at 6:30 PM IST (after market close)
- Fetches latest data for all 134 companies
- Calculates metrics, correlations, ML predictions
- Stores everything in Supabase
- Auto-cleans old data (keeps last 6 months)
- Fully logged and monitored

### Smart Data Management
- 6-month retention (configurable)
- Automatic cleanup after each run
- Storage: ~100-200MB (well within 500MB free tier)
- No manual intervention needed

### Production-Ready Frontend
- Real-time market data
- Sector health monitoring
- Company analytics
- Correlation analysis
- Balance sheet analysis
- ML risk predictions
- Pipeline monitoring

---

## Quick Start

### 1. Run Setup
```bash
setup.bat
```

### 2. Configure Supabase
Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open Browser
```
http://localhost:5173
```

---

## Fixing Common Issues

### Issue: Frontend Shows "Warming Up" / No Data

**Cause:** Pipeline hasn't run yet  
**Solution:**
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

This takes 45-60 minutes but populates all data.

### Issue: Live Market Bar Not Updating

**Cause:** CORS proxy issue  
**Solution:** Check browser console for errors. The app uses `corsproxy.io` which should work automatically.

### Issue: Pipeline Fails

**Check:**
1. Is `backend/.env` configured with Supabase credentials?
2. Are dependencies installed? Run: `venv/Scripts/pip.exe install -r backend/requirements.txt`
3. Is internet connection working?

### Issue: Task Scheduler Not Running

**Solution:**
1. Open Task Scheduler: `taskschd.msc`
2. Find "AEGIS-FIN-Daily-Pipeline"
3. Right-click → Run (to test)
4. Check "Last Run Result" (should be 0x0)

---

## Manual Commands

### Run Pipeline Once
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Run as Scheduled Service
```bash
venv/Scripts/python.exe backend/daily_pipeline.py --schedule
```

### Manual Cleanup
```bash
venv/Scripts/python.exe backend/cleanup_old_data_simple.py
```

### View Logs
```bash
type backend\pipeline_run.log
```

### Check Progress
```bash
type backend\.pipeline_progress.json
```

---

## File Structure

```
AEGIS-FIN/
├── setup.bat                          # One-command setup
├── PRODUCTION_SETUP.md                # Detailed setup guide
├── README_SETUP.md                    # This file
├── backend/
│   ├── daily_pipeline.py              # Main automated pipeline
│   ├── setup_production.py            # Automated setup script
│   ├── setup_daily_task.bat           # Windows Task Scheduler setup
│   ├── cleanup_old_data_simple.py     # Manual cleanup utility
│   ├── .env                           # Configuration (create from .env.example)
│   ├── QUICK_START.md                 # Quick reference
│   ├── DAILY_PIPELINE_GUIDE.md        # Complete guide
│   ├── PIPELINE_SUMMARY.md            # System overview
│   └── DATA_RETENTION_POLICY.md       # Storage management
└── frontend/
    ├── src/
    │   ├── pages/                     # All application pages
    │   ├── components/                # Reusable components
    │   ├── hooks/                     # Custom hooks (including useLiveMarket)
    │   └── lib/                       # API and utilities
    └── package.json
```

---

## Documentation

| File | Purpose |
|------|---------|
| **PRODUCTION_SETUP.md** | Complete production setup guide |
| **backend/QUICK_START.md** | Quick reference for common commands |
| **backend/DAILY_PIPELINE_GUIDE.md** | Detailed pipeline usage guide |
| **backend/PIPELINE_SUMMARY.md** | System architecture overview |
| **backend/DATA_RETENTION_POLICY.md** | Storage management details |

---

## System Architecture

```
┌─────────────────────────────────────────┐
│  Windows Task Scheduler                  │
│  (Runs daily at 6:30 PM IST)            │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Daily Pipeline (daily_pipeline.py)      │
│  - Fetch market data                     │
│  - Calculate metrics                     │
│  - Run ML predictions                    │
│  - Store in Supabase                     │
│  - Auto-cleanup old data                 │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Supabase Database                       │
│  - Companies & Sectors                   │
│  - Metrics & Correlations                │
│  - Balance Sheets                        │
│  - ML Predictions                        │
│  - 6-month retention                     │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)                 │
│  - Real-time market data                 │
│  - Interactive dashboards                │
│  - Analytics & visualizations            │
│  - http://localhost:5173                 │
└─────────────────────────────────────────┘
```

---

## Production Checklist

### Initial Setup
- [ ] Run `setup.bat`
- [ ] Configure `backend/.env` with Supabase credentials
- [ ] Run initial pipeline (45-60 minutes)
- [ ] Verify Windows Task Scheduler is configured
- [ ] Start frontend and verify data is showing

### Daily Monitoring
- [ ] Check pipeline runs successfully
- [ ] Verify data is being updated
- [ ] Monitor Supabase storage usage
- [ ] Review logs for errors

### Weekly Maintenance
- [ ] Review pipeline logs
- [ ] Check for any failed runs
- [ ] Verify data quality
- [ ] Monitor storage usage

---

## Support

### Need Help?
1. Check `PRODUCTION_SETUP.md` for detailed troubleshooting
2. Review logs: `backend/pipeline_run.log`
3. Check progress: `backend/.pipeline_progress.json`
4. Verify Supabase dashboard shows data

### Common Solutions
- **No data:** Run pipeline once manually
- **Live market not working:** Check browser console
- **Pipeline fails:** Check `.env` configuration
- **Task not running:** Check Task Scheduler settings

---

## Summary

**Your complete automated system:**
- ✅ One-command setup
- ✅ Fully automated daily pipeline
- ✅ Smart data management (6-month retention)
- ✅ Auto-cleanup after each run
- ✅ Production-ready frontend
- ✅ Complete monitoring & logging
- ✅ Zero manual intervention needed

**Just run `setup.bat` and you're done!** 🚀

---

## Next Steps

1. **Run setup:** `setup.bat`
2. **Configure Supabase:** Edit `backend/.env`
3. **Start frontend:** `cd frontend && npm run dev`
4. **Open browser:** `http://localhost:5173`
5. **Wait for first pipeline run** (or run manually)
6. **Enjoy your automated system!** 🎉
