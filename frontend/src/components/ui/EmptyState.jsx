import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view.", icon: Icon = Database }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center animate-float">
        <Icon size={22} className="text-[var(--text-3)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-2)]">{title}</p>
        <p className="text-xs text-[var(--text-3)] mt-1 max-w-xs leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}
