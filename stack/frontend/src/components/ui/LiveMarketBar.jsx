import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-5 py-3 flex items-center gap-4 overflow-hidden">
      {/* Live indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hidden sm:block">Live</span>
        <button onClick={refresh} className="text-neutral-400 hover:text-brand-orange transition-colors ml-1">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 shrink-0" />

      {/* Tickers */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol} className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-bold text-neutral-900 dark:text-white font-mono">
                  {price >= 1000
                    ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                    : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[11px] font-bold ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
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
