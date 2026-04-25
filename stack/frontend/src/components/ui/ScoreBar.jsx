import React from "react";

export default function ScoreBar({ score, showLabel = true, width = "w-20" }) {
  if (score == null) return <span className="text-xs text-neutral-400">—</span>;
  const pct   = Math.min(100, Math.max(0, score));
  const color = score >= 70 ? "bar-healthy" : score >= 40 ? "bar-watch" : "bar-distress";
  const text  = score >= 70 ? "score-healthy" : score >= 40 ? "score-watch" : "score-distress";
  return (
    <div className="flex items-center gap-2">
      <div className={`${width} h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className={`text-xs font-semibold tabular-nums ${text}`}>{score.toFixed(0)}</span>}
    </div>
  );
}
