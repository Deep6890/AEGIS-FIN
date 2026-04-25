import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import SignalBadge from "../ui/SignalBadge";

function SectorRow({ row, index }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, row.health_score || 0);
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";
  const scoreColor = pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500";

  return (
    <>
      <tr
        className="border-b border-neutral-100/80 dark:border-neutral-800/40 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/20 transition-all duration-200 cursor-pointer group"
        onClick={() => setOpen(v => !v)}
      >
        <td className="py-4 px-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-300 dark:text-neutral-600 w-5 shrink-0 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight group-hover:text-brand-orange transition-colors">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open
              ? <ChevronUp size={12} className="text-brand-orange shrink-0" />
              : <ChevronDown size={12} className="text-neutral-300 dark:text-neutral-600 shrink-0" />}
          </div>
        </td>
        <td className="py-4 px-5"><SignalBadge value={row.signal} /></td>
        <td className="py-4 px-5"><SignalBadge value={row.regime} /></td>
        <td className="py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-sm font-bold tabular-nums w-8 ${scoreColor}`}>{row.health_score?.toFixed(0) ?? "—"}</span>
          </div>
        </td>
        <td className="py-4 px-5">
          <span className="text-xs font-mono text-neutral-500 tabular-nums">
            {row.composite != null ? (row.composite > 0 ? "+" : "") + row.composite.toFixed(2) : "—"}
          </span>
        </td>
        <td className="py-4 px-5">
          <div className="flex gap-1.5">
            {row.spike_up && <span className="badge-green">↑ Spike</span>}
            {row.spike_down && <span className="badge-red">↓ Spike</span>}
            {!row.spike_up && !row.spike_down && <span className="text-neutral-300 dark:text-neutral-700 text-xs">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-neutral-50/60 dark:bg-neutral-800/10 animate-slide-up">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { k: "Ret Z", v: row.ret_z, pos: (row.ret_z || 0) > 0 },
                { k: "Vol Z", v: row.vol_z, pos: (row.vol_z || 0) > 0 },
                { k: "Mom Z", v: row.momentum_z, pos: (row.momentum_z || 0) > 0 },
                { k: "Slope Z", v: row.slope_z, pos: (row.slope_z || 0) > 0 },
                { k: "EMA Short", v: row.ema_short, pos: null },
                { k: "EMA Long", v: row.ema_long, pos: null },
              ].map(({ k, v, pos }) => (
                <div key={k} className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-200/60 dark:border-neutral-800">
                  <p className="label-caps mb-1.5">{k}</p>
                  <p className={`text-sm font-semibold tabular-nums ${
                    pos === null ? "text-neutral-900 dark:text-neutral-100" :
                    pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`}>
                    {v != null ? (pos !== null && v > 0 ? "+" : "") + v.toFixed(3) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function SectorHealthTable({ latestSectorHealth }) {
  return (
    <div className="card-feature overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
        <div>
          <p className="title-md flex items-center gap-2">
            Sector Health Monitor
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-[10px] text-neutral-400 font-medium">Live</span>
            </span>
          </p>
          <p className="muted mt-1">Daily signals from rolling z-scores · click row to expand</p>
        </div>
        <Link to="/sectors" className="btn-ghost text-xs gap-1">
          Details <ArrowRight size={11} />
        </Link>
      </div>
      {latestSectorHealth.length ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/60 dark:bg-neutral-800/10">
                <th className="text-left py-3.5 px-5 label-caps">Sector</th>
                <th className="text-left py-3.5 px-5 label-caps">Signal</th>
                <th className="text-left py-3.5 px-5 label-caps">Regime</th>
                <th className="text-left py-3.5 px-5 label-caps">Health</th>
                <th className="text-left py-3.5 px-5 label-caps">Composite Z</th>
                <th className="text-left py-3.5 px-5 label-caps">Spikes</th>
              </tr>
            </thead>
            <tbody>
              {latestSectorHealth.map((row, i) => <SectorRow key={row.id} row={row} index={i} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-neutral-400">No sector health data available</p>
          <p className="text-xs text-neutral-500 mt-1">Run the pipeline to populate sector health signals</p>
        </div>
      )}
    </div>
  );
}
