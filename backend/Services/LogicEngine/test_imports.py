#!/usr/bin/env python3
"""Quick test to verify all imports work"""

import sys
import os

print("Testing imports...")

try:
    print("1. Testing pandas...")
    import pandas as pd
    print("   OK - pandas imported")
except Exception as e:
    print(f"   FAILED - {e}")
    sys.exit(1)

try:
    print("2. Testing numpy...")
    import numpy as np
    print("   OK - numpy imported")
except Exception as e:
    print(f"   FAILED - {e}")
    sys.exit(1)

try:
    print("3. Testing yfinance...")
    import yfinance as yf
    print("   OK - yfinance imported")
except Exception as e:
    print(f"   FAILED - {e}")
    sys.exit(1)

try:
    print("4. Testing supabase...")
    from supabase import create_client
    print("   OK - supabase imported")
except Exception as e:
    print(f"   FAILED - {e}")
    sys.exit(1)

try:
    print("5. Testing LogicEngine modules...")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from logger import get_logger
    from store.data_store import configure_store
    print("   OK - LogicEngine modules imported")
except Exception as e:
    print(f"   FAILED - {e}")
    sys.exit(1)

print("\nAll imports successful!")
print("Environment is ready for pipeline execution.")
