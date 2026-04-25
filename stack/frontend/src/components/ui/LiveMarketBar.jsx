import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="flex items-center gap-6 pb-6 border-b border-neutral-900/[0.05] dark:border-white/[0.05] overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-neutral-900/[0.05] dark:border-white/[0.05]">
        <div className="relative flex items-center justify-center w-2 h-2">
          <span className="absolute w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Live Market</span>
        <button onClick={refresh} className="ml-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex items-center gap-8 shrink-0">
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol} className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">{label}</span>
            {price != null ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {price >= 1000 ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </span>
                <span className={`flex items-center text-[11px] font-bold tabular-nums ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
