import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="label-caps hidden sm:block">Live</span>
        <button onClick={refresh} className="text-neutral-400 hover:text-brand-orange transition-colors ml-0.5">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div
            key={symbol}
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
          >
            <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {price >= 1000 ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-[11px] text-neutral-400">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
