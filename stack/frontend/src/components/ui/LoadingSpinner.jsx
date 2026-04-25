import React from "react";

export default function LoadingSpinner({ text = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--orange)] animate-spin" />
      </div>
      <p className="text-xs text-[var(--text-3)] font-medium">{text}</p>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5"><Skeleton className="h-52 rounded-2xl" /></div>
        <div className="col-span-7 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7"><Skeleton className="h-72 rounded-2xl" /></div>
        <div className="col-span-5"><Skeleton className="h-72 rounded-2xl" /></div>
      </div>
    </div>
  );
}
