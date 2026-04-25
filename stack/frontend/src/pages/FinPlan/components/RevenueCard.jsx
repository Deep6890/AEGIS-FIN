/**
 * RevenueCard — bottom-right bento card with Actual vs Budget mini bars.
 */
import React from "react";

const BARS = [
  { h: 60 }, { h: 80 }, { h: 50 }, { h: 90 }, { h: 70 },
  { h: 85 }, { h: 55 }, { h: 75 }, { h: 65 }, { h: 95 },
  { h: 45 }, { h: 80 }, { h: 60 }, { h: 70 }, { h: 85 },
];

export default function RevenueCard() {
  return (
    <div className="h-full flex flex-col justify-between">
      <p className="text-sm font-black text-black">Revenue</p>

      {/* Mini bar chart */}
      <div className="flex items-end gap-0.5 h-14 my-3">
        {BARS.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${b.h}%`,
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-black rounded-full" style={{ width: "68%" }} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white border-2 border-black" />
          <span className="text-[10px] font-semibold text-black/70">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12">
            {[0, 3, 6, 9].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2="12" stroke="black" strokeWidth="1.5" opacity="0.4" />
            ))}
          </svg>
          <span className="text-[10px] font-semibold text-black/70">Budget</span>
        </div>
      </div>
    </div>
  );
}
