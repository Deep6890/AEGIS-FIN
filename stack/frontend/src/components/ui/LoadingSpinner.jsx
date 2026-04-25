import React from "react";

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E8C547]/20" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#E8C547] animate-spin" />
      </div>
      <p className="label">{text}</p>
    </div>
  );
}

/** Skeleton block for loading states */
export function Skeleton({ className = "" }) {
  return (
    <div className={`bg-[#E5E1D8] dark:bg-[#1F2128] rounded-xl animate-pulse ${className}`} />
  );
}

/** Full page skeleton */
export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
