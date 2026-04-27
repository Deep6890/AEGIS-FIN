#!/usr/bin/env python3
"""
truncate_and_update.py — Truncate all data and update schema for enhanced analytics
-----------------------------------------------------------------------------------
This script:
1. Truncates all existing data from the database
2. Updates the schema with new tables and columns
3. Prepares the system for fresh data with enhanced analytics

Usage:
    python truncate_and_update.py
"""

import os
import sys
from datetime import date

# Add the LogicEngine directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from store.data_store import configure_store, get_store
from logger import get_logger

# Load environment variables
_here = os.path.dirname(os.path.abspath(__file__))
_env = os.path.join(_here, ".env")
if os.path.exists(_env):
    with open(_env) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

configure_store()
log = get_logger(__name__)

def truncate_all_data():
    """Truncate all data from all tables."""
    store = get_store()
    
    # List of all tables to truncate
    tables_to_truncate = [
        "ohlcv_raw",
        "ohlcv_health", 
        "sector_ohlcv_raw",
        "sector_health",
        "balance_sheet_ratios",
        "balance_sheet_hist",
        "stock_holding",
        "correlation",
        "classifier",
        "balance_sheet_insights",
        "stock_holding_insights"
    ]
    
    log.info("truncate_update.start", tables=len(tables_to_truncate))
    
    try:
        # Get all companies and sectors for truncation
        if hasattr(store, '_client'):  # Supabase store
            client = store._client
            
            # Get all companies
            companies_resp = client.table("companies").select("id, ticker").execute()
            companies = companies_resp.data or []
            
            # Get all sectors  
            sectors_resp = client.table("sectors").select("id, name").execute()
            sectors = sectors_resp.data or []
            
            log.info("truncate_update.entities_found", 
                    companies=len(companies), sectors=len(sectors))
            
            # Truncate company-keyed tables
            company_tables = [
                "ohlcv_raw", "ohlcv_health", "balance_sheet_ratios", 
                "balance_sheet_hist", "stock_holding", "correlation", 
                "classifier", "balance_sheet_insights", "stock_holding_insights"
            ]
            
            for table in company_tables:
                for company in companies:
                    try:
                        client.table(table).delete().eq("company_id", company["id"]).execute()
                        log.info("truncate_update.company_table_cleared", 
                                table=table, ticker=company["ticker"])
                    except Exception as e:
                        log.warning("truncate_update.company_table_error", 
                                  table=table, ticker=company["ticker"], error=str(e))
            
            # Truncate sector-keyed tables
            sector_tables = ["sector_ohlcv_raw", "sector_health"]
            
            for table in sector_tables:
                for sector in sectors:
                    try:
                        client.table(table).delete().eq("sector_id", sector["id"]).execute()
                        log.info("truncate_update.sector_table_cleared", 
                                table=table, sector=sector["name"])
                    except Exception as e:
                        log.warning("truncate_update.sector_table_error", 
                                  table=table, sector=sector["name"], error=str(e))
            
            log.info("truncate_update.data_truncated_successfully")
            
        else:
            log.error("truncate_update.unsupported_store_type")
            return False
            
    except Exception as e:
        log.error("truncate_update.truncation_failed", error=str(e))
        return False
    
    return True

def update_schema():
    """Update the database schema with new tables and columns."""
    store = get_store()
    
    if not hasattr(store, '_client'):
        log.error("schema_update.unsupported_store_type")
        return False
    
    client = store._client
    
    try:
        # Update holding_metric_definitions with new metrics
        new_metrics = [
            (3, "Promoter Holding %", "Ownership", "% held by promoters"),
            (4, "FII Holding %", "Ownership", "% held by Foreign Institutional Investors"),
            (5, "DII Holding %", "Ownership", "% held by Domestic Institutional Investors"),
            (6, "Public Float %", "Ownership", "% shares available for public trading"),
            (7, "Holder Concentration (HHI)", "Concentration", "HHI of top holders (0=diversified, 1=single)"),
            (8, "Top 10 Holders %", "Concentration", "% held by top 10 institutional holders"),
            (9, "Insider Net Buy %", "Activity", "Net insider buy % over lookback window"),
            (10, "Annualised Volatility %", "Risk", "30-day annualised price volatility"),
            (11, "52W High Distance %", "Price", "% distance from 52-week high"),
            (12, "52W Low Distance %", "Price", "% above 52-week low"),
            (13, "Market Cap (Cr)", "Size", "Market cap INR crores"),
            (14, "Shares Outstanding (Cr)", "Size", "Total shares outstanding in crores"),
        ]
        
        for metric_id, name, category, description in new_metrics:
            try:
                client.table("holding_metric_definitions").upsert({
                    "id": metric_id,
                    "name": name,
                    "category": category,
                    "description": description
                }, on_conflict="id").execute()
                log.info("schema_update.metric_added", name=name)
            except Exception as e:
                log.warning("schema_update.metric_error", name=name, error=str(e))
        
        # Create new insight tables (they should be created by the schema, but ensure they exist)
        insight_tables_sql = [
            """
            CREATE TABLE IF NOT EXISTS balance_sheet_insights (
                id               BIGSERIAL,
                company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                period           TEXT          NOT NULL,
                profitability_score    NUMERIC(6,2),
                liquidity_score        NUMERIC(6,2),
                leverage_score         NUMERIC(6,2),
                efficiency_score       NUMERIC(6,2),
                growth_score           NUMERIC(6,2),
                overall_score          NUMERIC(6,2),
                key_strengths          JSONB,
                key_concerns           JSONB,
                sector_comparison      JSONB,
                trend_analysis         JSONB,
                recommendations        JSONB,
                created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                CONSTRAINT bs_insights_pk PRIMARY KEY (company_id, period)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS stock_holding_insights (
                id               BIGSERIAL,
                company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                period           TEXT          NOT NULL,
                ownership_score        NUMERIC(6,2),
                concentration_score    NUMERIC(6,2),
                activity_score         NUMERIC(6,2),
                risk_score             NUMERIC(6,2),
                overall_score          NUMERIC(6,2),
                ownership_breakdown    JSONB,
                top_holders_breakdown  JSONB,
                key_insights           JSONB,
                risk_factors           JSONB,
                sector_comparison      JSONB,
                it_sector_correlation  JSONB,
                created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                CONSTRAINT sh_insights_pk PRIMARY KEY (company_id, period)
            );
            """
        ]
        
        for sql in insight_tables_sql:
            try:
                client.rpc("exec_sql", {"sql": sql}).execute()
                log.info("schema_update.table_created")
            except Exception as e:
                log.warning("schema_update.table_creation_error", error=str(e))
        
        log.info("schema_update.completed_successfully")
        return True
        
    except Exception as e:
        log.error("schema_update.failed", error=str(e))
        return False

def main():
    """Main execution function."""
    log.info("truncate_update.main_start")
    
    print("🔄 Starting data truncation and schema update...")
    print("⚠️  This will remove ALL existing data from the database!")
    
    # Confirm with user
    confirm = input("Are you sure you want to proceed? (yes/no): ").lower().strip()
    if confirm != 'yes':
        print("❌ Operation cancelled.")
        return
    
    print("\n📊 Step 1: Truncating all existing data...")
    if truncate_all_data():
        print("✅ Data truncation completed successfully")
    else:
        print("❌ Data truncation failed")
        return
    
    print("\n🔧 Step 2: Updating database schema...")
    if update_schema():
        print("✅ Schema update completed successfully")
    else:
        print("❌ Schema update failed")
        return
    
    print("\n🎉 All operations completed successfully!")
    print("💡 You can now run the pipeline to populate fresh data with enhanced analytics.")
    
    log.info("truncate_update.main_completed")

if __name__ == "__main__":
    main()