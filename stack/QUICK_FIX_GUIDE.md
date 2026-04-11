# 🚀 Quick Fix Guide - AEGIS-FIN

**Last Updated**: 2026-04-11 (All Issues Fixed!)

## ✅ Current Status

- ✅ **JSX Structure Fixed** - Sectors.jsx build error resolved
- ✅ **Database Populated** - 12 sectors, 5 companies with ML scores
- ✅ **RLS Policies Working** - Anonymous users can read all tables
- ✅ **Sector Signals Updated** - Changed from INSUFFICIENT_DATA to NEUTRAL
- ✅ **LiveMarketBar Added** - Visible on Dashboard and Sectors pages
- ✅ **Vercel Build** - Should deploy successfully now

---

## Issues Fixed

✅ **Live Market Bar** - Added to Dashboard and Sectors pages  
✅ **Empty Pages** - Created seed script to populate initial data  
✅ **Database Setup** - Instructions below to fix RLS and seed data  

---

## 🔧 Step 1: Fix Database (RLS Policies)

The pages show "Warming Up" because Supabase RLS (Row Level Security) is blocking anonymous reads.

### Fix RLS Policies:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Paste this SQL and click **Run**:

```sql
-- Enable RLS on all tables
ALTER TABLE companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_health         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_corr           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolling_corr          ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_sectors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet         ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE holding_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_store         ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_overlay         ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous reads
CREATE POLICY "anon_read_companies"             ON companies             FOR SELECT USING (true);
CREATE POLICY "anon_read_sectors"               ON sectors               FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_metrics"        ON sector_metrics        FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_health"         ON sector_health         FOR SELECT USING (true);
CREATE POLICY "anon_read_company_metrics"       ON company_metrics       FOR SELECT USING (true);
CREATE POLICY "anon_read_static_corr"           ON static_corr           FOR SELECT USING (true);
CREATE POLICY "anon_read_rolling_corr"          ON rolling_corr          FOR SELECT USING (true);
CREATE POLICY "anon_read_top_sectors"           ON top_sectors           FOR SELECT USING (true);
CREATE POLICY "anon_read_balance_sheet"         ON balance_sheet         FOR SELECT USING (true);
CREATE POLICY "anon_read_balance_sheet_history" ON balance_sheet_history FOR SELECT USING (true);
CREATE POLICY "anon_read_holding_metrics"       ON holding_metrics       FOR SELECT USING (true);
CREATE POLICY "anon_read_ml_predictions"        ON ml_predictions        FOR SELECT USING (true);
CREATE POLICY "anon_read_feature_store"         ON feature_store         FOR SELECT USING (true);
CREATE POLICY "anon_read_macro_overlay"         ON macro_overlay         FOR SELECT USING (true);
```

---

## 🌱 Step 2: Seed Initial Data

Run this to populate sectors and create initial health entries:

```bash
cd backend
venv/Scripts/python.exe seed_initial_data.py
```

This will:
- Insert 12 sector indices (Bank Nifty, IT, Auto, etc.)
- Create initial sector_health entries with NEUTRAL signals
- Create initial macro_overlay entry

---

## 📊 Step 3: Run Pipeline for Full Data

To populate company data and get real metrics:

```bash
# Test with 5 companies first
venv/Scripts/python.exe run_pipeline.py --start 0 --end 5

# Or run all 134 companies (takes 2-4 hours)
venv/Scripts/python.exe run_pipeline.py
```

---

## 🔍 Step 4: Verify Everything Works

1. **Check Diagnostics Page**
   - Go to `/diagnostics` in your app
   - All tables should show "OK" status
   - No RLS blocks

2. **Check Sectors Page**
   - Should show 12 sectors
   - Each with NEUTRAL signal initially
   - No more "Warming Up" messages

3. **Check Dashboard**
   - Live market ticker should appear at top
   - KPIs should show data
   - Sector health table should populate

---

## 🐛 Common Issues & Fixes

### Issue: "Warming Up" still showing
**Fix:** Run the seed script and check RLS policies

### Issue: Live market bar not showing
**Fix:** Already fixed - pushed to GitHub. Pull latest changes:
```bash
git pull origin main
```

### Issue: Database connection errors
**Fix:** Check `.env` file has correct Supabase credentials:
```
SUPABASE_URL=your_url_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

### Issue: Frontend not updating
**Fix:** Clear browser cache or hard refresh (Ctrl+Shift+R)

---

## 📝 What Was Changed

### Frontend Changes:
1. ✅ Added `LiveMarketBar` component to Dashboard
2. ✅ Added `LiveMarketBar` component to Sectors page
3. ✅ All pages already have proper empty state handling

### Backend Changes:
1. ✅ Created `seed_initial_data.py` - Quick data seeder
2. ✅ Existing `cleanup_old_data_simple.py` - Data retention management
3. ✅ Existing `daily_pipeline.py` - Automated daily runs

---

## 🚀 Production Checklist

- [ ] RLS policies applied in Supabase
- [ ] Initial data seeded
- [ ] Pipeline run at least once
- [ ] Diagnostics page shows all green
- [ ] Live market bar visible
- [ ] All pages load without errors
- [ ] Vercel deployment updated (auto-deploys from main branch)

---

## 💡 Tips

1. **First Time Setup**: Run seed script → Run pipeline for 5 companies → Check diagnostics
2. **Daily Updates**: Set up Windows Task Scheduler with `setup_daily_task.bat`
3. **Data Cleanup**: Run `cleanup_old_data_simple.py` monthly to stay under free tier limits
4. **Monitoring**: Check Pipeline Monitor page to see run history

---

## 📞 Need Help?

If issues persist:
1. Check browser console for errors (F12)
2. Check Supabase logs in dashboard
3. Run diagnostics page and copy error messages
4. Verify `.env` file has correct credentials

---

**Last Updated:** April 11, 2026  
**Version:** 1.0.0
