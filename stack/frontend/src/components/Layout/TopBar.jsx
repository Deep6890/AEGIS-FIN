import React from "react";
import { Bell, Search, RefreshCw } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";

export default function TopBar({ title }) {
  const { macro, loading } = useAppData();

  const regimeColor = {
    RISK_OFF: "text-red-600 bg-red-50 border-red-200",
    RISK_ON:  "text-emerald-600 bg-emerald-50 border-emerald-200",
    NEUTRAL:  "text-amber-600 bg-amber-50 border-amber-200",
  }[macro?.macro_regime] || "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {macro && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${regimeColor}`}>
            {macro.macro_regime?.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={14} className="text-orange-400 animate-spin" />}
        <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <Bell size={15} className="text-gray-500" />
        </button>
      </div>
    </header>
  );
}
