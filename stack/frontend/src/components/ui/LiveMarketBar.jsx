import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      {/* Live dot */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hidden sm:block">Live</span>
        <button onClick={refresh} className="text-neutral-400 hover:text-[#FF4D00] transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 shrink-0" />

      {/* Tickers */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol} className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/60">
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
                  {price >= 1000 ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-[11px] text-neutral-400 font-mono">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
