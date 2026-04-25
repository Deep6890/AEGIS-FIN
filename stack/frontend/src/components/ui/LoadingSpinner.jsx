import React from "react";

export default function LoadingSpinner({ text = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF4D00] animate-spin" />
      </div>
      <p className="text-xs text-neutral-400 font-medium">{text}</p>
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
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
