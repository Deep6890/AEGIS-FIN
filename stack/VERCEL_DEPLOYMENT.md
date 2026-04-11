# 🚀 Vercel Deployment Guide for AEGIS-FIN

## Overview

Your AEGIS-FIN system has two parts:
1. **Frontend (Vercel)** - React app deployed on Vercel
2. **Backend (Your Server)** - Python pipeline running on your local machine or cloud server

## Quick Deployment

### Step 1: Deploy Frontend to Vercel

#### Option A: Using Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set root directory to `frontend`
5. Add environment variables (see below)
6. Deploy!

### Step 2: Configure Environment Variables in Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** Use your Supabase **ANON KEY** (not service key) for frontend!

### Step 3: Setup Backend Pipeline

The backend runs separately on your machine or server:

```bash
# On your local machine or cloud server
cd backend
python setup_production.py
```

This will:
- Install dependencies
- Configure environment
- Set up daily automation
- Run initial data population

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Vercel (Frontend)                       │
│  - React + Vite                          │
│  - Deployed globally                     │
│  - Reads from Supabase                   │
│  - https://your-app.vercel.app           │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Supabase (Database)                     │
│  - PostgreSQL database                   │
│  - Real-time subscriptions               │
│  - Row Level Security (RLS)              │
│  - https://your-project.supabase.co      │
└─────────────────┬───────────────────────┘
                  ↑
┌─────────────────────────────────────────┐
│  Your Server (Backend Pipeline)          │
│  - Python daily pipeline                 │
│  - Fetches market data                   │
│  - Runs analytics & ML                   │
│  - Writes to Supabase                    │
│  - Runs daily at 6:30 PM IST             │
└─────────────────────────────────────────┘
```

---

## Frontend Configuration

### Environment Variables

Create `frontend/.env` (for local development):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**For Vercel:** Add these in Vercel Dashboard → Settings → Environment Variables

### Build Settings in Vercel

- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Backend Configuration

### Local/Server Setup

```bash
# 1. Clone repository
git clone your-repo-url
cd your-repo

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials
```

### Environment Variables (Backend)

Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Important:** Use **SERVICE KEY** (not anon key) for backend!

### Run Initial Pipeline

```bash
# Populate initial data (takes 45-60 minutes)
python backend/daily_pipeline.py
```

### Setup Daily Automation

#### Windows
```bash
# Run as Administrator
cd backend
setup_daily_task.bat
```

#### Linux/Mac (using cron)
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 1:00 PM UTC = 6:30 PM IST)
0 13 * * 1-5 /path/to/venv/bin/python /path/to/backend/daily_pipeline.py
```

---

## Supabase Configuration

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and keys

### 2. Run Database Schema

```sql
-- Run this in Supabase SQL Editor
-- (Your schema.sql file)
```

### 3. Configure Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Create policies for anon access (read-only)
CREATE POLICY "Allow public read access" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON sectors
  FOR SELECT USING (true);
-- ... (repeat for all tables)
```

### 4. Get Your Keys

- **Anon Key:** For frontend (safe to expose)
- **Service Key:** For backend (keep secret!)

Find them in: Supabase Dashboard → Settings → API

---

## Deployment Checklist

### Before Deploying

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] RLS policies configured
- [ ] Environment variables ready
- [ ] Backend tested locally
- [ ] Initial data populated

### Frontend Deployment

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Build successful
- [ ] Site accessible
- [ ] Data loading correctly

### Backend Setup

- [ ] Server/machine ready
- [ ] Python environment configured
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Initial pipeline run successful
- [ ] Daily automation configured
- [ ] Logs being written

---

## Troubleshooting

### Frontend Issues

#### "Missing Supabase environment variables"
**Solution:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Dashboard

#### "No data showing"
**Solution:** 
1. Check Supabase has data (open Supabase dashboard → Table Editor)
2. Run backend pipeline: `python backend/daily_pipeline.py`
3. Check RLS policies allow public read access

#### "Live market data not updating"
**Solution:** 
- Check browser console for CORS errors
- The app uses `corsproxy.io` which should work
- If not, try alternative proxy in `frontend/src/hooks/useLiveMarket.js`

### Backend Issues

#### "Cannot connect to Supabase"
**Solution:**
1. Check `backend/.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Verify service key (not anon key) is used
3. Test connection: `python -c "from supabase import create_client; ..."`

#### "Pipeline fails"
**Solution:**
1. Check logs: `cat backend/pipeline_run.log`
2. Verify internet connection
3. Check Yahoo Finance is accessible
4. Review error messages

#### "Task scheduler not running"
**Solution:**
1. Windows: Check Task Scheduler (`taskschd.msc`)
2. Linux/Mac: Check cron (`crontab -l`)
3. Run manually to test: `python backend/daily_pipeline.py`

---

## Monitoring

### Frontend (Vercel)

- **Analytics:** Vercel Dashboard → Your Project → Analytics
- **Logs:** Vercel Dashboard → Your Project → Deployments → View Logs
- **Performance:** Vercel Dashboard → Your Project → Speed Insights

### Backend

```bash
# View logs
tail -f backend/pipeline_run.log

# Check progress
cat backend/.pipeline_progress.json

# Check last run
ls -lh backend/pipeline_run.log
```

### Supabase

- **Database Size:** Supabase Dashboard → Settings → Usage
- **API Requests:** Supabase Dashboard → Settings → Usage
- **Table Data:** Supabase Dashboard → Table Editor

---

## Scaling

### Frontend (Automatic)

Vercel automatically scales your frontend globally. No configuration needed!

### Backend Options

#### Option 1: Keep Running Locally
- Pros: Simple, no extra cost
- Cons: Requires your machine to be on

#### Option 2: Deploy to Cloud Server
- **AWS EC2:** Small instance (~$5/month)
- **DigitalOcean Droplet:** Basic droplet (~$6/month)
- **Google Cloud Compute:** f1-micro (~$5/month)
- **Heroku:** Basic dyno (~$7/month)

#### Option 3: Serverless Functions (Advanced)
- Use Vercel Serverless Functions
- Requires refactoring Python code
- May hit execution time limits

---

## Cost Breakdown

### Free Tier (Recommended for Start)

- **Vercel:** Free (Hobby plan)
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS

- **Supabase:** Free
  - 500MB database
  - 2GB bandwidth/month
  - 50,000 monthly active users

- **Backend:** $0 (run locally)

**Total: $0/month**

### Paid Tier (For Production)

- **Vercel Pro:** $20/month
  - More bandwidth
  - Team collaboration
  - Advanced analytics

- **Supabase Pro:** $25/month
  - 8GB database
  - 50GB bandwidth/month
  - Daily backups

- **Cloud Server:** $5-10/month
  - AWS/DigitalOcean/GCP
  - Always-on backend

**Total: ~$50-55/month**

---

## Security Best Practices

### Frontend

- ✅ Use ANON KEY only (never service key)
- ✅ Enable RLS on all Supabase tables
- ✅ Validate user input
- ✅ Use HTTPS (automatic with Vercel)

### Backend

- ✅ Use SERVICE KEY (keep secret)
- ✅ Store keys in `.env` (never commit)
- ✅ Use environment variables
- ✅ Restrict Supabase API access by IP (optional)

### Supabase

- ✅ Enable RLS on all tables
- ✅ Create specific policies for read/write
- ✅ Use anon key for frontend, service key for backend
- ✅ Enable 2FA on Supabase account

---

## Maintenance

### Daily
- Check pipeline ran successfully
- Monitor Vercel deployment status
- Review error logs if any

### Weekly
- Check Supabase storage usage
- Review pipeline logs for patterns
- Verify data quality

### Monthly
- Update dependencies
- Review and optimize queries
- Check for security updates
- Backup important data

---

## Support

### Documentation
- **Frontend:** `frontend/README.md`
- **Backend:** `backend/QUICK_START.md`
- **Pipeline:** `backend/DAILY_PIPELINE_GUIDE.md`

### Common Issues
1. **No data:** Run backend pipeline
2. **Build fails:** Check environment variables
3. **Slow loading:** Check Supabase query performance
4. **Pipeline fails:** Check logs and internet connection

### Getting Help
1. Check Vercel deployment logs
2. Check backend pipeline logs
3. Check Supabase dashboard
4. Review documentation

---

## Summary

**Your deployment is:**
- ✅ Frontend on Vercel (globally distributed)
- ✅ Database on Supabase (managed PostgreSQL)
- ✅ Backend on your server (automated daily)
- ✅ Fully automated and production-ready

**Users see:**
- ✅ Fast, responsive frontend
- ✅ Real-time market data
- ✅ Fresh analytics (updated daily)
- ✅ Professional, polished UI

**You manage:**
- ✅ One backend server/machine
- ✅ Automated daily pipeline
- ✅ Simple monitoring via logs

🚀 **Your system is production-ready!**
