import React from "react";
import { TrendingUp, TrendingDown, RefreshCw, Wifi } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-3 sm:px-4 py-3 flex items-center gap-2 overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Live</span>
        <button onClick={refresh} className="text-gray-400 hover:text-orange-500 transition-colors ml-0.5">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Scrollable ticker */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol} className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a]">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                  {price >= 1000
                    ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                    : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[11px] font-bold ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-[11px] text-gray-400">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
