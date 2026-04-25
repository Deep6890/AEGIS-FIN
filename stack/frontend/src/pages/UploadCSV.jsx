import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  Building2, TrendingUp, DollarSign, Tag, Search,
  RefreshCw, ChevronRight, Database, AlertTriangle,
  Eye, Filter, Zap,
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAppData } from "../context/AppDataContext";
import { checkTickersInDB } from "../lib/api";

// ── CSV parsing ───────────────────────────────────────────────────────────────

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
  return `${upper}.NS`; // default to NSE
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    exists:    { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "In DB" },
    new:       { cls: "bg-amber-50 text-amber-700 border-amber-200",       label: "New" },
    checking:  { cls: "bg-blue-50 text-blue-600 border-blue-200",          label: "Checking…" },
    unknown:   { cls: "bg-gray-50 text-gray-500 border-gray-200",          label: "Unknown" },
  };
  const { cls, label } = map[status] || map.unknown;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ── Survival bar ──────────────────────────────────────────────────────────────

function SurvivalBar({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700">{score.toFixed(0)}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UploadCSV() {
  const { setCsvTickers, clearCsvFilter, isCsvMode, csvTickers } = useAppData();

  const [rows, setRows]           = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName]   = useState("");
  const [search, setSearch]       = useState("");
  const [checking, setChecking]   = useState(false);
  const [dbStatus, setDbStatus]   = useState({}); // ticker → "exists" | "new"
  const [dbDetails, setDbDetails] = useState({}); // ticker → {id, name, survival_score}
  const [filterMode, setFilterMode] = useState("all"); // all | exists | new
  const inputRef = useRef(null);

  // ── File handling ─────────────────────────────────────────────────────────

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

    // Auto-check DB status
    await checkDB(parsed);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── DB check ──────────────────────────────────────────────────────────────

  const checkDB = useCallback(async (rowsToCheck) => {
    setChecking(true);
    const tickers = rowsToCheck.map(r => r.ticker);

    // Mark all as checking
    const checking = {};
    tickers.forEach(t => { checking[t] = "checking"; });
    setDbStatus({ ...checking });

    try {
      const { existing, missing, error } = await checkTickersInDB(tickers);
      if (error) throw error;

      const status = {};
      const details = {};

      existing.forEach(c => {
        status[c.ticker]  = "exists";
        details[c.ticker] = c;
      });
      missing.forEach(t => {
        status[t] = "new";
      });

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

  // ── Apply CSV filter to Companies page ────────────────────────────────────

  const applyFilter = useCallback(() => {
    const tickers = rows.map(r => r.ticker);
    setCsvTickers(tickers);
  }, [rows, setCsvTickers]);

  const removeFilter = useCallback(() => {
    clearCsvFilter();
  }, [clearCsvFilter]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const existingCount = Object.values(dbStatus).filter(s => s === "exists").length;
  const newCount      = Object.values(dbStatus).filter(s => s === "new").length;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.name?.toLowerCase().includes(q) ||
      r.ticker?.toLowerCase().includes(q) ||
      r.rawTicker?.toLowerCase().includes(q);
    const status = dbStatus[r.ticker];
    const matchFilter =
      filterMode === "all" ||
      (filterMode === "exists" && status === "exists") ||
      (filterMode === "new"    && status === "new");
    return matchSearch && matchFilter;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout title="Upload CSV">
      <div className="space-y-5">

        {/* Active filter banner */}
        {isCsvMode && (
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-orange-500" />
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                CSV filter active — Companies page shows {csvTickers?.length} companies from your CSV
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/companies" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                View filtered <ChevronRight size={12} />
              </Link>
              <button
                onClick={removeFilter}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
              >
                <X size={12} /> Remove filter
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
            className="card p-12 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-orange-200 dark:border-orange-800 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Upload size={26} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Drop your company CSV here or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Must have a ticker column: <span className="font-mono text-orange-500">NSE/BSE Ticker</span>,{" "}
                <span className="font-mono text-orange-500">Ticker</span>, or{" "}
                <span className="font-mono text-orange-500">Symbol</span>
              </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2">
              {[
                { icon: Upload,   title: "1. Upload CSV",       desc: "Any CSV with a ticker column" },
                { icon: Database, title: "2. Auto-check DB",    desc: "See which companies are already tracked" },
                { icon: Eye,      title: "3. Filter & Analyse", desc: "View only your CSV companies" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#2a2a2a] text-center">
                  <Icon size={16} className="text-orange-400" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </div>
              ))}
            </div>

            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{parseError}</pre>
          </div>
        )}

        {/* Loaded state */}
        {rows.length > 0 && (
          <>
            {/* File info + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <FileText size={16} className="text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-400">{rows.length} companies</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => checkDB(rows)}
                  disabled={checking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] rounded-lg hover:border-orange-300 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={checking ? "animate-spin" : ""} />
                  Re-check DB
                </button>
                <button
                  onClick={applyFilter}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
                >
                  <Filter size={12} />
                  {isCsvMode ? "Update Filter" : "Apply Filter"}
                </button>
                <button
                  onClick={() => { setRows([]); setFileName(""); setDbStatus({}); setDbDetails({}); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={13} /> Clear
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Building2,    label: "Total Companies",  value: rows.length,      color: "text-orange-500" },
                { icon: Database,     label: "Already in DB",    value: existingCount,    color: "text-emerald-500" },
                { icon: AlertTriangle,label: "New (not in DB)",  value: newCount,         color: "text-amber-500" },
                { icon: Zap,          label: "Need Onboarding",  value: newCount,         color: "text-red-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={color} />
                    <p className="stat-label">{label}</p>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* New company onboarding instructions */}
            {newCount > 0 && (
              <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      {newCount} new {newCount === 1 ? "company" : "companies"} need onboarding
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      These tickers are not yet in the database. Run the onboarding script to fetch
                      1 year of historical data and generate survival scores. After that, the daily
                      pipeline will keep them updated automatically.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto">
                      <p className="text-gray-500 mb-1"># Run from backend/Services/LogicEngine/</p>
                      <p>python csv_onboard.py path/to/your_file.csv</p>
                      <p className="text-gray-500 mt-2"># Dry run (check only, no pipeline):</p>
                      <p>python csv_onboard.py path/to/your_file.csv --dry-run</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      First run fetches 1 year of data. Each subsequent daily run adds only 1 new row per company.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search company or ticker…"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-[#2a2a2a] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white dark:bg-[#111]"
                />
              </div>
              <div className="flex gap-1.5">
                {[
                  { key: "all",    label: `All (${rows.length})` },
                  { key: "exists", label: `In DB (${existingCount})` },
                  { key: "new",    label: `New (${newCount})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterMode(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      filterMode === key
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a2a] hover:border-orange-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400">{filtered.length} of {rows.length} companies</p>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-[#1f1f1f]">
                    <tr>
                      {["#", "Company", "Ticker (yfinance)", "DB Status", "Survival Score", "Action"].map(h => (
                        <th key={h} className="text-left py-3 px-3 stat-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const status  = dbStatus[r.ticker] || "unknown";
                      const details = dbDetails[r.ticker];
                      return (
                        <tr key={i} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-orange-50/20 dark:hover:bg-orange-900/10 transition-colors">
                          <td className="py-2.5 px-3 text-xs text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{r.name}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <div>
                              <p className="font-mono text-xs text-orange-500">{r.ticker}</p>
                              {r.rawTicker !== r.ticker && (
                                <p className="text-[10px] text-gray-400">raw: {r.rawTicker}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {checking && status === "checking"
                              ? <span className="text-[10px] text-blue-500 animate-pulse">checking…</span>
                              : <StatusBadge status={status} />
                            }
                          </td>
                          <td className="py-2.5 px-3">
                            {status === "exists" && details
                              ? <SurvivalBar score={details.survival_score} />
                              : status === "new"
                                ? <span className="text-[10px] text-amber-500">Run pipeline first</span>
                                : <span className="text-xs text-gray-400">—</span>
                            }
                          </td>
                          <td className="py-2.5 px-3">
                            {status === "exists" && details?.id ? (
                              <Link
                                to={`/companies/${details.id}`}
                                className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-xs font-medium"
                              >
                                View <ChevronRight size={12} />
                              </Link>
                            ) : status === "new" ? (
                              <span className="text-[10px] text-gray-400">Needs onboarding</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Apply filter CTA */}
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Filter Companies page to your CSV
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click "Apply Filter" to show only these {rows.length} companies across the entire app.
                  The filter persists until you remove it.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCsvMode && (
                  <button
                    onClick={removeFilter}
                    className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 dark:border-[#2a2a2a] rounded-xl hover:border-red-300 hover:text-red-500 transition-all"
                  >
                    Remove Filter
                  </button>
                )}
                <button
                  onClick={applyFilter}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"
                >
                  <Filter size={13} />
                  {isCsvMode ? "Update Filter" : "Apply Filter"}
                </button>
                <Link
                  to="/companies"
                  className="flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all"
                >
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
