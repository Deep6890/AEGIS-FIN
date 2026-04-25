import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, HeartPulse, AlertTriangle, ShieldAlert } from "lucide-react";

function StatCard({ value, label, sub, icon: Icon, color, iconBg, delay = 0 }) {
  return (
    <div
      className="card-feature p-5 group animate-count-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={color} />
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">
          {sub}
        </span>
      </div>
      <p className={`text-4xl font-bold tracking-tighter tabular-nums leading-none ${color}`}>
        {value ?? "—"}
      </p>
      <p className="text-xs font-medium text-neutral-500 mt-2 tracking-tight">{label}</p>
    </div>
  );
}

export default function HeroStats({ portfolioStats }) {
  return (
    <div className="card-hero p-8 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-orange/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-emerald-500/[0.03] blur-[60px] pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="label-caps mb-1.5">Portfolio Intelligence</p>
            <h2 className="title-hero">Full Overview</h2>
          </div>
          <Link
            to="/companies"
            className="btn-ghost text-xs gap-1.5 opacity-80 hover:opacity-100"
          >
            View all companies <ArrowRight size={12} />
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            value={portfolioStats.total}
            label="Total Companies"
            sub="tracked"
            icon={Building2}
            color="text-neutral-900 dark:text-neutral-100"
            iconBg="bg-neutral-100 dark:bg-neutral-800"
            delay={0}
          />
          <StatCard
            value={portfolioStats.healthy}
            label="Healthy"
            sub="score ≥ 70"
            icon={HeartPulse}
            color="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            delay={60}
          />
          <StatCard
            value={portfolioStats.watch}
            label="Watch List"
            sub="score 40–70"
            icon={AlertTriangle}
            color="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            delay={120}
          />
          <StatCard
            value={portfolioStats.distress}
            label="Distress"
            sub="score < 40"
            icon={ShieldAlert}
            color="text-red-500"
            iconBg="bg-red-50 dark:bg-red-950/30"
            delay={180}
          />
        </div>

        {/* Health Distribution Bar */}
        <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl p-5 border border-neutral-200/50 dark:border-neutral-800/50">
          <div className="flex items-center justify-between mb-3">
            <p className="label-caps">Health Distribution</p>
            <p className="text-xs text-neutral-500">
              Avg score{" "}
              <span className="font-bold text-brand-orange">{portfolioStats.avgSurvival}</span>
              <span className="text-neutral-400"> / 100</span>
            </p>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {portfolioStats.total > 0 && (
              <>
                <div
                  className="bg-emerald-500 rounded-l-full transition-all duration-1000"
                  style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }}
                />
                <div
                  className="bg-amber-400 transition-all duration-1000"
                  style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }}
                />
                <div
                  className="bg-red-500 rounded-r-full transition-all duration-1000"
                  style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-6 mt-3">
            {[
              { label: "Healthy", pct: portfolioStats.total ? ((portfolioStats.healthy / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-emerald-500" },
              { label: "Watch", pct: portfolioStats.total ? ((portfolioStats.watch / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-amber-400" },
              { label: "Distress", pct: portfolioStats.total ? ((portfolioStats.distress / portfolioStats.total) * 100).toFixed(0) : 0, color: "bg-red-500" },
            ].map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[11px] text-neutral-500">
                  {label} <span className="font-semibold text-neutral-700 dark:text-neutral-300">{pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
