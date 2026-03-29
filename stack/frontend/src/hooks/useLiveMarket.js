import { useState, useEffect } from "react";

// Uses Yahoo Finance v8 via allorigins CORS proxy
const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const TICKERS = [
  { symbol: "^NSEI",    label: "Nifty 50"    },
  { symbol: "^BSESN",   label: "Sensex"      },
  { symbol: "^NSEBANK", label: "Bank Nifty"  },
  { symbol: "^CNXIT",   label: "IT Sector"   },
  { symbol: "^CNXAUTO", label: "Auto Sector" },
  { symbol: "^CNXFMCG", label: "FMCG"        },
  { symbol: "^CNXPHARMA",label:"Pharma"      },
  { symbol: "^INDIAVIX", label: "India VIX"  },
];

async function fetchQuote(symbol) {
  const url = `https://corsproxy.io/?${encodeURIComponent(
    `${YF_BASE}/${symbol}?interval=1d&range=2d`
  )}`;
  const res  = await fetch(url);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price  = meta.regularMarketPrice;
  const prev   = meta.chartPreviousClose || meta.previousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  return { symbol, price, change, prev };
}

export function useLiveMarket() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled(TICKERS.map(t => fetchQuote(t.symbol)));
    const out = results.map((r, i) => ({
      ...TICKERS[i],
      price:  r.status === "fulfilled" ? r.value?.price  : null,
      change: r.status === "fulfilled" ? r.value?.change : null,
    }));
    setData(out);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  return { data, loading, refresh: load };
}
