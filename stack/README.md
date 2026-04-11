# 🚀 AEGIS-FIN - Automated Financial Intelligence System

**Complete ML-powered financial analytics platform with automated daily pipeline and real-time market monitoring.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Support](#support)

---

## 🎯 Overview

AEGIS-FIN is a production-ready financial analytics platform that:
- ✅ Fetches live market data daily
- ✅ Calculates 40+ financial metrics
- ✅ Runs ML survival predictions
- ✅ Monitors sector health
- ✅ Tracks correlations
- ✅ Analyzes balance sheets
- ✅ Auto-manages data retention

**Perfect for:** Financial analysts, portfolio managers, risk teams, and investors.

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

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/aegis-fin.git
cd aegis-fin
```

### 2. Setup Backend
```bash
# Run automated setup
setup.bat  # Windows
# OR
python backend/setup_production.py  # Linux/Mac
```

This will:
- Create virtual environment
- Install dependencies
- Configure environment
- Run initial data population
- Set up daily automation

### 3. Configure Supabase
Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
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

## 📦 Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
vercel
```

Or use Vercel Dashboard:
1. Import GitHub repository
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy!

**See:** [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed guide

### Setup Backend Automation

**Windows:**
```bash
cd backend
setup_daily_task.bat
```

**Linux/Mac:**
```bash
crontab -e
# Add: 0 13 * * 1-5 /path/to/venv/bin/python /path/to/backend/daily_pipeline.py
```

**See:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete checklist

---

## 📚 Documentation

### Quick References
- **[README_SETUP.md](README_SETUP.md)** - Complete setup guide
- **[QUICK_START.md](backend/QUICK_START.md)** - Quick command reference
- **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** - Production deployment

### Detailed Guides
- **[DAILY_PIPELINE_GUIDE.md](backend/DAILY_PIPELINE_GUIDE.md)** - Pipeline usage
- **[PIPELINE_SUMMARY.md](backend/PIPELINE_SUMMARY.md)** - System overview
- **[DATA_RETENTION_POLICY.md](backend/DATA_RETENTION_POLICY.md)** - Storage management

### Deployment
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Vercel deployment guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre-launch checklist

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

### Database
- **Platform:** Supabase
- **Type:** PostgreSQL
- **Features:** RLS, Real-time, REST API
- **Storage:** 500MB free tier

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
│   ├── .env.example            # Environment template
│   └── requirements.txt        # Python dependencies
│
├── setup.bat                    # One-command setup (Windows)
├── README.md                    # This file
├── README_SETUP.md              # Setup guide
├── PRODUCTION_SETUP.md          # Production guide
├── VERCEL_DEPLOYMENT.md         # Vercel guide
└── DEPLOYMENT_CHECKLIST.md      # Deployment checklist
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

## 🧪 Testing

### Backend
```bash
# Test connection
python backend/test_connection.py

# Run pipeline once
python backend/daily_pipeline.py

# Check logs
tail -f backend/pipeline_run.log
```

### Frontend
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## 📈 Monitoring

### Logs
```bash
# Backend logs
tail -f backend/pipeline_run.log

# Progress
cat backend/.pipeline_progress.json
```

### Dashboards
- **Vercel:** Dashboard → Your Project → Analytics
- **Supabase:** Dashboard → Settings → Usage
- **Pipeline:** Frontend → Pipeline Monitor page

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

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

[Your License Here]

---

## 🆘 Support

### Documentation
- Check the `/docs` folder
- Read the guides in root directory
- Review inline code comments

### Common Issues
1. **No data:** Run backend pipeline
2. **Build fails:** Check environment variables
3. **Pipeline fails:** Check logs and internet connection
4. **Slow loading:** Check Supabase query performance

### Getting Help
1. Check documentation
2. Review logs
3. Check Supabase dashboard
4. Open an issue on GitHub

---

## 🎉 Acknowledgments

- **Yahoo Finance** for market data
- **Supabase** for database platform
- **Vercel** for hosting
- **CatBoost** for ML framework

---

## 📞 Contact

- **Email:** [your-email@example.com]
- **GitHub:** [your-github-username]
- **Website:** [your-website.com]

---

**Built with ❤️ for financial analysts and investors**

🚀 **Ready to deploy? Run `setup.bat` and follow the guides!**
