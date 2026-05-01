import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";

// ── Helpers ────────────────────────────────────────────────────────────────

export function classBadge(cls) {
  if (!cls) return "badge-gray";
  const c = cls.toLowerCase();
  if (c.includes("high") || c.includes("distress")) return "badge-red";
  if (c.includes("weak") || c.includes("watch"))    return "badge-amber";
  if (c.includes("neutral"))                         return "badge-gray";
  return "badge-orange";
}

export function scoreStyle(score) {
  if (score == null) return { color: "var(--text-3)" };
  if (score < 40)    return { color: "#EF4444", fontWeight: 700 };
  if (score < 65)    return { color: "var(--orange-2)", fontWeight: 700 };
  return { color: "var(--orange)", fontWeight: 700 };
}

export function fmt(val, decimals = 2) {
  if (val == null) return "—";
  return Number(val).toFixed(decimals);
}

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ArrowUpDown size={10} style={{ marginLeft: 4, opacity: 0.3, flexShrink: 0 }} />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} style={{ marginLeft: 4, color: "var(--orange)", flexShrink: 0 }} />
    : <ChevronDown size={11} style={{ marginLeft: 4, color: "var(--orange)", flexShrink: 0 }} />;
}

function HealthBar({ value, max = 100, danger = false }) {
  if (value == null) return <span className="muted">—</span>;
  const pct = Math.min(Math.max(value, 0), max);
  const color = value < 40 ? "#EF4444" : value < 65 ? "var(--orange-2)" : "var(--orange)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 12, ...scoreStyle(value) }}>{fmt(value)}</span>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden", width: 72 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

const COLUMNS = [
  { key: "ticker",      label: "Ticker" },
  { key: "name",        label: "Company" },
  { key: "sector",      label: "Sector" },
  { key: "class",       label: "Class" },
  { key: "final_score", label: "Risk Score" },
  { key: "trend_score", label: "Trend" },
  { key: "risk",        label: "Risk" },
  { key: "momentum",    label: "Momentum" },
];

const CLASS_FILTERS = ["All", "Safe", "Watchlist", "High Risk", "NEUTRAL", "WEAK", "STRONG", "DISTRESSED"];

// ── Main ───────────────────────────────────────────────────────────────────

export default function CompanySelect() {
  const navigate = useNavigate();
  const { companies, portfolioInsights, sectors, loading } = useAegisData();

  const [search,      setSearch]      = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sortKey,     setSortKey]     = useState("final_score");
  const [sortDir,     setSortDir]     = useState("asc");

  const insightMap = useMemo(() => {
    const m = new Map();
    for (const i of portfolioInsights || []) m.set(i.company_id, i);
    return m;
  }, [portfolioInsights]);

  const sectorNameMap = useMemo(() => {
    const m = new Map();
    for (const s of sectors || []) m.set(s.id, s.name);
    return m;
  }, [sectors]);

  const rows = useMemo(() => {
    return (companies || []).map(c => {
      const ins = insightMap.get(c.id) || {};
      return {
        id:          c.id,
        ticker:      c.ticker,
        name:        c.name,
        sector:      sectorNameMap.get(c.sector_id) ?? "—",
        class:       ins.class       ?? null,
        final_score: ins.final_score ?? null,
        trend_score: ins.trend_score ?? null,
        risk:        ins.risk        ?? null,
        momentum:    ins.momentum    ?? null,
      };
    });
  }, [companies, insightMap, sectorNameMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q);
      const matchClass  = classFilter === "All" || (r.class ?? "").toLowerCase().includes(classFilter.toLowerCase());
      return matchSearch && matchClass;
    });
  }, [rows, search, classFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Stats
  const stats = useMemo(() => {
    let highRisk = 0, watchlist = 0, safe = 0;
    for (const r of rows) {
      const c = (r.class ?? "").toLowerCase();
      if (c.includes("high") || c.includes("distress")) highRisk++;
      else if (c.includes("weak") || c.includes("watch")) watchlist++;
      else if (c.includes("safe") || c.includes("strong") || c.includes("positive")) safe++;
    }
    return { total: rows.length, highRisk, watchlist, safe };
  }, [rows]);

  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · COMPANY INTELLIGENCE</p>
        <h1 className="page-title">Company Screener</h1>
        <p className="page-subtitle">Select a company to open full risk analysis</p>
      </div>

      {/* Stats Row */}
      <div className="grid-4">
        {[
          { label: "Total Companies", value: stats.total,    color: "var(--text)" },
          { label: "High Risk",       value: stats.highRisk,  color: stats.highRisk > 0 ? "#EF4444" : "var(--text)" },
          { label: "Watchlist",       value: stats.watchlist, color: "var(--orange-2)" },
          { label: "Safe",            value: stats.safe,      color: "var(--orange)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card">
            <p className="kpi-compact-label">{label}</p>
            <p className="kpi-compact-value" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }} />
          <input
            className="input-base"
            style={{ paddingLeft: 34 }}
            placeholder="Search by name or ticker…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "High Risk", "Watchlist", "Safe"].map(f => (
            <button
              key={f}
              className={classFilter === f ? "btn-orange" : "btn-inactive"}
              style={{ padding: "7px 12px", fontSize: 12 }}
              onClick={() => setClassFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table-premium">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort(col.key)}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {col.label}
                      <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading.portfolio ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {COLUMNS.map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 6, width: j === 1 ? "80%" : "60%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px 16px" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No companies match</p>
                    <p className="muted" style={{ marginTop: 4 }}>Try adjusting your search or filter.</p>
                  </td>
                </tr>
              ) : (
                sorted.map(row => (
                  <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/aegis/company/${row.id}`)}>
                    <td>
                      <span className="ticker-chip">{row.ticker}</span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</td>
                    <td style={{ color: "var(--text-2)", fontSize: 12 }}>{row.sector}</td>
                    <td>
                      {row.class
                        ? <span className={`badge ${classBadge(row.class)}`} style={{ fontSize: 9 }}>{row.class}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td style={{ minWidth: 110 }}><HealthBar value={row.final_score} /></td>
                    <td style={{ fontSize: 12, ...scoreStyle(row.trend_score) }}>{fmt(row.trend_score)}</td>
                    <td style={{ minWidth: 90 }}><HealthBar value={row.risk} /></td>
                    <td style={{ minWidth: 90 }}><HealthBar value={row.momentum} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading.portfolio && sorted.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="muted">Showing {sorted.length} of {rows.length} companies</span>
            <span className="muted">Click a row to open company profile</span>
          </div>
        )}
      </div>

    </div>
  );
}
