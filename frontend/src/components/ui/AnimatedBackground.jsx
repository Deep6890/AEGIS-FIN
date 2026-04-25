import React from "react";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating orbs */}
      <div className="orb-1 absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,87,42,0.07) 0%, transparent 70%)" }} />
      <div className="orb-2 absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,87,42,0.05) 0%, transparent 70%)" }} />
      <div className="orb-3 absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,87,42,0.06) 0%, transparent 70%)" }} />
      {/* Dot grid */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(232,87,42,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.4,
        }} />
    </div>
  );
}
