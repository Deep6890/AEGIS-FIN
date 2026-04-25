import React from 'react';
import { SkeletonRow } from './SkeletonCard';

export default function DataTable({ columns, rows, loading, emptyState }) {
  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return emptyState || null;
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors duration-150"
              >
                {columns.map((col, j) => (
                  <td key={j} className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
