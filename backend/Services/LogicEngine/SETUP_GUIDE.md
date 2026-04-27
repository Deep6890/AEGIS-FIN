# AEGIS-FIN Enhanced Analytics — Setup & Pipeline Guide

## Overview

This guide explains how to set up the AEGIS-FIN database with fresh historical data and run the enhanced analytics pipeline.

## Prerequisites

1. **Python 3.8+** installed
2. **Supabase account** with database configured
3. **Environment variables** set up in `.env` file
4. **Dependencies installed**: `pip install -r requirements.txt`

## Quick Start

### Option 1: Complete Setup (Recommended)

Run the complete setup script which will:
1. Truncate all existing data
2. Update the database schema
3. Run the enhanced analytics pipeline

```bash
cd backend/Services/LogicEngine
python setup_and_run_pipeline.py
```

### Option 2: Setup with Specific Companies

```bash
python setup_and_run_pipeline.py --companies TCS.NS,INFY.NS,HDFCBANK.NS,RELIANCE.NS
```

### Option 3: Force Refresh Without Truncating

```bash
python setup_and_run_pipeline.py --force --skip-truncate
```

### Option 4: Truncate Only

```bash
python setup_and_run_pipeline.py --truncate-only
```

## Detailed Steps

### Step 1: Truncate Existing Data

If you want to start fresh, truncate all data:

```bash
python truncate_and_update.py
```

This will:
- Remove all data from all tables
- Keep the schema intact
- Prepare for fresh data ingestion

### Step 2: Update Database Schema

Ensure the schema is up to date with all new tables and columns:

```bash
python run_enhanced_pipeline.py --help
```

The schema includes:
- `balance_sheet_insights` - Comprehensive balance sheet analysis
- `stock_holding_insights` - Enhanced shareholding analysis
- 20 financial ratios
- 14 shareholding metrics
- Correlation and classifier data

### Step 3: Run Enhanced Pipeline

Run the pipeline to populate fresh data:

```bash
python run_enhanced_pipeline.py
```

Or with specific companies:

```bash
python run_enhanced_pipeline.py --companies TCS.NS,INFY.NS,HDFCBANK.NS
```

## Default Companies

The pipeline includes these companies by default:

1. **TCS.NS** - Tata Consultancy Services (IT)
2. **INFY.NS** - Infosys Limited (IT)
3. **HDFCBANK.NS** - HDFC Bank Limited (Banking)
4. **RELIANCE.NS** - Reliance Industries (Energy)
5. **WIPRO.NS** - Wipro Limited (IT)
6. **TECHM.NS** - Tech Mahindra (IT)
7. **ICICIBANK.NS** - ICICI Bank Limited (Banking)
8. **SBIN.NS** - State Bank of India (Banking)
9. **ITC.NS** - ITC Limited (FMCG)
10. **HINDUNILVR.NS** - Hindustan Unilever (FMCG)

## Database Schema

### Key Tables

#### balance_sheet_insights
- Quarterly balance sheet analysis
- Category scores: Profitability, Liquidity, Leverage, Efficiency, Growth
- Key strengths and concerns
- Sector comparison
- Trend analysis
- Recommendations

#### stock_holding_insights
- Quarterly shareholding analysis
- Ownership breakdown (pie chart data)
- Top holders breakdown
- Key insights and risk factors
- IT sector correlation
- Concentration and activity scores

#### balance_sheet_ratios
- 20 financial ratios
- Quarterly data
- YoY percentage change
- Historical percentile rank
- Sector comparison

#### stock_holding
- 14 shareholding metrics
- Quarterly data
- Promoter, FII, DII holdings
- Public float percentage
- Holder concentration
- Insider activity

## Data Validation

The pipeline includes comprehensive data validation:

✓ No null values in critical fields
✓ All insights properly generated
✓ Pie chart data complete
✓ IT sector correlation included
✓ Category scores calculated
✓ Trend analysis performed

## Enhanced Analytics Features

### Balance Sheet Analysis
- 5 category scores (Profitability, Liquidity, Leverage, Efficiency, Growth)
- Overall health score
- Key strengths and concerns
- Sector comparison
- Trend analysis
- Actionable recommendations

### Stock Holding Analysis
- Ownership breakdown with pie charts
- Top holders breakdown
- Concentration metrics
- Activity indicators
- Risk assessment
- IT sector correlation

### Correlation Analysis
- Company vs sector correlations
- Top sector movements
- Relative growth analysis
- Spike detection
- Insights and patterns

## Monitoring Pipeline Progress

The pipeline provides real-time feedback:

```
🚀 Starting Enhanced Analytics Pipeline
📊 Processing 10 companies
🔄 Force refresh: No

📈 Step 1: Processing sectors and macro data...
✅ Processed 8 sectors successfully
💻 IT Sector health score: 65.3

🏢 Step 2: Processing 10 companies with enhanced analytics...

[1/10] Processing Tata Consultancy Services (TCS.NS)...
✅ TCS: Enhanced analytics completed successfully
    📊 Balance Sheet: 3 strengths, 1 concern
    👥 Stock Holding: 5 insights, 2 risk factors

[2/10] Processing Infosys Limited (INFY.NS)...
✅ INFY: Enhanced analytics completed successfully
    📊 Balance Sheet: 4 strengths, 0 concerns
    👥 Stock Holding: 6 insights, 1 risk factor

...

📋 Pipeline Summary:
✅ Successful: 10/10 companies
❌ Failed: 0/10 companies

🎉 Pipeline completed successfully! (100.0% success rate)
```

## Troubleshooting

### Issue: "Connection refused" error

**Solution**: Check your Supabase connection:
1. Verify `.env` file has correct credentials
2. Check Supabase project is active
3. Verify network connectivity

### Issue: "Table does not exist" error

**Solution**: Update the schema:
```bash
python truncate_and_update.py
```

### Issue: "No data returned" error

**Solution**: Ensure companies exist in database:
```bash
python -c "from store.data_store import *; configure_store(); print(get_store().fetch_companies())"
```

### Issue: Pipeline runs slowly

**Solution**: 
1. Use fewer companies: `--companies TCS.NS,INFY.NS`
2. Check network speed
3. Check Supabase performance

## Performance Metrics

Typical pipeline execution times:

- **Sector processing**: 30-60 seconds
- **Per company**: 20-40 seconds
- **10 companies**: 3-7 minutes
- **Full pipeline**: 5-10 minutes

## Next Steps

After running the pipeline:

1. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Access enhanced analytics**:
   - Enhanced Balance Sheet: http://localhost:5173/enhanced-balance
   - Enhanced Stock Holdings: http://localhost:5173/enhanced-holdings
   - Filtering & Classification: http://localhost:5173/filtering
   - Market Intelligence: http://localhost:5173/market-intelligence
   - Sector Intelligence: http://localhost:5173/sector-intelligence
   - Correlation Explorer: http://localhost:5173/correlation-explorer

3. **Explore the data**:
   - View balance sheet insights
   - Analyze shareholding patterns
   - Compare with IT sector
   - Explore correlations

## Advanced Options

### Custom Company List

Create a file `companies.txt`:
```
TCS.NS
INFY.NS
HDFCBANK.NS
RELIANCE.NS
```

Then run:
```bash
python run_enhanced_pipeline.py --companies $(cat companies.txt | tr '\n' ',')
```

### Scheduled Runs

Set up a cron job for daily updates:

```bash
# Daily at 6 AM
0 6 * * * cd /path/to/LogicEngine && python run_enhanced_pipeline.py --force --skip-truncate
```

### Logging

Check logs in `logs/` directory:

```bash
tail -f logs/pipeline.log
```

## Support

For issues or questions:

1. Check the logs: `logs/pipeline.log`
2. Review this guide
3. Check Supabase dashboard for data
4. Verify environment variables

## Schema Reference

### balance_sheet_insights Columns

| Column | Type | Description |
|--------|------|-------------|
| company_id | UUID | Company reference |
| period | TEXT | Quarter (e.g., "Q1 2024") |
| profitability_score | NUMERIC | 0-100 score |
| liquidity_score | NUMERIC | 0-100 score |
| leverage_score | NUMERIC | 0-100 score |
| efficiency_score | NUMERIC | 0-100 score |
| growth_score | NUMERIC | 0-100 score |
| overall_score | NUMERIC | 0-100 score |
| key_strengths | JSONB | Array of strength strings |
| key_concerns | JSONB | Array of concern strings |
| sector_comparison | JSONB | Comparison metrics |
| trend_analysis | JSONB | Trend data |
| recommendations | JSONB | Array of recommendations |

### stock_holding_insights Columns

| Column | Type | Description |
|--------|------|-------------|
| company_id | UUID | Company reference |
| period | TEXT | Quarter (e.g., "Q1 2024") |
| ownership_score | NUMERIC | 0-100 score |
| concentration_score | NUMERIC | 0-100 score |
| activity_score | NUMERIC | 0-100 score |
| risk_score | NUMERIC | 0-100 score |
| overall_score | NUMERIC | 0-100 score |
| ownership_breakdown | JSONB | Pie chart data |
| top_holders_breakdown | JSONB | Top holders pie chart |
| key_insights | JSONB | Array of insights |
| risk_factors | JSONB | Array of risk factors |
| sector_comparison | JSONB | Comparison metrics |
| it_sector_correlation | JSONB | IT sector correlation data |

## Version History

### v1.0.0 (Current)
- Complete setup and pipeline execution
- Enhanced analytics with insights
- Data validation and quality checks
- Comprehensive logging
- Support for custom company lists
