#!/usr/bin/env python3
"""
Quick script to seed initial sector data so the frontend doesn't show "Warming Up"
Run this once to populate sectors table and create initial sector_health entries
"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# NSE Sector Indices
SECTORS = [
    {"name": "Bank Nifty", "ticker": "^NSEBANK", "description": "Banking sector index"},
    {"name": "IT Sector", "ticker": "^CNXIT", "description": "Information Technology sector"},
    {"name": "Auto Sector", "ticker": "^CNXAUTO", "description": "Automobile sector"},
    {"name": "Metal Sector", "ticker": "^CNXMETAL", "description": "Metals sector"},
    {"name": "Realty Sector", "ticker": "^CNXREALTY", "description": "Real Estate sector"},
    {"name": "FMCG Sector", "ticker": "^CNXFMCG", "description": "Fast Moving Consumer Goods"},
    {"name": "Pharma Sector", "ticker": "^CNXPHARMA", "description": "Pharmaceutical sector"},
    {"name": "Energy Sector", "ticker": "^CNXENERGY", "description": "Energy sector"},
    {"name": "USD-INR", "ticker": "INR=X", "description": "US Dollar to Indian Rupee"},
    {"name": "India VIX", "ticker": "^INDIAVIX", "description": "India Volatility Index"},
    {"name": "Gold", "ticker": "GC=F", "description": "Gold Futures"},
    {"name": "Crude Oil", "ticker": "CL=F", "description": "Crude Oil Futures"},
]

def seed_sectors():
    """Insert sectors if they don't exist"""
    print("🌱 Seeding sectors...")
    
    # Check existing
    existing = sb.table("sectors").select("ticker").execute()
    existing_tickers = {r["ticker"] for r in existing.data}
    
    to_insert = [s for s in SECTORS if s["ticker"] not in existing_tickers]
    
    if not to_insert:
        print("✅ All sectors already exist")
        return
    
    result = sb.table("sectors").insert(to_insert).execute()
    print(f"✅ Inserted {len(to_insert)} sectors")

def seed_sector_health():
    """Create initial sector_health entries with neutral signals"""
    print("🌱 Seeding sector_health...")
    
    # Get all sectors
    sectors_result = sb.table("sectors").select("id, name").execute()
    sectors = sectors_result.data
    
    if not sectors:
        print("❌ No sectors found. Run seed_sectors first.")
        return
    
    # Check if we already have health data
    existing = sb.table("sector_health").select("sector_id").limit(1).execute()
    if existing.data:
        print("✅ Sector health data already exists")
        return
    
    # Create initial health entries for today
    today = datetime.now().strftime("%Y-%m-%d")
    health_entries = []
    
    for sector in sectors:
        health_entries.append({
            "sector_id": sector["id"],
            "date": today,
            "signal": "NEUTRAL",
            "regime": "RANGE",
            "health_score": 50.0,
            "composite": 0.0,
            "ret_z": 0.0,
            "vol_z": 0.0,
            "slope_z": 0.0,
            "momentum_z": 0.0,
            "spike_up": False,
            "spike_down": False,
            "trend": "Neutral"
        })
    
    result = sb.table("sector_health").insert(health_entries).execute()
    print(f"✅ Inserted {len(health_entries)} sector_health entries")

def seed_macro_overlay():
    """Create initial macro_overlay entry"""
    print("🌱 Seeding macro_overlay...")
    
    # Check if we already have macro data
    existing = sb.table("macro_overlay").select("id").limit(1).execute()
    if existing.data:
        print("✅ Macro overlay data already exists")
        return
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    macro_entry = {
        "date": today,
        "macro_regime": "NEUTRAL",
        "macro_score": 0.0,
        "vix_z": 0.0,
        "usd_z": 0.0,
        "gold_z": 0.0,
        "crude_z": 0.0,
        "macro_narrative": "Initial neutral state. Run the pipeline to populate with live data."
    }
    
    result = sb.table("macro_overlay").insert([macro_entry]).execute()
    print(f"✅ Inserted macro_overlay entry")

def main():
    print("=" * 60)
    print("AEGIS-FIN Initial Data Seeder")
    print("=" * 60)
    
    try:
        seed_sectors()
        seed_sector_health()
        seed_macro_overlay()
        
        print("\n" + "=" * 60)
        print("✅ Initial data seeded successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Check the Diagnostics page - tables should now show data")
        print("2. Run the full pipeline to populate company data:")
        print("   python run_pipeline.py --start 0 --end 5")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
