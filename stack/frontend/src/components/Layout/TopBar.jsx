import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const REGIME_STYLE = {
  RISK_OFF: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800",
  RISK_ON:  "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
  NEUTRAL:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
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

export default function TopBar({ title }) {
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
      h-14 sticky top-0 z-30
      bg-white dark:bg-neutral-900
      border-b border-neutral-200 dark:border-neutral-800
      flex items-center justify-between px-5 gap-4 min-w-0
    ">
      <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap shrink-0">{title}</h1>

      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages, companies, sectors…"
          className="w-full pl-8 pr-8 py-1.5 text-xs input-base"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={12} />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 card shadow-card-md overflow-hidden z-50 animate-slide-up">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider w-14 ${TYPE_COLOR[r.type]}`}>{r.type}</span>
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 flex-1 truncate">{r.label}</span>
                {r.sub && <span className="text-[10px] font-mono text-neutral-400">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {macro?.macro_regime && (
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${REGIME_STYLE[macro.macro_regime] || REGIME_STYLE.NEUTRAL}`}>
            {macro.macro_regime.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={13} className="text-brand-orange animate-spin" />}
        <button className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
          <Bell size={14} className="text-neutral-500" />
        </button>
      </div>
    </header>
  );
}
