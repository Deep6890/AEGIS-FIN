import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLiveMarket } from "../../hooks/useLiveMarket";

export default function LiveMarketBar() {
  const { data, loading, refresh } = useLiveMarket();

  return (
    <div className="card px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      {/* Live indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--orange)] opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--orange)]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] hidden sm:block">Live</span>
        <button onClick={refresh} className="text-[var(--text-3)] hover:text-[var(--orange)] transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="w-px h-4 bg-[var(--border)] shrink-0" />

      {/* Tickers — horizontal scroll */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
        {data.map(({ symbol, label, price, change }) => (
          <div key={symbol}
            className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl border border-[var(--border)]"
            style={{ background: "var(--surface)" }}>
            <span className="text-[11px] font-semibold text-[var(--text-2)] whitespace-nowrap">{label}</span>
            {price != null ? (
              <>
                <span className="text-[11px] font-bold text-[var(--text)] font-mono tabular-nums">
                  {price >= 1000
                    ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                    : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${
                  change >= 0 ? "text-[var(--orange)]" : "text-[var(--text-3)]"
                }`}>
                  {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-[11px] text-[var(--text-3)] font-mono">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
