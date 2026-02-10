import React from "react";

export default function ChartCard({ header, children }) {
    return (
        <div
            className="
        w-full
        max-w-5xl
        min-h-[220px]
        sm:min-h-[260px]
        md:min-h-[320px]
        bg-[#b1b2b531]
        rounded-3xl
        p-4 sm:p-6
        shadow-md
        flex
        flex-col
        gap-4
      "
        >
            {/* Header */}
            <div className="text-sm sm:text-base font-semibold text-white">
                {header}
            </div>

            {/* Chart area */}
            <div className="flex-1 bg-black/5 rounded-xl flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}
