import React from 'react';

export default function StatusBadge({ status, score }) {
  const styles = {
    healthy:  { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    watch:    { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    distress: { bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-700 dark:text-red-400',   dot: 'bg-red-500 animate-pulse' },
    default:  { bg: 'bg-neutral-50 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', dot: 'bg-neutral-500' },
  };

  const s = styles[status] || styles.default;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {score !== undefined ? `${label} · ${Math.round(score)}` : label}
    </span>
  );
}
