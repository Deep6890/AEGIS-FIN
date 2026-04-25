import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  Building2, TrendingUp, DollarSign, Tag, Search,
  RefreshCw, ChevronRight, Database, AlertTriangle,
  Eye, Filter, Zap, ArrowUpRight
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { checkTickersInDB } from "../lib/api";

/* ── CSV parsing ─────────────────────────────────────────────────────────────── */

const TICKER_COLUMNS = [
  "NSE/BSE Ticker", "Ticker", "ticker", "Symbol", "symbol",
  "TICKER", "NSE Ticker", "BSE Ticker", "Stock Symbol",
];
const NAME_COLUMNS = [
  "Company Name", "Name", "name", "Company", "company",
  "COMPANY NAME", "CompanyName",
];

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (!lines.length) return { rows: [], error: "Empty file" };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const tickerCol = TICKER_COLUMNS.find(c => headers.includes(c));
  const nameCol   = NAME_COLUMNS.find(c => headers.includes(c));

  if (!tickerCol) {
    return {
      rows: [],
      error: `No ticker column found. Expected one of: ${TICKER_COLUMNS.slice(0, 4).join(", ")} …\nFound: ${headers.join(", ")}`,
    };
  }

  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => r[tickerCol]?.trim());

  return {
    rows: rows.map(r => ({
      ticker:  normalizeTicker(r[tickerCol]?.trim() || ""),
      rawTicker: r[tickerCol]?.trim() || "",
      name:    (nameCol ? r[nameCol] : r[tickerCol])?.trim() || r[tickerCol]?.trim(),
      ...r,
    })),
    error: null,
    tickerCol,
    nameCol,
  };
}

function normalizeTicker(t) {
  if (!t) return t;
  const upper = t.toUpperCase();
  if (upper.startsWith("^") || upper.includes("=") || upper.includes(".")) return upper;
  return `${upper}.NS`;
}

/* ── Small Components ────────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const map = {
    exists:    "badge-green",
    new:       "badge-amber",
    checking:  "badge-blue",
    unknown:   "badge-gray",
  };
  const labels = { exists: "In DB", new: "New", checking: "Checking…", unknown: "Unknown" };
  return <span className={map[status] || "badge-gray"}>{labels[status] || "—"}</span>;
}

function SurvivalBar({ score }) {
  if (score == null) return <span className="text-xs text-[#9CA3AF]">—</span>;
  const color = score >= 70 ? "bar-high" : score >= 40 ? "bar-mid" : "bar-low";
  const text  = score >= 70 ? "score-high" : score >= 40 ? "score-mid" : "score-low";
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track w-16">
        <div className={`progress-fill ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${text}`}>{score.toFixed(0)}</span>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────────── */

export default function UploadCSV() {
  const { setCsvTickers, clearCsvFilter, isCsvMode, csvTickers } = useAppData();

  const [rows, setRows]           = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName]   = useState("");
  const [search, setSearch]       = useState("");
  const [checking, setChecking]   = useState(false);
  const [dbStatus, setDbStatus]   = useState({});
  const [dbDetails, setDbDetails] = useState({});
  const [filterMode, setFilterMode] = useState("all");
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setParseError("");
    setDbStatus({});
    setDbDetails({});

    const text = await file.text();
    const { rows: parsed, error } = parseCSV(text);

    if (error) { setParseError(error); return; }
    if (!parsed.length) { setParseError("No valid rows found in CSV"); return; }

    setRows(parsed);
    await checkDB(parsed);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const checkDB = useCallback(async (rowsToCheck) => {
    setChecking(true);
    const tickers = rowsToCheck.map(r => r.ticker);
    const checkingState = {};
    tickers.forEach(t => { checkingState[t] = "checking"; });
    setDbStatus({ ...checkingState });

    try {
      const { existing, missing, error } = await checkTickersInDB(tickers);
      if (error) throw error;

      const status = {};
      const details = {};
      existing.forEach(c => { status[c.ticker] = "exists"; details[c.ticker] = c; });
      missing.forEach(t =>  { status[t] = "new"; });
      setDbStatus(status);
      setDbDetails(details);
    } catch (e) {
      console.error("DB check failed:", e);
      const fallback = {};
      tickers.forEach(t => { fallback[t] = "unknown"; });
      setDbStatus(fallback);
    } finally {
      setChecking(false);
    }
  }, []);

  const applyFilter  = useCallback(() => { setCsvTickers(rows.map(r => r.ticker)); }, [rows, setCsvTickers]);
  const removeFilter = useCallback(() => { clearCsvFilter(); }, [clearCsvFilter]);

  const existingCount = Object.values(dbStatus).filter(s => s === "exists").length;
  const newCount      = Object.values(dbStatus).filter(s => s === "new").length;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name?.toLowerCase().includes(q) || r.ticker?.toLowerCase().includes(q) || r.rawTicker?.toLowerCase().includes(q);
    const status = dbStatus[r.ticker];
    const matchFilter = filterMode === "all" || (filterMode === "exists" && status === "exists") || (filterMode === "new" && status === "new");
    return matchSearch && matchFilter;
  });

  return (
    <PageLayout title="Upload CSV">
      <div className="space-y-5">

        {/* Active filter banner */}
        {isCsvMode && (
          <div className="insight-box flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#C9A832]" />
              <p className="text-xs font-semibold text-[#8B6914] dark:text-[#E8C547]">
                CSV filter active — Companies page shows {csvTickers?.length} companies
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/companies" className="flex items-center gap-1 text-xs font-semibold text-[#C9A832] hover:text-[#E8C547] transition-colors">
                View filtered <ChevronRight size={12} />
              </Link>
              <button onClick={removeFilter} className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-red-500 transition-colors">
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        {!rows.length && (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="card p-14 flex flex-col items-center justify-center gap-5 border-2 border-dashed border-[#E8C547]/30 dark:border-[#E8C547]/20 cursor-pointer hover:border-[#E8C547]/60 dark:hover:border-[#E8C547]/40 hover:bg-[#E8C547]/[0.03] transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#E8C547]/10 flex items-center justify-center animate-float">
              <Upload size={28} className="text-[#E8C547]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">
                Drop your company CSV here or click to browse
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1.5">
                Must have a ticker column: <span className="font-mono text-[#E8C547]">Ticker</span>,{" "}
                <span className="font-mono text-[#E8C547]">Symbol</span>, or{" "}
                <span className="font-mono text-[#E8C547]">NSE/BSE Ticker</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2">
              {[
                { icon: Upload,   title: "1. Upload CSV",       desc: "Any CSV with a ticker column" },
                { icon: Database, title: "2. Auto-check DB",    desc: "See which companies are tracked" },
                { icon: Eye,      title: "3. Filter & Analyse", desc: "View only your CSV companies" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F5F0] dark:bg-[#111318] rounded-xl border border-[#E5E1D8] dark:border-[#1F2128] text-center">
                  <Icon size={16} className="text-[#E8C547]" />
                  <p className="text-xs font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">{title}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{desc}</p>
                </div>
              ))}
            </div>

            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl animate-scale-in">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <pre className="text-xs text-red-500 whitespace-pre-wrap">{parseError}</pre>
          </div>
        )}

        {/* Loaded state */}
        {rows.length > 0 && (
          <>
            {/* File info + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <FileText size={16} className="text-[#E8C547]" />
                <span className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{fileName}</span>
                <CheckCircle size={14} className="text-[#52B788]" />
                <span className="text-xs text-[#9CA3AF]">{rows.length} companies</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => checkDB(rows)} disabled={checking} className="btn-ghost text-xs py-2 px-3">
                  <RefreshCw size={12} className={checking ? "animate-spin" : ""} /> Re-check
                </button>
                <button onClick={applyFilter} className="btn-yellow text-xs py-2 px-3">
                  <Filter size={12} /> {isCsvMode ? "Update Filter" : "Apply Filter"}
                </button>
                <button onClick={() => { setRows([]); setFileName(""); setDbStatus({}); setDbDetails({}); }} className="text-[#9CA3AF] hover:text-red-500 transition-colors p-1.5">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Building2,     label: "Total",       value: rows.length,   color: "text-[#E8C547]" },
                { icon: Database,      label: "In Database", value: existingCount, color: "text-[#52B788]" },
                { icon: AlertTriangle, label: "New",         value: newCount,      color: "text-[#E8C547]" },
                { icon: Zap,           label: "Need Onboarding", value: newCount,  color: "text-red-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={color} />
                    <p className="label">{label}</p>
                  </div>
                  <p className={`value-lg ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* New company instructions */}
            {newCount > 0 && (
              <div className="insight-box">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-[#C9A832] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#8B6914] dark:text-[#E8C547] mb-1">
                      {newCount} new {newCount === 1 ? "company" : "companies"} need onboarding
                    </p>
                    <p className="text-xs text-[#6B7280] mb-3">
                      Run the onboarding script to fetch historical data and generate survival scores.
                    </p>
                    <div className="bg-[#0D0D0D] rounded-xl p-3 font-mono text-xs text-[#E8C547] overflow-x-auto">
                      <p className="text-[#6B7280] mb-1"># Run from backend/Services/LogicEngine/</p>
                      <p>python csv_onboard.py path/to/your_file.csv</p>
                      <p className="text-[#6B7280] mt-2"># Dry run (check only):</p>
                      <p>python csv_onboard.py path/to/your_file.csv --dry-run</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or ticker…" className="input-base w-full pl-9" />
              </div>
              <div className="flex gap-1.5">
                {[
                  { key: "all",    label: `All (${rows.length})` },
                  { key: "exists", label: `In DB (${existingCount})` },
                  { key: "new",    label: `New (${newCount})` },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setFilterMode(key)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${filterMode === key ? "btn-active" : "btn-inactive"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="muted">{filtered.length} of {rows.length} companies</p>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {["#", "Company", "Ticker (yfinance)", "DB Status", "Survival Score", "Action"].map(h => (
                        <th key={h} className="th-base">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const status  = dbStatus[r.ticker] || "unknown";
                      const details = dbDetails[r.ticker];
                      return (
                        <tr key={i} className="tr-base group">
                          <td className="td-base text-xs text-[#9CA3AF] tabular-nums">{i + 1}</td>
                          <td className="td-base">
                            <p className="text-xs font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{r.name}</p>
                          </td>
                          <td className="td-base">
                            <p className="font-mono text-xs text-[#E8C547]">{r.ticker}</p>
                            {r.rawTicker !== r.ticker && (
                              <p className="text-[10px] text-[#9CA3AF]">raw: {r.rawTicker}</p>
                            )}
                          </td>
                          <td className="td-base">
                            {checking && status === "checking"
                              ? <span className="badge-blue animate-pulse-soft">checking…</span>
                              : <StatusBadge status={status} />
                            }
                          </td>
                          <td className="td-base">
                            {status === "exists" && details
                              ? <SurvivalBar score={details.survival_score} />
                              : status === "new"
                                ? <span className="text-[10px] text-[#E8C547]">Run pipeline first</span>
                                : <span className="text-xs text-[#9CA3AF]">—</span>
                            }
                          </td>
                          <td className="td-base">
                            {status === "exists" && details?.id ? (
                              <Link
                                to={`/companies/${details.id}`}
                                className="flex items-center gap-1 text-xs font-semibold text-[#9CA3AF] group-hover:text-[#E8C547] transition-colors"
                              >
                                View <ArrowUpRight size={12} />
                              </Link>
                            ) : status === "new" ? (
                              <span className="text-[10px] text-[#9CA3AF]">Needs onboarding</span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Apply filter CTA */}
            <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="title-md">Filter Companies page to your CSV</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Show only these {rows.length} companies across the entire app.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCsvMode && (
                  <button onClick={removeFilter} className="btn-ghost text-xs py-2 px-3">
                    Remove Filter
                  </button>
                )}
                <button onClick={applyFilter} className="btn-yellow text-xs py-2 px-3">
                  <Filter size={13} /> {isCsvMode ? "Update Filter" : "Apply Filter"}
                </button>
                <Link to="/companies" className="btn-primary text-xs py-2 px-3">
                  View Companies <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
