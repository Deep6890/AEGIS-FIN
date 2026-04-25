import React, { useState, useRef, useEffect } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const REGIME_STYLE = {
  RISK_OFF: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50",
  RISK_ON:  "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50",
  NEUTRAL:  "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
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

const TYPE_DOT = {
  page:    "bg-[#FF4D00]",
  company: "bg-blue-500",
  sector:  "bg-green-500",
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
      h-[60px] sticky top-0 z-30
      bg-[#F5F4F0]/90 dark:bg-[#0C0C0B]/90
      backdrop-blur-xl
      border-b border-black/[0.07] dark:border-white/[0.06]
      flex items-center justify-between px-6 gap-4 min-w-0
      transition-colors duration-300
    ">
      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages, companies, sectors…"
          className="
            w-full pl-9 pr-8 py-2 text-sm
            bg-white dark:bg-neutral-900/60
            border border-black/[0.07] dark:border-white/[0.07]
            rounded-xl text-neutral-900 dark:text-neutral-100
            placeholder-neutral-400 dark:placeholder-neutral-600
            focus:outline-none focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/10
            transition-all duration-150
          "
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
            <X size={13} />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-neutral-900 border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-card-lg overflow-hidden z-50 animate-slide-up">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors border-b border-black/[0.04] dark:border-white/[0.04] last:border-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[r.type]}`} />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex-1 truncate">{r.label}</span>
                {r.sub && <span className="text-[10px] font-mono text-neutral-400 shrink-0">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5 shrink-0">
        {macro?.macro_regime && (
          <span className={`badge ${REGIME_STYLE[macro.macro_regime] || REGIME_STYLE.NEUTRAL}`}>
            {macro.macro_regime.replace("_", " ")}
          </span>
        )}
        {loading && <RefreshCw size={14} className="text-[#FF4D00] animate-spin" />}
      </div>
    </header>
  );
}
