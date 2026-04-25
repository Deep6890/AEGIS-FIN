import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 overflow-hidden col-span-12">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="label-caps text-green-600 dark:text-green-400 hidden sm:block">Live</span>
        <button onClick={refresh} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto flex-1 scrollbar-none">
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {price >= 1000 ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium tabular-nums ${change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-xs text-neutral-400">—</span>
            )}
            <span className="text-neutral-200 dark:text-neutral-700">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
