import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const TICKERS = [
  { symbol: "^NSEI",     label: "Nifty 50",   dbName: "Nifty"        },
  { symbol: "^BSESN",    label: "Sensex",     dbName: "Sensex"       },
  { symbol: "^NSEBANK",  label: "Bank Nifty", dbName: "Bank Nifty"   },
  { symbol: "^CNXIT",    label: "IT Sector",  dbName: "IT Sector"    },
  { symbol: "^CNXAUTO",  label: "Auto Sector",dbName: "Auto Sector"  },
  { symbol: "^CNXFMCG",  label: "FMCG",       dbName: "FMCG Sector"  },
  { symbol: "^CNXPHARMA",label: "Pharma",     dbName: "Pharma Sector"},
  { symbol: "^INDIAVIX", label: "India VIX",  dbName: "India VIX"    },
];

// Fetch from Supabase sector_health — no close column, use health_score + daily_return
async function fetchFromDB() {
  try {
    const { data } = await supabase
      .from("sector_health")
      .select("health_score, daily_return, date, sectors!inner(name)")
      .order("date", { ascending: false })
      .limit(200);

    if (!data?.length) return null;

    // Get latest row per sector
    const latest = {};
    data.forEach(r => {
      const name = r.sectors?.name;
      if (name && !latest[name]) latest[name] = r;
    });

    return TICKERS.map(t => {
      const row = latest[t.dbName];
      return {
        ...t,
        // No close price in sector_health — show health score as proxy
        price:  row?.health_score != null ? parseFloat(row.health_score.toFixed(1)) : null,
        change: row?.daily_return != null ? parseFloat((row.daily_return * 100).toFixed(2)) : null,
        source: "db",
      };
    });
  } catch {
    return null;
  }
}

// Live Yahoo Finance fetch disabled — corsproxy.io returns 403
// DB data is sufficient for the live bar
async function fetchLive(_symbol) {
  return null;
}

export function useLiveMarket() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const dbData = await fetchFromDB();
    setData(dbData || TICKERS.map(t => ({ ...t, price: null, change: null, source: "db" })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, refresh: load };
}
