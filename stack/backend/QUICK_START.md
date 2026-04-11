# 🚀 Quick Start - Daily Pipeline

## One-Time Setup

### 1. Install Dependencies
```bash
venv/Scripts/pip.exe install -r backend/requirements.txt
```

### 2. Configure Environment
```bash
# Copy and edit .env file
cp backend/.env.example backend/.env
# Add your SUPABASE_URL and SUPABASE_SERVICE_KEY
```

### 3. Setup Windows Task (Recommended)
```bash
# Run as Administrator
cd backend
setup_daily_task.bat
```

✅ Done! Pipeline will run automatically every weekday at 6:30 PM IST

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

### Custom Schedule (2 PM UTC = 7:30 PM IST)
```bash
venv/Scripts/python.exe backend/daily_pipeline.py --schedule --time 14:00
```

### Keep Only 3 Months of Data
```bash
venv/Scripts/python.exe backend/daily_pipeline.py --schedule --retention-days 90
```

### Manual Cleanup
```bash
venv/Scripts/python.exe backend/cleanup_old_data_simple.py
```

---

## What Happens Daily?

```
6:30 PM IST (1:00 PM UTC)
    ↓
📊 Fetch latest market data
    ↓
🔄 Process all companies
    ↓
💾 Store in Supabase
    ↓
🧹 Delete old data (>6 months)
    ↓
✅ Complete & Log
```

---

## Monitor

### View Logs
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

### Check Task Status
```bash
schtasks /Query /TN "AEGIS-FIN-Daily-Pipeline"
```

---

## Troubleshooting

### ❌ Module not found
```bash
venv/Scripts/pip.exe install -r backend/requirements.txt
```

### ❌ Environment variables missing
Check `backend/.env` has:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

### ❌ Task not running
1. Open Task Scheduler: `taskschd.msc`
2. Find "AEGIS-FIN-Daily-Pipeline"
3. Right-click → Run (to test)

---

## Key Features

✅ **Automatic Daily Runs** - No manual intervention needed  
✅ **Smart Data Retention** - Keeps only last 6 months  
✅ **Auto-Cleanup** - Frees storage after each run  
✅ **Resume Support** - Continues from where it left off  
✅ **Full Logging** - Track everything that happens  
✅ **Windows Task Integration** - Runs even when logged out  

---

## Storage Management

| Retention | Storage | Use Case |
|-----------|---------|----------|
| 3 months (90 days) | ~50-100MB | Minimal storage |
| 6 months (180 days) | ~100-200MB | **Recommended** |
| 1 year (365 days) | ~200-400MB | Extended history |

**Supabase Free Tier:** 500MB limit

---

## Need More Help?

📖 Full Guide: `backend/DAILY_PIPELINE_GUIDE.md`  
📊 Data Retention: `backend/DATA_RETENTION_POLICY.md`  
🔧 Configuration: Edit `backend/daily_pipeline.py`
