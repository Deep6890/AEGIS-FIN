/**
 * BentoCard — reusable bento-box card component.
 * Supports: yellow, green, dark, white variants.
 */
import React from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * @param {string}  variant   - "yellow" | "green" | "dark" | "white"
 * @param {string}  className - extra Tailwind classes
 * @param {boolean} arrow     - show top-right arrow icon
 * @param {node}    children
 */
export default function BentoCard({ variant = "white", className = "", arrow = false, children, onClick }) {
  const base = "relative rounded-2xl p-5 overflow-hidden transition-all duration-200";

  const variants = {
    yellow: `${base} bg-[#FFC224] text-black`,
    green:  `${base} bg-[#1a3a1a] text-white`,
    dark:   `${base} bg-[#111111] text-white`,
    white:  `${base} bg-white dark:bg-[#111] border border-gray-100 dark:border-[#1f1f1f] text-black dark:text-white`,
    cream:  `${base} bg-[#FDFBF7] border border-gray-200 text-black`,
  };

  return (
    <div
      className={`${variants[variant] || variants.white} ${className} ${onClick ? "cursor-pointer hover:scale-[1.01]" : ""}`}
      onClick={onClick}
    >
      {arrow && (
        <button className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 transition-colors">
          <ArrowUpRight size={14} />
        </button>
      )}
      {children}
    </div>
  );
}

/** Small label above a big number */
export function BentoLabel({ children, className = "" }) {
  return (
    <p className={`text-xs font-semibold opacity-70 uppercase tracking-widest mb-1 ${className}`}>
      {children}
    </p>
  );
}

/** Big metric number */
export function BentoValue({ children, className = "" }) {
  return (
    <p className={`text-3xl font-black leading-none mt-2 ${className}`}>
      {children}
    </p>
  );
}

/** Small sub-label below value */
export function BentoSub({ children, className = "" }) {
  return (
    <p className={`text-xs opacity-60 mt-1 ${className}`}>
      {children}
    </p>
  );
}
