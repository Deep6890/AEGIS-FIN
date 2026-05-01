import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";
import { Skeleton } from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { Building2 } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the badge CSS class for a given NPA class string.
 * @param {"Safe"|"Watchlist"|"High Risk"|null|undefined} cls
 * @returns {string}
 */
export function classBadge(cls) {
  return "badge-orange"; // Using neutral orange/terra badge for all as per 'no extra colors'
}

/**
 * Returns colored text style for a final_score value.
 * Low scores (high risk) → red, mid → orange, high → lighter orange.
 * @param {number|null|undefined} score
 * @returns {React.CSSProperties}
 */
export function scoreStyle(score) {
  if (score == null) return { color: "var(--ink-3)" };
  if (score < 35)    return { color: "var(--terra-3)", fontWeight: 600 };
  if (score < 60)    return { color: "var(--terra)", fontWeight: 600 };
  return { color: "var(--terra-2)", fontWeight: 600 };
}

/**
 * Formats a numeric value to 2 decimal places, or "—" for null/undefined.
 * @param {number|null|undefined} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmt(val, decimals = 2) {
  if (val == null) return "—";
  return Number(val).toFixed(decimals);
}

// ── Skeleton rows ──────────────────────────────────────────────────────────

function SkeletonRows({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="tr-base">
      {Array.from({ length: 8 }).map((__, j) => (
        <td key={j} className="td-base">
          <Skeleton style={{ height: 14, borderRadius: 6, width: j === 1 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  ));
}

// ── Sort icon ──────────────────────────────────────────────────────────────

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) {
    return (
      <ArrowUpDown
        size={10}
        style={{ marginLeft: 4, opacity: 0.3, flexShrink: 0 }}
      />
    );
  }
  return sortDir === "asc"
    ? <ChevronUp   size={11} style={{ marginLeft: 4, color: "var(--orange)", flexShrink: 0 }} />
    : <ChevronDown size={11} style={{ marginLeft: 4, color: "var(--orange)", flexShrink: 0 }} />;
}

// ── Stats bar ──────────────────────────────────────────────────────────────

function StatsBar({ companies, portfolioInsights }) {
  const stats = useMemo(() => {
    const insightMap = new Map((portfolioInsights || []).map(i => [i.company_id, i]));
    let weak = 0, neutral = 0, strong = 0;
    for (const c of companies || []) {
      const cls = (insightMap.get(c.id)?.class ?? "").toUpperCase();
      if (cls === "WEAK" || cls === "HIGH RISK")      weak++;
      else if (cls === "NEUTRAL" || cls === "WATCHLIST") neutral++;
      else if (cls === "STRONG" || cls === "SAFE")       strong++;
    }
    return { total: (companies || []).length, weak, neutral, strong };
  }, [companies, portfolioInsights]);

  const items = [
    { label: "Total Companies", value: stats.total,   color: "var(--ink)" },
    { label: "Weak Signal",     value: stats.weak,    color: "#EF4444" },
    { label: "Neutral",         value: stats.neutral, color: "var(--terra-2)" },
    { label: "Strong",          value: stats.strong,  color: "var(--terra)" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {items.map(({ label, value, color }) => (
        <div key={label} className="kpi-card">
          <p className="kpi-compact-label" style={{ marginBottom: 8, color: label.includes("WEAK") ? "var(--terra-3)" : "var(--ink-3)" }}>{label}</p>
          <p style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1.05, color: label.includes("WEAK") ? "var(--terra-3)" : "var(--ink)" }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Column definitions ─────────────────────────────────────────────────────

const COLUMNS = [
  { key: "ticker",      label: "Ticker" },
  { key: "name",        label: "Company Name" },
  { key: "sector",      label: "Sector" },
  { key: "class",       label: "NPA Class" },
  { key: "final_score", label: "Final Score" },
  { key: "trend_score", label: "Trend" },
  { key: "risk",        label: "Risk" },
  { key: "momentum",    label: "Momentum" },
];

const CLASS_FILTERS = ["All", "STRONG", "NEUTRAL", "WEAK"];

// ── Main page ──────────────────────────────────────────────────────────────

export default function CompanySelect() {
  const navigate = useNavigate();
  const { companies, portfolioInsights, sectors, loading } = useAegisData();

  const [search,      setSearch]      = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sortKey,     setSortKey]     = useState("final_score");
  const [sortDir,     setSortDir]     = useState("asc");

  // Build lookup maps
  const insightMap = useMemo(() => {
    const m = new Map();
    for (const i of portfolioInsights || []) m.set(i.company_id, i);
    return m;
  }, [portfolioInsights]);

  // Resolve sector name directly from sectors array (no join needed)
  const sectorNameMap = useMemo(() => {
    const m = new Map();
    for (const s of sectors || []) {
      m.set(s.id, s.name);
    }
    return m;
  }, [sectors]);

  // Merge companies with their latest insight + sector name
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

  // Filter by search + class
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.ticker.toLowerCase().includes(q);
      const matchClass =
        classFilter === "All" || (r.class ?? "").toUpperCase() === classFilter.toUpperCase();
      return matchSearch && matchClass;
    });
  }, [rows, search, classFilter]);

  // Sort — nulls always last
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="page-wrap animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <p className="page-eyebrow">AEGIS-FIN · COMPANY INTELLIGENCE</p>
        <h1 className="page-title">Company Screener</h1>
        <p className="page-subtitle">Select a company to open full risk analysis</p>
      </div>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-3)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input-base"
            style={{ paddingLeft: 34 }}
            placeholder="Search by name or ticker…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Class filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CLASS_FILTERS.map(f => (
            <button
              key={f}
              className={classFilter === f ? "btn-orange" : "btn-inactive"}
              style={{ padding: "8px 14px", fontSize: 12 }}
              onClick={() => setClassFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <StatsBar companies={companies} portfolioInsights={portfolioInsights} />

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className="th-base"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort(col.key)}
                  >
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
                <SkeletonRows count={8} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No companies match"
                      sub="Try adjusting your search or filter."
                      icon={Building2}
                    />
                  </td>
                </tr>
              ) : (
                sorted.map(row => (
                  <tr
                    key={row.id}
                    className="tr-base"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/aegis/company/${row.id}`)}
                  >
                    {/* Ticker */}
                    <td className="td-base">
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--orange)",
                          background: "rgba(232,87,42,0.07)",
                          borderRadius: 6,
                          padding: "2px 7px",
                        }}
                      >
                        {row.ticker}
                      </span>
                    </td>

                    {/* Company Name */}
                    <td className="td-base">
                      <span className="title-sm">{row.name}</span>
                    </td>

                    {/* Sector */}
                    <td className="td-base">
                      <span className="muted" style={{ fontSize: 12 }}>{row.sector}</span>
                    </td>

                    {/* NPA Class */}
                    <td className="td-base">
                      {row.class ? (
                        <span className={`badge ${classBadge(row.class)}`}>{row.class}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    {/* Final Score — with health bar */}
                    <td className="td-base" style={{ minWidth: 110 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, ...scoreStyle(row.final_score) }}>
                          {fmt(row.final_score)}
                        </span>
                        {row.final_score != null && (
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden", width: 80 }}>
                            <div style={{
                              height: "100%",
                              width: `${Math.min(row.final_score, 100)}%`,
                              background: row.final_score < 40 ? "#EF4444" : row.final_score < 70 ? "var(--orange-2)" : "var(--orange)",
                              borderRadius: 99,
                              transition: "width 0.4s ease",
                            }} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Trend Score */}
                    <td className="td-base">
                      <span style={{ fontSize: 13, color: row.trend_score != null ? "var(--text)" : "var(--text-3)" }}>
                        {fmt(row.trend_score)}
                      </span>
                    </td>

                    {/* Risk — with bar */}
                    <td className="td-base" style={{ minWidth: 90 }}>
                      {row.risk != null ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: row.risk < 40 ? "#EF4444" : "var(--orange)" }}>
                            {fmt(row.risk)}
                          </span>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden", width: 60 }}>
                            <div style={{ height: "100%", width: `${Math.min(row.risk, 100)}%`, background: row.risk < 40 ? "#EF4444" : "var(--orange)", borderRadius: 99 }} />
                          </div>
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>

                    {/* Momentum — with bar */}
                    <td className="td-base" style={{ minWidth: 90 }}>
                      {row.momentum != null ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: row.momentum < 40 ? "#EF4444" : "var(--orange)" }}>
                            {fmt(row.momentum)}
                          </span>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden", width: 60 }}>
                            <div style={{ height: "100%", width: `${Math.min(row.momentum, 100)}%`, background: row.momentum < 40 ? "#EF4444" : "var(--orange)", borderRadius: 99 }} />
                          </div>
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        {!loading.portfolio && sorted.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="muted">
              Showing {sorted.length} of {rows.length} companies
            </span>
            <span className="muted">
              Click a row to open company profile
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
