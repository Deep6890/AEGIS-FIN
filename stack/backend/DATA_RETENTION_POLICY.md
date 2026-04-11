# Data Retention Policy for Supabase Free Tier

## Overview
To stay within Supabase free tier limits (500MB database storage), this project implements a **6-month data retention policy**.

## Changes Made

### 1. Backend Gateway (`backend/db/supabase_gateway.py`)
- **Changed retention from 3 years to 6 months** (180 days)
- All time-series data older than 6 months is automatically deleted during pipeline runs
- Affects tables:
  - `sector_metrics`
  - `sector_health`
  - `macro_overlay`
  - `company_metrics`
  - `rolling_corr`
  - `balance_sheet_history`
  - `feature_store`

### 2. Frontend API Limits (`frontend/src/lib/api.js`)
Reduced query limits to fetch less data:

| Function | Old Limit | New Limit |
|----------|-----------|-----------|
| `fetchLatestSectorMetrics` | 120 | 60 |
| `fetchLatestSectorHealth` | 120 | 60 |
| `fetchSectorMetricsHistory` | 90 | 60 |
| `fetchSectorHealthHistory` | 90 | 60 |
| `fetchLatestCompanyMetrics` | 90 | 60 |
| `fetchBalanceSheet` | 100 | 50 |
| `fetchRollingCorr` | 200 | 100 |
| `fetchAllMlPredictions` | 600 | 300 |
| `fetchPortfolioSummary` | 600 | 300 |
| `fetchPipelineStats` | 500 | 200 |

### 3. Manual Cleanup Script (`backend/cleanup_old_data_simple.py`)
Created a utility script to manually prune old data when needed.

**Usage (from project root):**
```bash
venv/Scripts/python.exe backend/cleanup_old_data_simple.py
```

**Or from backend directory:**
```bash
cd backend
../venv/Scripts/python.exe cleanup_old_data_simple.py
```

This script will:
- Delete all rows older than 6 months from time-series tables
- Show progress and count of deleted rows
- Help recover storage space quickly

**Note:** Some large tables may timeout. These will be cleaned automatically during the next pipeline run.

## Storage Estimation

With 6-month retention and reduced query limits:
- **~10 companies** × 180 days × multiple tables ≈ **50-150MB**
- **~10 sectors** × 180 days × multiple tables ≈ **20-50MB**
- **Total estimated usage: 100-250MB** (well within 500MB limit)

## Initial Cleanup Results

First cleanup run deleted **25,549 old rows**:
- sector_metrics: 7,524 rows
- sector_health: 7,524 rows
- macro_overlay: 660 rows
- balance_sheet_history: 9,841 rows

Tables with timeouts (company_metrics, rolling_corr) will be cleaned during next pipeline run.

## Recommendations

1. **Run cleanup script monthly** to ensure old data is removed
2. **Monitor database size** in Supabase dashboard
3. **Let pipeline auto-cleanup** handle large tables during regular runs
4. **Adjust retention period** if needed:
   - For more data: increase `RETENTION_CUTOFF` days in `supabase_gateway.py` (e.g., 270 for 9 months)
   - For less storage: decrease to 90 or 120 days
5. **Consider archiving** important historical data to CSV/JSON files before deletion

## Future Considerations

If you need longer retention:
- Upgrade to Supabase Pro ($25/month for 8GB)
- Archive old data to external storage (S3, local files)
- Implement data aggregation (keep daily data for 6 months, monthly aggregates for longer)
