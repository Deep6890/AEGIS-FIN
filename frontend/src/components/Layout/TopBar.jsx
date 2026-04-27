import React, { useState, useRef, useEffect } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const REGIME_STYLE = {
  RISK_OFF: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
  RISK_ON:  "bg-[var(--orange)] text-white",
  NEUTRAL:  "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-2)]",
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
    const compHits = (companies || []).filter(c => c.name.toLowerCase().includes(q) || (c.ticker || "").toLowerCase().includes(q)).slice(0, 5).map(c => ({ label: c.name, sub: c.ticker, path: `/companies/${c.id}`, type: "company" }));
    const secHits  = (sectors  || []).filter(s => s.name.toLowerCase().includes(q)).slice(0, 3).map(s => ({ label: s.name, sub: s.yf_ticker, path: "/sectors", type: "sector" }));
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
    <header className="h-[60px] sticky top-0 z-30 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 gap-2 md:gap-4 min-w-0 transition-colors duration-300">
      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-xs md:max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-8 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-[rgba(232,87,42,.1)] transition-all duration-150"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={13} />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 card overflow-hidden z-50 animate-scale-in">
            {results.map((r, i) => (
              <button key={i} onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left transition-colors border-b border-[var(--border)] last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] shrink-0" />
                <span className="text-sm font-medium text-[var(--text)] flex-1 truncate">{r.label}</span>
                {r.sub && <span className="text-[10px] font-mono text-[var(--text-3)] shrink-0">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5 shrink-0">
        {macro?.macro_regime && (
          <span className={`badge text-[10px] font-semibold px-3 py-1.5 rounded-xl hidden sm:inline-block ${REGIME_STYLE[macro.macro_regime] || REGIME_STYLE.NEUTRAL}`}>
            {macro.macro_regime.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={14} className="text-[var(--orange)] animate-spin" />}
      </div>
    </header>
  );
}
