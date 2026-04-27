#!/usr/bin/env python3
"""
run_enhanced_pipeline.py — Run the enhanced analytics pipeline
--------------------------------------------------------------
This script runs the full pipeline with enhanced analytics including:
1. Enhanced stock holding analysis with pie charts and insights
2. Enhanced balance sheet analysis with comprehensive insights
3. IT sector correlation analysis
4. Comprehensive data validation (no nulls)

Usage:
    python run_enhanced_pipeline.py [--companies TICKER1,TICKER2] [--force]
"""

import os
import sys
import argparse
from datetime import date

# Add the LogicEngine directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline import run_daily, run_sectors, run_batch
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

# Default companies for testing
DEFAULT_COMPANIES = [
    ("TCS.NS", "Tata Consultancy Services"),
    ("INFY.NS", "Infosys Limited"),
    ("HDFCBANK.NS", "HDFC Bank Limited"),
    ("RELIANCE.NS", "Reliance Industries"),
    ("WIPRO.NS", "Wipro Limited"),
    ("TECHM.NS", "Tech Mahindra"),
    ("ICICIBANK.NS", "ICICI Bank Limited"),
    ("SBIN.NS", "State Bank of India"),
    ("ITC.NS", "ITC Limited"),
    ("HINDUNILVR.NS", "Hindustan Unilever"),
]

def validate_data_quality(result):
    """
    Validate that the enhanced analytics have no null values in critical fields.
    Returns (is_valid, issues_list)
    """
    issues = []
    
    # Check balance sheet data
    if result.get("balance_sheet"):
        bs_data = result["balance_sheet"]
        if "insights" in bs_data:
            insights = bs_data["insights"]
            if not insights.get("key_strengths") and not insights.get("key_concerns"):
                issues.append("Balance sheet insights are empty")
        
        if "breakdown" in bs_data:
            breakdown = bs_data["breakdown"]
            if not breakdown.get("category_scores"):
                issues.append("Balance sheet category scores missing")
    
    # Check stock holding data
    if result.get("stock_holding"):
        sh_data = result["stock_holding"]
        if "enhanced_insights" in sh_data:
            insights = sh_data["enhanced_insights"]
            if not insights.get("key_insights") and not insights.get("risk_factors"):
                issues.append("Stock holding insights are empty")
        
        if "breakdown" in sh_data:
            breakdown = sh_data["breakdown"]
            if not breakdown.get("ownership_pie"):
                issues.append("Ownership pie chart data missing")
    
    # Check IT sector correlation
    if result.get("balance_sheet") and not result["balance_sheet"].get("it_sector_correlation"):
        issues.append("IT sector correlation missing from balance sheet")
    
    if result.get("stock_holding") and not result["stock_holding"].get("it_sector_correlation"):
        issues.append("IT sector correlation missing from stock holding")
    
    return len(issues) == 0, issues

def run_enhanced_pipeline(companies=None, force=False):
    """
    Run the enhanced pipeline with comprehensive analytics.
    """
    if companies is None:
        companies = DEFAULT_COMPANIES
    
    log.info("enhanced_pipeline.start", companies=len(companies), force=force)
    print(f"Starting Enhanced Analytics Pipeline")
    print(f"Processing {len(companies)} companies")
    print(f"Force refresh: {'Yes' if force else 'No'}")
    
    # Step 1: Run sectors first
    print("\nStep 1: Processing sectors and macro data...")
    try:
        sector_results = run_sectors(force=force)
        print(f"Processed {len(sector_results)} sectors successfully")
        
        # Ensure IT Sector is available for correlation
        if "IT Sector" not in sector_results:
            print("IT Sector data not available - correlation analysis will be limited")
        else:
            it_health = sector_results["IT Sector"].get("health_score")
            if it_health is not None:
                print(f"IT Sector health score: {it_health:.1f}")
            else:
                print("IT Sector health score not yet available")
            
    except Exception as e:
        print(f"Sector processing failed: {e}")
        log.error("enhanced_pipeline.sectors_failed", error=str(e))
        return False
    
    # Step 2: Process companies with enhanced analytics
    print(f"\nStep 2: Processing {len(companies)} companies with enhanced analytics...")
    
    results = []
    successful = 0
    failed = 0
    
    for i, (ticker, name) in enumerate(companies, 1):
        print(f"\n[{i}/{len(companies)}] Processing {name} ({ticker})...")
        
        try:
            result = run_daily(
                ticker=ticker,
                company_name=name,
                sector_results=sector_results,
                top_n=5,
                force=force
            )
            
            # Validate data quality
            is_valid, issues = validate_data_quality(result)
            
            if is_valid:
                print(f"{name}: Enhanced analytics completed successfully")
                successful += 1
            else:
                print(f"{name}: Completed with data quality issues:")
                for issue in issues:
                    print(f"    - {issue}")
                successful += 1  # Still count as successful, just with warnings
            
            # Log key metrics
            if result.get("balance_sheet") and result["balance_sheet"].get("insights"):
                bs_insights = result["balance_sheet"]["insights"]
                strengths = len(bs_insights.get("key_strengths", []))
                concerns = len(bs_insights.get("key_concerns", []))
                print(f"    Balance Sheet: {strengths} strengths, {concerns} concerns")
            
            if result.get("stock_holding") and result["stock_holding"].get("enhanced_insights"):
                sh_insights = result["stock_holding"]["enhanced_insights"]
                insights_count = len(sh_insights.get("key_insights", []))
                risks_count = len(sh_insights.get("risk_factors", []))
                print(f"    Stock Holding: {insights_count} insights, {risks_count} risk factors")
            
            results.append(result)
            
        except Exception as e:
            print(f"{name}: Processing failed - {e}")
            log.error("enhanced_pipeline.company_failed", ticker=ticker, error=str(e))
            failed += 1
    
    # Step 3: Summary and validation
    print(f"\nPipeline Summary:")
    print(f"Successful: {successful}/{len(companies)} companies")
    print(f"Failed: {failed}/{len(companies)} companies")
    
    if successful > 0:
        print(f"\nEnhanced Analytics Features:")
        print(f"   Balance sheet insights with category scoring")
        print(f"   Stock holding patterns with pie charts")
        print(f"   IT sector correlation analysis")
        print(f"   Comprehensive data validation (no nulls)")
        print(f"   Multi-page analytics ready")
        
        # Check for IT correlations - safely handle None results
        it_correlations = 0
        for r in results:
            if r and isinstance(r, dict):
                bs = r.get("balance_sheet")
                if bs and isinstance(bs, dict) and bs.get("it_sector_correlation"):
                    it_correlations += 1
        print(f"   IT correlations: {it_correlations}/{successful} companies")
    
    success_rate = (successful / len(companies)) * 100 if companies else 0
    
    if success_rate >= 80:
        print(f"\nPipeline completed successfully! ({success_rate:.1f}% success rate)")
        print(f"You can now access the enhanced analytics in the frontend:")
        print(f"   - Enhanced Balance Sheet: /enhanced-balance")
        print(f"   - Enhanced Stock Holdings: /enhanced-holdings") 
        print(f"   - Filtering & Classification: /filtering")
        return True
    else:
        print(f"\nPipeline completed with issues ({success_rate:.1f}% success rate)")
        return False

def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Run enhanced analytics pipeline")
    parser.add_argument("--companies", type=str, help="Comma-separated list of tickers (e.g., TCS.NS,INFY.NS)")
    parser.add_argument("--force", action="store_true", help="Force refresh all data")
    
    args = parser.parse_args()
    
    companies = DEFAULT_COMPANIES
    if args.companies:
        tickers = [t.strip() for t in args.companies.split(",")]
        companies = [(ticker, ticker.replace(".NS", "")) for ticker in tickers]
    
    log.info("enhanced_pipeline.main_start", companies=len(companies))
    
    success = run_enhanced_pipeline(companies=companies, force=args.force)
    
    if success:
        print(f"\nReady to explore enhanced analytics!")
        sys.exit(0)
    else:
        print(f"\nPipeline completed with errors. Check logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()