import React from "react";

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-4 border-[#FFC224]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FFC224] animate-spin" />
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{text}</p>
    </div>
  );
}
