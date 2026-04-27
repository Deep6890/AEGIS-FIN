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

// Fetch from Supabase sector_health (always available, no CORS issues)
async function fetchFromDB() {
  try {
    const { data } = await supabase
      .from("sector_health")
      .select("close, daily_return, date, sectors!inner(name)")
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
        price:  row?.close ?? null,
        change: row?.daily_return != null ? row.daily_return * 100 : null,
        source: "db",
      };
    });
  } catch {
    return null;
  }
}

// Try live Yahoo Finance via CORS proxy
async function fetchLive(symbol) {
  try {
    const url = `https://corsproxy.io/?${encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
    )}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price  = meta.regularMarketPrice;
    const prev   = meta.chartPreviousClose || meta.previousClose;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, change };
  } catch {
    return null;
  }
}

export function useLiveMarket() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    // First load from DB (fast, always works)
    const dbData = await fetchFromDB();
    if (dbData) {
      setData(dbData);
      setLoading(false);
    }

    // Then try to enrich with live prices in background
    const liveResults = await Promise.allSettled(
      TICKERS.map(t => fetchLive(t.symbol))
    );

    const enriched = TICKERS.map((t, i) => {
      const live = liveResults[i].status === "fulfilled" ? liveResults[i].value : null;
      const db   = dbData?.find(d => d.symbol === t.symbol);
      return {
        ...t,
        price:  live?.price  ?? db?.price  ?? null,
        change: live?.change ?? db?.change ?? null,
        source: live ? "live" : "db",
      };
    });

    setData(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, refresh: load };
}
