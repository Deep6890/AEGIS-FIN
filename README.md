# 🚀 AEGIS-FIN - Automated Financial Intelligence System

**Complete ML-powered financial analytics platform with automated daily pipeline and real-time market monitoring.**

---

## 📋 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account
- Git

### 1. Setup Backend
```bash
# Run automated setup
setup.bat  # Windows

# This will:
# - Create virtual environment
# - Install dependencies
# - Configure environment
# - Set up daily automation
```

### 2. Configure Supabase
Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

### 3. Run Initial Pipeline
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

### 4. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase ANON key
npm run dev
```

### 5. Open Browser
```
http://localhost:5173
```

---

## 🌐 Deploy to Vercel

### Frontend Deployment

```bash
cd frontend
vercel
```

Or use Vercel Dashboard:
1. Import your GitHub repository
2. Set root directory to `frontend`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Backend Setup (Your Server)

```bash
# Windows
cd backend
setup_daily_task.bat

# Linux/Mac
crontab -e
# Add: 0 13 * * 1-5 /path/to/venv/bin/python /path/to/backend/daily_pipeline.py
```

---

## ✨ Features

### 🤖 Automated Daily Pipeline
- Runs every weekday at 6:30 PM IST (after market close)
- Fetches data for 134+ companies
- Processes 9 analytical layers
- Auto-cleans old data (6-month retention)
- Fully logged and monitored

### 📊 Real-Time Dashboard
- Live market data (Nifty 50, Sensex, Bank Nifty, etc.)
- Sector health monitoring
- Company analytics
- Correlation analysis
- Balance sheet analysis
- ML risk predictions

### 🧠 ML-Powered Insights
- CatBoost survival model
- 0-100 risk scores per company
- Sector-adjusted predictions
- Macro overlay integration
- Daily score updates

### 💾 Smart Data Management
- 6-month retention (configurable)
- Automatic cleanup
- ~100-200MB storage (free tier friendly)
- Efficient Supabase queries

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                       │
│  - React + Vite                          │
│  - Real-time updates                     │
│  - Responsive design                     │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Supabase (Database)                     │
│  - PostgreSQL                            │
│  - Row Level Security                    │
│  - Real-time subscriptions               │
└─────────────────┬───────────────────────┘
                  ↑
┌─────────────────────────────────────────┐
│  Backend Pipeline (Your Server)          │
│  - Python 3.8+                           │
│  - Daily automation                      │
│  - ML predictions                        │
│  - Data cleanup                          │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **State:** Context API
- **Deployment:** Vercel

### Backend
- **Language:** Python 3.8+
- **ML:** CatBoost, scikit-learn
- **Data:** pandas, numpy
- **API:** Yahoo Finance
- **Database:** Supabase (PostgreSQL)
- **Scheduling:** Windows Task Scheduler / cron

---

## 📊 Project Structure

```
aegis-fin/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── pages/              # Application pages
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # Custom hooks
│   │   ├── context/            # State management
│   │   └── lib/                # API & utilities
│   ├── .env.example            # Environment template
│   └── vercel.json             # Vercel config
│
├── backend/                     # Python backend
│   ├── logic/LogicEngine/      # Analytics engine
│   ├── ml_engine/              # ML models
│   ├── db/                     # Database gateway
│   ├── daily_pipeline.py       # Main pipeline
│   ├── setup_production.py     # Automated setup
│   ├── cleanup_old_data_simple.py  # Manual cleanup
│   ├── setup_daily_task.bat    # Windows scheduler
│   ├── .env.example            # Environment template
│   └── requirements.txt        # Python dependencies
│
├── setup.bat                    # One-command setup (Windows)
└── README.md                    # This file
```

---

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

**Frontend (`frontend/.env`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Vercel (Dashboard → Settings → Environment Variables):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 📈 Usage

### Run Pipeline Manually
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

### Run with Custom Settings
```bash
# Keep only 3 months of data
venv/Scripts/python.exe backend/daily_pipeline.py --retention-days 90

# Run without cleanup
venv/Scripts/python.exe backend/daily_pipeline.py --no-cleanup
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

---

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ Row Level Security (RLS) on Supabase
- ✅ HTTPS everywhere (Vercel automatic)
- ✅ Anon key for frontend, service key for backend
- ✅ No secrets in Git

---

## 💰 Cost

### Free Tier (Recommended for Start)
- **Vercel:** Free (Hobby plan)
- **Supabase:** Free (500MB database)
- **Backend:** $0 (run locally)
- **Total:** $0/month

### Paid Tier (For Production)
- **Vercel Pro:** $20/month
- **Supabase Pro:** $25/month
- **Cloud Server:** $5-10/month
- **Total:** ~$50-55/month

---

## 🆘 Troubleshooting

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

**Solution:** Run pipeline once
```bash
venv/Scripts/python.exe backend/daily_pipeline.py
```

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

### Git Push Issues

```bash
# If on wrong branch
git checkout main
git pull origin main
git merge your-branch
git push origin main
```

---

## 📞 Support

### Common Issues
1. **No data:** Run backend pipeline
2. **Build fails:** Check environment variables
3. **Pipeline fails:** Check logs and internet connection
4. **Slow loading:** Check Supabase query performance

### Getting Help
1. Check documentation
2. Review logs: `backend/pipeline_run.log`
3. Check Supabase dashboard
4. Open an issue on GitHub

---

## 📝 License

[Your License Here]

---

**Built with ❤️ for financial analysts and investors**

🚀 **Ready to deploy? Run `setup.bat` and follow the guide!**
