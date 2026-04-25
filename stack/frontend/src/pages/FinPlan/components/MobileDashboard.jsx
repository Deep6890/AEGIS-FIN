/**
 * MobileDashboard — the full mobile-style dashboard view.
 * Matches images 2 & 3 exactly.
 */
import React, { useState } from "react";
import {
  Search, AlertCircle, Bell, ChevronDown,
  Plus, Share2, MessageSquare, LayoutGrid,
  FileText, Clock, Settings, ArrowUpRight,
  TrendingUp, AlignJustify,
} from "lucide-react";
import BarChartWidget from "./BarChartWidget";
import GrossMarginChart from "./GrossMarginChart";
import RevenueCard from "./RevenueCard";
import BentoCard, { BentoLabel, BentoValue, BentoSub } from "./BentoCard";
import { usePersona } from "../context/PersonaContext";

// ── Top nav ───────────────────────────────────────────────────────────────────
function TopNav() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
          <Search size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
        <button className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
          <AlertCircle size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
          <Bell size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
          U
        </div>
      </div>
    </div>
  );
}

// ── Account selector ──────────────────────────────────────────────────────────
function AccountSelector() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] text-sm font-semibold text-gray-800 dark:text-gray-200">
        Main Account
        <ChevronDown size={14} />
      </button>
      <button className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
        <Plus size={15} className="text-gray-600 dark:text-gray-400" />
      </button>
      <button className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
        <Share2 size={15} className="text-gray-600 dark:text-gray-400" />
      </button>
      <button className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
        <MessageSquare size={15} className="text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}

// ── Bottom nav bar ────────────────────────────────────────────────────────────
function BottomNav({ active, setActive }) {
  const items = [
    { id: "grid",     icon: LayoutGrid },
    { id: "reports",  icon: FileText },
    { id: "history",  icon: Clock },
    { id: "settings", icon: Settings },
  ];
  return (
    <div className="flex items-center justify-around py-3 px-4 bg-[#111] dark:bg-[#0a0a0a] rounded-2xl">
      {items.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            active === id
              ? "bg-white text-black"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}

// ── Bento grid (the bottom sheet) ─────────────────────────────────────────────
function BentoGrid() {
  return (
    <div className="space-y-3">
      {/* Row 1: Cash + Salary Run Rate */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cash — yellow */}
        <BentoCard variant="yellow">
          <BentoLabel>Cash</BentoLabel>
          <p className="text-xs font-semibold opacity-70 mb-1">56.20%</p>
          <BentoValue>$786.500k</BentoValue>
        </BentoCard>

        {/* Salary Run Rate — yellow */}
        <BentoCard variant="yellow">
          <BentoLabel>Salary Run Rate</BentoLabel>
          <p className="text-xs font-semibold opacity-70 mb-1">20.00%</p>
          <BentoValue>562k</BentoValue>
        </BentoCard>
      </div>

      {/* Row 2: Gross Margin — full width dark green */}
      <BentoCard variant="green" arrow className="col-span-2">
        <BentoLabel className="text-white/70">Gross Margin</BentoLabel>
        <GrossMarginChart height={120} />
      </BentoCard>

      {/* Row 3: AP circle + Revenue */}
      <div className="grid grid-cols-2 gap-3">
        {/* AP — bright green circle */}
        <div className="rounded-2xl bg-[#00B341] p-5 flex flex-col items-center justify-center min-h-[140px]">
          <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">AP</p>
          <p className="text-3xl font-black text-white">$786k</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={12} className="text-white/80" />
            <p className="text-xs font-semibold text-white/80">↑ 56.20%</p>
          </div>
        </div>

        {/* Revenue — yellow */}
        <BentoCard variant="yellow" className="min-h-[140px]">
          <RevenueCard />
        </BentoCard>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileDashboard() {
  const [activeNav, setActiveNav] = useState("grid");
  const [showBento, setShowBento] = useState(false);
  const { persona } = usePersona();

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Phone frame */}
      <div className="w-full max-w-sm">
        {/* Main screen */}
        <div className="bg-[#FDFBF7] dark:bg-[#f5f3ee] rounded-[2.5rem] border-4 border-black overflow-hidden shadow-2xl">
          <div className="p-5 pb-0">
            <TopNav />

            {/* Title */}
            <h2 className="text-2xl font-black text-black mb-4">Overview</h2>

            <AccountSelector />

            {/* Chart */}
            <BarChartWidget height={200} />
          </div>

          {/* Bottom sheet — slides up */}
          <div className="relative mt-2">
            {/* Drag handle */}
            <div
              className="flex justify-center py-2 cursor-pointer"
              onClick={() => setShowBento(!showBento)}
            >
              <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Peek row — always visible */}
            <div className="bg-[#111] dark:bg-[#0a0a0a] rounded-t-3xl px-5 pt-4 pb-2">
              {!showBento ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cash</p>
                      <p className="text-xl font-black text-white">$786.5k</p>
                      <p className="text-xs text-gray-500">56.20%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Salary Run Rate</p>
                      <p className="text-xl font-black text-white">562k</p>
                    </div>
                  </div>
                  <BottomNav active={activeNav} setActive={setActiveNav} />
                </>
              ) : (
                <>
                  <BentoGrid />
                  <div className="mt-4">
                    <BottomNav active={activeNav} setActive={setActiveNav} />
                  </div>
                </>
              )}
              <div className="h-4" />
            </div>
          </div>
        </div>

        {/* Toggle hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Tap the handle to {showBento ? "collapse" : "expand"} bento cards
        </p>
      </div>
    </div>
  );
}
