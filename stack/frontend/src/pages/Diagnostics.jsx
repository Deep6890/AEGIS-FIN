import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Copy } from "lucide-react";
import { supabase } from "../lib/supabase";
import PageLayout from "../components/Layout/PageLayout";

const TABLES = [
  "companies","sectors","sector_metrics","sector_health",
  "company_metrics","static_corr","rolling_corr","top_sectors",
  "balance_sheet","balance_sheet_history","holding_metrics",
  "ml_predictions","feature_store","macro_overlay",
];

const RLS_SQL = `-- Paste this in Supabase → SQL Editor → Run
ALTER TABLE companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_health         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_corr           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolling_corr          ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_sectors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet         ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE holding_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_store         ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_overlay         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_companies"             ON companies             FOR SELECT USING (true);
CREATE POLICY "anon_read_sectors"               ON sectors               FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_metrics"        ON sector_metrics        FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_health"         ON sector_health         FOR SELECT USING (true);
CREATE POLICY "anon_read_company_metrics"       ON company_metrics       FOR SELECT USING (true);
CREATE POLICY "anon_read_static_corr"           ON static_corr           FOR SELECT USING (true);
CREATE POLICY "anon_read_rolling_corr"          ON rolling_corr          FOR SELECT USING (true);
CREATE POLICY "anon_read_top_sectors"           ON top_sectors           FOR SELECT USING (true);
CREATE POLICY "anon_read_balance_sheet"         ON balance_sheet         FOR SELECT USING (true);
CREATE POLICY "anon_read_balance_sheet_history" ON balance_sheet_history FOR SELECT USING (true);
CREATE POLICY "anon_read_holding_metrics"       ON holding_metrics       FOR SELECT USING (true);
CREATE POLICY "anon_read_ml_predictions"        ON ml_predictions        FOR SELECT USING (true);
CREATE POLICY "anon_read_feature_store"         ON feature_store         FOR SELECT USING (true);
CREATE POLICY "anon_read_macro_overlay"         ON macro_overlay         FOR SELECT USING (true);`;

export default function Diagnostics() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const run = async () => {
    setLoading(true);
    setResults({});
    for (const table of TABLES) {
      try {
        // Simple select — if RLS blocks it we get an error, if empty we get []
        const { data, error } = await supabase
          .from(table).select("*").limit(3);
        if (error) {
          setResults(p => ({ ...p, [table]: { status: "error", msg: error.message, code: error.code } }));
        } else {
          setResults(p => ({ ...p, [table]: { status: "ok", sample: data?.length ?? 0 } }));
        }
      } catch (e) {
        setResults(p => ({ ...p, [table]: { status: "error", msg: e.message } }));
      }
    }
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const rlsBlocked = Object.entries(results).filter(([, r]) => r?.status === "error");
  const empty      = Object.entries(results).filter(([, r]) => r?.status === "ok" && r.sample === 0);
  const hasData    = Object.entries(results).filter(([, r]) => r?.status === "ok" && r.sample > 0);

  const copy = () => {
    navigator.clipboard.writeText(RLS_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout title="Diagnostics">
      <div className="max-w-2xl space-y-4">

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[#FF8A00]" />
              <p className="section-title">Supabase Diagnostics</p>
            </div>
            <button onClick={run} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-black dark:text-[#FFC224] border border-black dark:border-[#FFC224] rounded-xl hover:bg-black hover:text-[#FFC224] dark:hover:bg-[#FFC224] dark:hover:text-black transition-all disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Re-run
            </button>
          </div>

          {/* Summary */}
          {!loading && Object.keys(results).length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bento-green text-center">
                <p className="text-xl font-black text-white">{hasData.length}</p>
                <p className="text-xs text-white/70 mt-0.5">Tables with data</p>
              </div>
              <div className="bento-yellow text-center">
                <p className="text-xl font-black text-black">{empty.length}</p>
                <p className="text-xs text-black/60 mt-0.5">Empty tables</p>
              </div>
              <div className="bento-white text-center">
                <p className="text-xl font-black text-red-500">{rlsBlocked.length}</p>
                <p className="stat-label mt-0.5">Blocked (RLS)</p>
              </div>
            </div>
          )}

          {/* RLS fix */}
          {rlsBlocked.length > 0 && (
            <div className="mb-4 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs font-black text-red-600 dark:text-red-400">
                    RLS is blocking {rlsBlocked.length} table(s) — anon key can't read
                  </p>
                </div>
                <button onClick={copy}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-black text-[#FFC224] rounded-xl hover:opacity-80 transition-opacity">
                  <Copy size={10} /> {copied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border-x border-b border-red-200 dark:border-red-900 rounded-b-2xl">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                  Go to <strong>Supabase Dashboard → SQL Editor → New Query</strong>, paste and run:
                </p>
                <pre className="text-[10px] font-mono bg-black text-[#FFC224] p-3 rounded-2xl overflow-x-auto max-h-48 overflow-y-auto">
                  {RLS_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* Empty tables */}
          {empty.length > 0 && rlsBlocked.length === 0 && (
            <div className="p-3 bg-[#FFC224]/10 border border-[#FFC224]/20 rounded-2xl mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#b38a00] dark:text-[#FFC224] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-[#b38a00] dark:text-[#FFC224] mb-1">
                    {empty.length} tables are empty — run the pipeline
                  </p>
                  <code className="text-[10px] font-mono text-[#b38a00] dark:text-[#FFC224]">
                    cd backend &amp;&amp; python run_pipeline.py --start 0 --end 5
                  </code>
                </div>
              </div>
            </div>
          )}

          {hasData.length === TABLES.length && (
            <div className="p-3 bg-[#00B341]/10 border border-[#00B341]/20 rounded-2xl mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#00B341]" />
                <p className="text-xs font-black text-[#00B341]">
                  All tables have data — everything is working
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Table list */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FDFBF7] dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1f1f1f]">
              <tr>
                <th className="th-base">Table</th>
                <th className="th-base">Status</th>
                <th className="th-base">Sample rows</th>
                <th className="th-base">Error</th>
              </tr>
            </thead>
            <tbody>
              {TABLES.map(table => {
                const r = results[table];
                return (
                  <tr key={table} className="tr-base">
                    <td className="td-base font-mono text-xs text-gray-700 dark:text-gray-300">{table}</td>
                    <td className="td-base">
                      {!r
                        ? <RefreshCw size={11} className="text-gray-400 animate-spin" />
                        : r.status === "ok"
                          ? <span className="badge-green">OK</span>
                          : <span className="badge-red">Blocked</span>}
                    </td>
                    <td className="td-base text-xs font-mono">
                      {r?.status === "ok"
                        ? <span className={r.sample === 0 ? "text-[#FFC224] font-bold" : "text-[#00B341] font-black"}>
                            {r.sample === 0 ? "empty" : `${r.sample} rows`}
                          </span>
                        : "—"}
                    </td>
                    <td className="td-base text-xs text-red-500 max-w-xs truncate font-mono">
                      {r?.code ? `[${r.code}] ` : ""}{r?.msg || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </PageLayout>
  );
}
