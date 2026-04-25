import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

KEY = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_KEY')
sb = create_client(os.environ['SUPABASE_URL'], KEY)

NAMES = {
    'TCS.NS':       'Tata Consultancy Services',
    'INFY.NS':      'Infosys',
    'HDFCBANK.NS':  'HDFC Bank',
    'RELIANCE.NS':  'Reliance Industries',
    'ICICIBANK.NS': 'ICICI Bank',
}

r = sb.table('companies').select('id,ticker').execute()
for c in r.data:
    name = NAMES.get(c['ticker'])
    if name:
        sb.table('companies').update({'name': name}).eq('id', c['id']).execute()
        print(f"Fixed: {c['ticker']} -> {name}")

print('Done!')
