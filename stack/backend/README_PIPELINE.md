# 🚀 AEGIS-FIN Automated Daily Pipeline

## Overview

This is a **fully automated daily pipeline system** that processes market data, runs analytics, and manages database storage efficiently.

## 🎯 What It Does

1. **Fetches** latest market data for all companies
2. **Calculates** metrics, correlations, and ML predictions
3. **Stores** results in Supabase database
4. **Cleans** old data automatically to stay within storage limits
5. **Logs** everything for monitoring

## ⚡ Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
venv/Scripts/pip.exe install -r requirements.txt
```

### Step 2: Configure Environment
```bash
# Edit backend/.env with your Supabase credentials
SUPABASE_URL=your_url_here
SUPABASE_SERVICE_KEY=your_key_here
```

### Step 3: Setup Automation
```bash
# Run as Administrator
cd backend
setup_daily_task.bat
```

✅ **Done!** Pipeline runs automatically every weekday at 6:30 PM IST

## 📚 Documentation

| File | Description |
|------|-------------|
| **[QUICK_START.md](QUICK_START.md)** | Quick reference for common commands |
| **[PIPELINE_SUMMARY.md](PIPELINE_SUMMARY.md)** | Complete system overview |
| **[DAILY_PIPELINE_GUIDE.md](DAILY_PIPELINE_GUIDE.md)** | Detailed usage guide |
| **[DATA_RETENTION_POLICY.md](DATA_RETENTION_POLICY.md)** | Storage management details |

## 🎮 Usage

### Run Once Now
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

## 📊 Key Features

| Feature | Benefit |
|---------|---------|
| 🤖 **Automated** | Runs daily without manual intervention |
| 💾 **Smart Storage** | Keeps only 6 months of data (configurable) |
| 🧹 **Auto-Cleanup** | Deletes old data after each run |
| 📝 **Full Logging** | Track everything that happens |
| 🔄 **Resume Support** | Continues from where it left off |
| ⚙️ **Configurable** | Adjust schedule, retention, and more |

## 🗂️ Files

### Core Scripts
- `daily_pipeline.py` - Main automated pipeline
- `run_pipeline.py` - Pipeline execution logic
- `scheduler.py` - Legacy scheduler (use daily_pipeline.py instead)
- `cleanup_old_data_simple.py` - Manual cleanup utility

### Setup
- `setup_daily_task.bat` - Windows Task Scheduler setup
- `.env` - Configuration (create from .env.example)

### Documentation
- `README_PIPELINE.md` - This file
- `QUICK_START.md` - Quick reference
- `PIPELINE_SUMMARY.md` - System overview
- `DAILY_PIPELINE_GUIDE.md` - Complete guide
- `DATA_RETENTION_POLICY.md` - Storage details

## 🔧 Configuration

### Change Schedule Time
```bash
# Run at 2:00 PM UTC (7:30 PM IST)
python daily_pipeline.py --schedule --time 14:00
```

### Adjust Data Retention
```bash
# Keep only 3 months (90 days)
python daily_pipeline.py --schedule --retention-days 90

# Keep 1 year (365 days)
python daily_pipeline.py --schedule --retention-days 365
```

### Disable Auto-Cleanup
```bash
python daily_pipeline.py --schedule --no-cleanup
```

## 📈 Performance

| Companies | Runtime |
|-----------|---------|
| 10 | ~5-10 minutes |
| 50 | ~20-30 minutes |
| 100+ | ~45-60 minutes |

## 💾 Storage

| Retention | Storage | Status |
|-----------|---------|--------|
| 3 months | ~50-100MB | Minimal |
| **6 months** | **~100-200MB** | **Recommended** |
| 1 year | ~200-400MB | Extended |

**Supabase Free Tier:** 500MB limit

## 🔍 Monitoring

### View Logs
```bash
type backend\pipeline_run.log
```

### Check Progress
```bash
type backend\.pipeline_progress.json
```

### Check Task Status
```bash
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"
```

## 🛠️ Troubleshooting

### Module Not Found
```bash
venv/Scripts/pip.exe install -r backend/requirements.txt
```

### Environment Variables Missing
Check `backend/.env` has SUPABASE_URL and SUPABASE_SERVICE_KEY

### Task Not Running
1. Open Task Scheduler: `taskschd.msc`
2. Find "AEGIS-FIN-Daily-Pipeline"
3. Right-click → Run (to test)

## 📞 Support

- 📖 Read the guides in this directory
- 🔍 Check logs: `pipeline_run.log`
- 📊 Check progress: `.pipeline_progress.json`
- 🐛 Review errors in log file

## 🎉 Success!

Your pipeline is now:
- ✅ Fully automated
- ✅ Storage optimized
- ✅ Self-maintaining
- ✅ Production ready

**Just set it up once and let it run!** 🚀

---

*For detailed information, see [PIPELINE_SUMMARY.md](PIPELINE_SUMMARY.md)*
