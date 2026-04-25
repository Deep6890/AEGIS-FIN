import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const REGIME_STYLE = {
  RISK_OFF: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  RISK_ON:  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  NEUTRAL:  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
};

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

const TYPE_COLOR = {
  page:    "text-brand-orange",
  company: "text-blue-500",
  sector:  "text-emerald-500",
};

export default function TopBar() {
  const { macro, loading, companies, sectors } = useAppData();
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

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
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = path => { navigate(path); setQuery(""); setOpen(false); };

  return (
    <header className="
      h-[72px] sticky top-0 z-30
      bg-white/50 dark:bg-white/[0.02] backdrop-blur-3xl
      border-b border-neutral-900/[0.08] dark:border-white/[0.05]
      flex items-center justify-between px-8 gap-6 min-w-0
      transition-colors duration-500
    ">
      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-lg">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages, companies, sectors…"
          className="w-full pl-11 pr-8 py-2.5 text-sm input-base bg-neutral-100/50 dark:bg-neutral-800/50 shadow-sm focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={14} />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 card-glass overflow-hidden z-50 animate-slide-up">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-neutral-900/[0.04] dark:hover:bg-white/[0.04] text-left transition-colors border-b border-neutral-900/[0.02] dark:border-white/[0.02] last:border-0"
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest w-16 ${TYPE_COLOR[r.type]}`}>{r.type}</span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex-1 truncate">{r.label}</span>
                {r.sub && <span className="text-[10px] font-mono text-neutral-400">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {macro?.macro_regime && (
          <span className={`badge ${REGIME_STYLE[macro.macro_regime] || REGIME_STYLE.NEUTRAL}`}>
            {macro.macro_regime.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={16} className="text-brand-orange animate-spin" />}
        <button className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
