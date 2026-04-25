import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function FormulaCard() {
  return (
    <div className="card-feature p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="title-md">Survival Score Formula</p>
          <p className="muted mt-1">CatBoost ML model · 8 input features · 0–100 output</p>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">v2.1</span>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-5">
        {[
          { label: "Price", weight: "25%", desc: "Returns, volatility, ATR", color: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" },
          { label: "Financials", weight: "30%", desc: "20 financial ratios", color: "border-brand-orange/30 bg-brand-orange/5" },
          { label: "Sector", weight: "20%", desc: "Health, regime, corr", color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" },
          { label: "Macro", weight: "15%", desc: "VIX, INR, Gold, Crude", color: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" },
          { label: "Holdings", weight: "10%", desc: "HHI, institutional %", color: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20" },
        ].map(f => (
          <div key={f.label} className={`rounded-xl border p-3 text-center hover:scale-[1.02] transition-transform ${f.color}`}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-neutral-500 mb-1.5">{f.label}</p>
            <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{f.weight}</p>
            <p className="text-[9px] text-neutral-400 mt-1 leading-relaxed hidden sm:block">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <span className="text-sm text-neutral-400">25 + 30 + 20 + 15 + 10 =</span>
        <span className="px-4 py-2 rounded-xl bg-brand-orange text-white text-sm font-bold shadow-glow-orange">
          Survival Score 0–100
        </span>
        <span className="text-xs text-neutral-400 hidden sm:block">100 = strongest · 0 = highest risk</span>
      </div>
    </div>
  );
}

export function PipelineCard() {
  return (
    <div className="bg-[#0D0D0D] dark:bg-[#080808] border border-neutral-800/80 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="label-caps text-neutral-600 mb-1">Intelligence Engine</p>
            <p className="text-base font-semibold tracking-tight text-white">9-Layer Pipeline</p>
          </div>
          <Link to="/pipeline" className="text-[10px] font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-1 rounded-lg hover:bg-brand-orange/20 transition-colors">
            Monitor →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { n: "01", label: "Market Data" },
            { n: "02", label: "Price Metrics" },
            { n: "03", label: "Z-Scores" },
            { n: "04", label: "Balance Sheet" },
            { n: "05", label: "Holdings" },
            { n: "06", label: "Correlation" },
            { n: "07", label: "Sector Health" },
            { n: "08", label: "Macro Overlay" },
            { n: "09", label: "ML Survival" },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-2.5 hover:bg-white/[0.08] transition-colors group">
              <span className="text-[9px] font-mono text-brand-orange shrink-0 group-hover:text-white transition-colors">{n}</span>
              <span className="text-[10px] font-medium text-neutral-400 truncate group-hover:text-neutral-200 transition-colors">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuickNav() {
  const links = [
    { label: "Companies", path: "/companies", desc: "Browse all tracked companies" },
    { label: "Risk Engine", path: "/risk-engine", desc: "ML survival predictions" },
    { label: "Macro Overlay", path: "/macro", desc: "Global macro indicators" },
    { label: "Upload CSV", path: "/upload", desc: "Onboard new companies" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {links.map(({ label, path, desc }) => (
        <Link key={path} to={path} className="card-feature p-4 group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight group-hover:text-brand-orange transition-colors">{label}</p>
            <ArrowRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-brand-orange group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">{desc}</p>
        </Link>
      ))}
    </div>
  );
}
