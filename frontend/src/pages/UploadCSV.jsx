import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  Building2, Database, AlertTriangle,
  Search, RefreshCw, ChevronRight, Filter,
  Zap, ArrowUpRight, Info
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { checkTickersInDB } from "../lib/api";

// ── Expected CSV format (matches sme_companies_loan_analysis.csv) ─────────────
const REQUIRED_COLUMNS = ["NSE/BSE Ticker", "Company Name"];
const OPTIONAL_COLUMNS = ["Exchange Index", "SME Type", "Sector", "Industry", "Theme", "Loan Taken"];

const SAMPLE_CSV = `Sr No,Company Name,NSE/BSE Ticker,Exchange Index,SME Type,Sector,Industry,Theme,Loan Taken
1,TCS,TCS,NSE,Large Cap,Technology,IT Services,Digital,No
2,Infosys,INFY,NSE,Large Cap,Technology,IT Services,Digital,No
3,HDFC Bank,HDFCBANK,NSE,Large Cap,Financials,Banking,Finance,No`;

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (!lines.length) return { rows: [], error: "Empty file" };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));

  // Validate required columns
  const missingCols = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
  if (missingCols.length > 0) {
    return {
      rows: [],
      error: `Missing required columns: ${missingCols.join(", ")}\n\nFound columns: ${headers.join(", ")}\n\nRequired: ${REQUIRED_COLUMNS.join(", ")}`,
    };
  }

  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => r["NSE/BSE Ticker"]?.trim());

  if (!rows.length) return { rows: [], error: "No valid data rows found in CSV" };

  return {
    rows: rows.map(r => ({
      ticker:    normalizeTicker(r["NSE/BSE Ticker"]?.trim() || ""),
      rawTicker: r["NSE/BSE Ticker"]?.trim() || "",
      name:      r["Company Name"]?.trim() || r["NSE/BSE Ticker"]?.trim(),
      sector:    r["Sector"] || "",
      exchange:  r["Exchange Index"] || "NSE",
      smeType:   r["SME Type"] || "",
      loanTaken: r["Loan Taken"] || "",
    })),
    error: null,
  };
}

function normalizeTicker(t) {
  if (!t) return t;
  const upper = t.toUpperCase();
  if (upper.startsWith("^") || upper.includes("=") || upper.includes(".")) return upper;
  return `${upper}.NS`;
}

// ── Small UI components ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    exists:   { cls: "badge-green", label: "In DB" },
    new:      { cls: "badge-amber", label: "New" },
    checking: { cls: "badge-blue",  label: "Checking…" },
    unknown:  { cls: "badge-gray",  label: "Unknown" },
  };
  const { cls, label } = cfg[status] || cfg.unknown;
  return <span className={cls}>{label}</span>;
}

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-[var(--text-3)]">—</span>;
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-[var(--text)]">{score.toFixed(0)}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UploadCSV() {
  const { setCsvTickers, clearCsvFilter, isCsvMode, csvTickers } = useAppData();
  const { user } = useAuth();

  const [rows, setRows]             = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName]     = useState("");
  const [search, setSearch]         = useState("");
  const [checking, setChecking]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [dbStatus, setDbStatus]     = useState({});
  const [dbDetails, setDbDetails]   = useState({});
  const [filterMode, setFilterMode] = useState("all");
  const [showFormat, setShowFormat] = useState(false);
  const inputRef = useRef(null);

  // ── File handler ─────────────────────────────────────────────────────────
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
    setSubmitDone(false);

    const text = await file.text();
    const { rows: parsed, error } = parseCSV(text);
    if (error) { setParseError(error); return; }

    setRows(parsed);
    await checkDB(parsed);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── DB check ─────────────────────────────────────────────────────────────
  const checkDB = useCallback(async (rowsToCheck) => {
    setChecking(true);
    const tickers = rowsToCheck.map(r => r.ticker);
    setDbStatus(Object.fromEntries(tickers.map(t => [t, "checking"])));

    try {
      const { existing, missing, error } = await checkTickersInDB(tickers);
      if (error) throw error;
      const status = {};
      const details = {};
      existing.forEach(c => { status[c.ticker] = "exists"; details[c.ticker] = c; });
      missing.forEach(t => { status[t] = "new"; });
      setDbStatus(status);
      setDbDetails(details);
    } catch (e) {
      console.error("DB check failed:", e);
      setDbStatus(Object.fromEntries(rowsToCheck.map(r => [r.ticker, "unknown"])));
    } finally {
      setChecking(false);
    }
  }, []);

  // ── Submit to Supabase — saves session + queues new companies ─────────────
  const handleSubmit = useCallback(async () => {
    if (!user || !rows.length) return;
    setSubmitting(true);

    try {
      const allTickers  = rows.map(r => r.ticker);
      const newCompanies = rows.filter(r => dbStatus[r.ticker] === "new");

      // 1. Save/update csv_session so Railway knows what to process
      await supabase.from("csv_sessions").upsert({
        user_id:   user.id,
        file_name: fileName,
        tickers:   allTickers,
        row_count: allTickers.length,
        status:    newCompanies.length > 0 ? "pending" : "done",
        result:    {
          new_count:      newCompanies.length,
          existing_count: rows.length - newCompanies.length,
          new_tickers:    newCompanies.map(r => ({ ticker: r.ticker, name: r.name })),
        },
      }, { onConflict: "user_id,file_name" });

      // 2. Register new companies in companies table so pipeline picks them up
      if (newCompanies.length > 0) {
        const inserts = newCompanies.map(r => ({
          ticker:    r.ticker,
          name:      r.name,
          exchange:  r.exchange || "NSE",
          is_active: true,
        }));
        await supabase.from("companies")
          .upsert(inserts, { onConflict: "ticker,exchange", ignoreDuplicates: false });
      }

      // 3. Apply CSV filter so Companies page shows only these
      setCsvTickers(allTickers, fileName);
      setSubmitDone(true);
    } catch (e) {
      console.error("Submit failed:", e);
    } finally {
      setSubmitting(false);
    }
  }, [user, rows, dbStatus, fileName, setCsvTickers]);

  const existingCount = Object.values(dbStatus).filter(s => s === "exists").length;
  const newCount      = Object.values(dbStatus).filter(s => s === "new").length;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name?.toLowerCase().includes(q) || r.ticker?.toLowerCase().includes(q);
    const st = dbStatus[r.ticker];
    const matchFilter = filterMode === "all"
      || (filterMode === "exists" && st === "exists")
      || (filterMode === "new"    && st === "new");
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
                CSV filter active — showing {csvTickers?.length} companies
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/companies" className="flex items-center gap-1 text-xs font-semibold text-[#C9A832] hover:text-[#E8C547] transition-colors">
                View <ChevronRight size={12} />
              </Link>
              <button onClick={clearCsvFilter} className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-red-500 transition-colors">
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        )}

        {/* Format info toggle */}
        <div className="card p-4">
          <button onClick={() => setShowFormat(f => !f)}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--orange)] transition-colors w-full text-left">
            <Info size={13} className="text-[var(--orange)]" />
            Required CSV format
            <ChevronRight size={12} className={`ml-auto transition-transform ${showFormat ? "rotate-90" : ""}`} />
          </button>
          {showFormat && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[var(--text-3)]">
                Your CSV must have these columns (same format as <code className="font-mono text-[var(--orange)]">sme_companies_loan_analysis.csv</code>):
              </p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_COLUMNS.map(c => (
                  <span key={c} className="badge-orange text-[10px]">{c} *required</span>
                ))}
                {OPTIONAL_COLUMNS.map(c => (
                  <span key={c} className="badge-gray text-[10px]">{c}</span>
                ))}
              </div>
              <details className="mt-2">
                <summary className="text-xs text-[var(--orange)] cursor-pointer">View sample CSV</summary>
                <pre className="mt-2 text-[10px] font-mono bg-neutral-900 text-[var(--orange)] p-3 rounded-xl overflow-x-auto">{SAMPLE_CSV}</pre>
              </details>
            </div>
          )}
        </div>

        {/* Drop zone */}
        {!rows.length && (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="card p-14 flex flex-col items-center justify-center gap-5 border-2 border-dashed border-[var(--orange)]/20 cursor-pointer hover:border-[var(--orange)]/50 hover:bg-[var(--orange)]/[0.02] transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center">
              <Upload size={28} className="text-[var(--orange)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[var(--text)]">Drop your company CSV here or click to browse</p>
              <p className="text-xs text-[var(--text-3)] mt-1.5">
                Must have <span className="font-mono text-[var(--orange)]">NSE/BSE Ticker</span> and <span className="font-mono text-[var(--orange)]">Company Name</span> columns
              </p>
            </div>
            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <pre className="text-xs text-red-500 whitespace-pre-wrap">{parseError}</pre>
          </div>
        )}

        {/* Loaded state */}
        {rows.length > 0 && (
          <>
            {/* File header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <FileText size={16} className="text-[var(--orange)]" />
                <span className="text-sm font-semibold text-[var(--text)]">{fileName}</span>
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-xs text-[var(--text-3)]">{rows.length} companies</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => checkDB(rows)} disabled={checking} className="btn-ghost text-xs py-2 px-3">
                  <RefreshCw size={12} className={checking ? "animate-spin" : ""} /> Re-check
                </button>
                <button onClick={() => { setRows([]); setFileName(""); setDbStatus({}); setDbDetails({}); setSubmitDone(false); }}
                  className="text-[var(--text-3)] hover:text-red-500 transition-colors p-1.5">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Building2,     label: "Total",        value: rows.length,   accent: false },
                { icon: Database,      label: "Already in DB", value: existingCount, accent: false },
                { icon: AlertTriangle, label: "New (need fetch)", value: newCount,   accent: newCount > 0 },
                { icon: Zap,           label: "Will be added", value: newCount,      accent: false },
              ].map(({ icon: Icon, label, value, accent }) => (
                <div key={label} className={`card p-4 ${accent ? "border-[var(--orange)]/30" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={accent ? "text-[var(--orange)]" : "text-[var(--text-3)]"} />
                    <p className="label-caps">{label}</p>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${accent ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* What will happen info box */}
            <div className="card p-4 border-[var(--orange)]/20">
              <div className="flex items-start gap-3">
                <Info size={15} className="text-[var(--orange)] shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[var(--text)]">What happens when you submit:</p>
                  <ul className="text-xs text-[var(--text-3)] space-y-1">
                    {existingCount > 0 && (
                      <li className="flex items-center gap-2">
                        <CheckCircle size={11} className="text-green-500 shrink-0" />
                        <span><strong className="text-[var(--text)]">{existingCount} existing</strong> companies — already have data, daily pipeline updates them automatically</span>
                      </li>
                    )}
                    {newCount > 0 && (
                      <li className="flex items-center gap-2">
                        <Zap size={11} className="text-[var(--orange)] shrink-0" />
                        <span><strong className="text-[var(--text)]">{newCount} new</strong> companies — will be registered in DB, Railway will fetch 1 year of history + run full pipeline at next scheduled run (18:30 IST)</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <Filter size={11} className="text-[var(--text-3)] shrink-0" />
                      <span>Companies page will be filtered to show only your CSV companies</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit success */}
            {submitDone && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Submitted successfully</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {newCount > 0
                      ? `${newCount} new companies registered. Railway will fetch their data at next pipeline run (18:30 IST daily).`
                      : "Filter applied. All companies already have data."}
                  </p>
                </div>
                <Link to="/companies" className="ml-auto btn-ghost text-xs py-2 px-3 shrink-0">
                  View <ArrowUpRight size={12} />
                </Link>
              </div>
            )}

            {/* Search + filter */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search company or ticker…" className="input-base w-full pl-9" />
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

            <p className="text-xs text-[var(--text-3)]">{filtered.length} of {rows.length} companies</p>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {["#", "Company", "Ticker", "Sector", "DB Status", "Score", "Action"].map(h => (
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
                          <td className="td-base text-xs text-[var(--text-3)] tabular-nums">{i + 1}</td>
                          <td className="td-base">
                            <p className="text-xs font-semibold text-[var(--text)]">{r.name}</p>
                            {r.smeType && <p className="text-[10px] text-[var(--text-3)]">{r.smeType}</p>}
                          </td>
                          <td className="td-base">
                            <p className="font-mono text-xs text-[var(--orange)]">{r.ticker}</p>
                            {r.rawTicker !== r.ticker && (
                              <p className="text-[10px] text-[var(--text-3)]">raw: {r.rawTicker}</p>
                            )}
                          </td>
                          <td className="td-base text-xs text-[var(--text-3)]">{r.sector || "—"}</td>
                          <td className="td-base">
                            {checking && status === "checking"
                              ? <span className="badge-blue animate-pulse">checking…</span>
                              : <StatusBadge status={status} />}
                          </td>
                          <td className="td-base">
                            {status === "exists" && details?.survival_score != null
                              ? <ScoreBar score={details.survival_score} />
                              : status === "new"
                                ? <span className="text-[10px] text-[var(--orange)]">After pipeline</span>
                                : <span className="text-xs text-[var(--text-3)]">—</span>}
                          </td>
                          <td className="td-base">
                            {status === "exists" && details?.id
                              ? <Link to={`/companies/${details.id}`}
                                  className="flex items-center gap-1 text-xs font-semibold text-[var(--text-3)] group-hover:text-[var(--orange)] transition-colors">
                                  View <ArrowUpRight size={12} />
                                </Link>
                              : status === "new"
                                ? <span className="text-[10px] text-[var(--text-3)]">Pending</span>
                                : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit CTA */}
            {!submitDone && (
              <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="title-md">Submit & Apply Filter</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {newCount > 0
                      ? `Registers ${newCount} new companies for pipeline processing + filters the app to your ${rows.length} companies.`
                      : `Filters the app to show your ${rows.length} companies.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleSubmit} disabled={submitting || checking}
                    className="btn-active text-xs py-2.5 px-5">
                    {submitting
                      ? <><span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Submitting…</>
                      : <><CheckCircle size={13} /> Submit</>}
                  </button>
                  <Link to="/companies" className="btn-ghost text-xs py-2.5 px-4">
                    Companies <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
