import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, RefreshCw, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const REGIME_STYLE = {
  RISK_OFF: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900",
  RISK_ON:  "bg-[#00B341]/10 text-[#00B341] border border-[#00B341]/20",
  NEUTRAL:  "bg-[#FFC224]/15 text-[#b38a00] dark:text-[#FFC224] border border-[#FFC224]/30",
};

export default function TopBar({ title }) {
  const { macro, loading, companies, sectors } = useAppData();
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen]     = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const PAGES = [
    { label: "Dashboard",     path: "/",            type: "page" },
    { label: "Companies",     path: "/companies",   type: "page" },
    { label: "Sectors",       path: "/sectors",     type: "page" },
    { label: "Correlation",   path: "/correlation", type: "page" },
    { label: "Risk Engine",   path: "/risk-engine", type: "page" },
    { label: "Macro Overlay", path: "/macro",       type: "page" },
    { label: "Balance Sheet", path: "/balance",     type: "page" },
    { label: "Upload CSV",    path: "/upload",      type: "page" },
    { label: "Pipeline",      path: "/pipeline",    type: "page" },
  ];

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = query.toLowerCase();
    const pageHits = PAGES.filter(p => p.label.toLowerCase().includes(q));
    const compHits = (companies || [])
      .filter(c => c.name.toLowerCase().includes(q) || (c.ticker || "").toLowerCase().includes(q))
      .slice(0, 5)
      .map(c => ({ label: c.name, sub: c.ticker, path: `/companies/${c.id}`, type: "company" }));
    const secHits = (sectors || [])
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(s => ({ label: s.name, sub: s.yf_ticker, path: "/sectors", type: "sector" }));
    setResults([...pageHits, ...compHits, ...secHits]);
    setOpen(true);
  }, [query, companies, sectors]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path) => { navigate(path); setQuery(""); setOpen(false); };

  const typeColor = {
    page:    "text-[#FF8A00]",
    company: "text-blue-500",
    sector:  "text-[#00B341]",
  };

  const regimeStyle = REGIME_STYLE[macro?.macro_regime] || REGIME_STYLE.NEUTRAL;

  return (
    <header className="h-14 bg-white dark:bg-[#0f0f0f] border-b border-gray-100 dark:border-[#1f1f1f] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 gap-3 min-w-0">
      <h1 className="text-sm font-black text-black dark:text-white whitespace-nowrap">{title}</h1>

      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages, companies, sectors…"
          className="w-full pl-8 pr-8 py-2 text-xs input-base"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#1f1f1f] rounded-2xl shadow-xl overflow-hidden z-50">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFC224]/10 text-left transition-colors"
              >
                <span className={`text-[10px] font-black uppercase tracking-wider w-14 ${typeColor[r.type]}`}>{r.type}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">{r.label}</span>
                {r.sub && <span className="text-[10px] font-mono text-gray-400">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {macro?.macro_regime && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${regimeStyle}`}>
            {macro.macro_regime.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={13} className="text-[#FFC224] animate-spin" />}
        <button className="w-8 h-8 rounded-xl border border-gray-200 dark:border-[#1f1f1f] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Bell size={14} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </header>
  );
}
