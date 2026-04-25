import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

function PickRow({ rank, name, ticker, score, companyId }) {
  const color = score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500";
  const bar = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-red-500";
  const barBg = score >= 70 ? "bg-emerald-500/10" : score >= 40 ? "bg-amber-400/10" : "bg-red-500/10";

  return (
    <Link
      to={`/companies/${companyId}`}
      className="flex items-center gap-4 py-3.5 px-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all duration-200 group border-b border-neutral-100/80 dark:border-neutral-800/40 last:border-0"
    >
      <span className="text-[10px] font-mono text-neutral-300 dark:text-neutral-600 w-5 shrink-0 tabular-nums">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate tracking-tight group-hover:text-brand-orange transition-colors">
          {name}
        </p>
        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{ticker}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className={`w-20 h-1.5 ${barBg} rounded-full overflow-hidden`}>
          <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${Math.min(100, score)}%` }} />
        </div>
        <span className={`text-sm font-bold tabular-nums w-8 text-right ${color}`}>{score?.toFixed(0)}</span>
      </div>
      <ArrowUpRight size={13} className="text-neutral-200 dark:text-neutral-700 group-hover:text-brand-orange transition-colors shrink-0" />
    </Link>
  );
}

export default function PicksPanel({ title, subtitle, picks, compMap, linkTo, linkColor = "text-brand-orange", isRisk = false }) {
  return (
    <div className={`card-feature overflow-hidden ${isRisk ? "border-red-200/30 dark:border-red-900/20" : ""}`}>
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
        <div>
          <p className="title-md flex items-center gap-2">
            {title}
            {isRisk && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />}
          </p>
          <p className="muted mt-0.5">{subtitle}</p>
        </div>
        <Link to={linkTo} className={`text-xs font-semibold ${linkColor} hover:underline flex items-center gap-1`}>
          View all <ArrowUpRight size={11} />
        </Link>
      </div>
      {picks.length ? (
        <div>
          {picks.map((r, i) => {
            const c = compMap[r.company_id];
            return (
              <PickRow
                key={r.id || r.company_id}
                rank={i + 1}
                name={c?.name || "—"}
                ticker={c?.ticker || "—"}
                score={r.survival_score}
                companyId={r.company_id}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-neutral-400">No ML predictions available</p>
        </div>
      )}
    </div>
  );
}
