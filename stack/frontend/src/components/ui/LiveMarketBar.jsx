import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse" />
        <span className="label hidden sm:block">Live</span>
        <button onClick={refresh} className="text-[#6B7280] hover:text-[#E8C547] transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div
            key={symbol}
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-xl bg-[#F5F2EC] dark:bg-[#111318] border border-[#E5E1D8] dark:border-[#1F2128]"
          >
            <span className="text-[11px] font-semibold text-[#0D0D0D] dark:text-[#E8E6E0] whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">
                  {price >= 1000 ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[11px] font-bold ${change >= 0 ? "text-[#52B788]" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-[11px] text-[#6B7280]">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
