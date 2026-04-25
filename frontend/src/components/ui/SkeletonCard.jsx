import React from 'react';

export default function SkeletonCard({ className = "" }) {
  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        <div className="w-8 h-4 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>
      <div className="w-24 h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mt-6" />
      <div className="w-16 h-8 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mt-2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-4 px-4 border-b border-neutral-100 dark:border-neutral-800">
      <div className="w-1/4 h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      <div className="w-1/6 h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      <div className="w-1/6 h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      <div className="w-8 h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
    </div>
  );
}
