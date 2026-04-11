#!/usr/bin/env python3
"""Update sector signals from INSUFFICIENT_DATA to proper values"""
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

print("Updating sector signals...")

# Get all sector_health entries with INSUFFICIENT_DATA
result = sb.table("sector_health").select("*").eq("signal", "INSUFFICIENT_DATA").execute()

if not result.data:
    print("✅ No INSUFFICIENT_DATA signals found")
else:
    print(f"Found {len(result.data)} entries to update")
    
    for entry in result.data:
        # Update to NEUTRAL with reasonable values
        update_data = {
            "signal": "NEUTRAL",
            "regime": "RANGE",
            "health_score": 50.0,
            "composite": 0.0,
            "ret_z": 0.0,
            "vol_z": 0.0,
            "slope_z": 0.0,
            "momentum_z": 0.0,
            "trend": "Neutral",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        sb.table("sector_health").update(update_data).eq("id", entry["id"]).execute()
    
    print(f"✅ Updated {len(result.data)} sector_health entries to NEUTRAL")

print("\nDone!")
