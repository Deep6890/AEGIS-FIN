import React from "react";
import SignalBadge from "../ui/SignalBadge";

export default function MacroCard({ macro, macroRegime, macroScore, latestSectorHealth, signalCounts }) {
  return (
    <div className="bg-[#0D0D0D] dark:bg-[#080808] border border-neutral-800/80 rounded-3xl p-7 flex flex-col relative overflow-hidden h-full">
      {/* Glow orbs */}
      <div className="absolute bottom-0 right-0 w-52 h-52 rounded-full bg-brand-orange/10 blur-[80px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[60px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col">
        <p className="label-caps text-neutral-600 mb-6">Macro Environment</p>

        {/* Regime */}
        <div className="mb-6">
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mb-2">Current Regime</p>
          <p className={`text-4xl font-bold tracking-tighter leading-none ${
            macroRegime === "RISK_ON" ? "text-emerald-400" :
            macroRegime === "RISK_OFF" ? "text-red-400" : "text-white"
          }`}>
            {macroRegime?.replace("_", " ") || "—"}
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {[
            { label: "Macro Score", value: macroScore?.toFixed(2) ?? "—" },
            { label: "Sectors", value: latestSectorHealth.length },
            { label: "VIX Z", value: macro?.vix_z?.toFixed(2) ?? "—" },
            { label: "USD-INR Z", value: macro?.usd_z?.toFixed(2) ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5 hover:bg-white/[0.06] transition-colors">
              <p className="text-[9px] text-neutral-600 uppercase tracking-[0.15em] mb-1.5">{label}</p>
              <p className="text-lg font-bold text-white tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Signal pills */}
        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-white/[0.06]">
          {[
            { label: "Strong", count: signalCounts.STRONG, cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
            { label: "Neutral", count: signalCounts.NEUTRAL, cls: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20" },
            { label: "Watch", count: signalCounts.WATCH, cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
            { label: "Weak", count: signalCounts.WEAK, cls: "bg-red-500/15 text-red-400 border-red-500/20" },
          ].map(({ label, count, cls }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${cls}`}>
              <span className="tabular-nums font-bold">{count}</span> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
