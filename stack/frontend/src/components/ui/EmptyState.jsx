import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ title = "No data yet", sub = "Run the pipeline to populate this view.", icon: Icon = Database }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
        <Icon size={22} className="text-neutral-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs">{sub}</p>
      </div>
    </div>
  );
}
