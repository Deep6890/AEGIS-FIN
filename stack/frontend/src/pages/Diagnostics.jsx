import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Database, Copy, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import PageLayout from "../components/Layout/PageLayout";

const TABLES = [
  "companies","sectors","sector_metrics","sector_health",
  "company_metrics","static_corr","rolling_corr","top_sectors",
  "balance_sheet","balance_sheet_history","holding_metrics",
  "ml_predictions","feature_store","macro_overlay",
];

const RLS_SQL = `-- Paste in Supabase → SQL Editor → Run
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
    setLoading(true); setResults({});
    for (const table of TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*").limit(3);
        if (error) setResults(p => ({ ...p, [table]: { status: "error", msg: error.message, code: error.code } }));
        else       setResults(p => ({ ...p, [table]: { status: "ok", sample: data?.length ?? 0 } }));
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
      <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[#E8C547]" />
              <p className="title-md">Supabase Diagnostics</p>
            </div>
            <button onClick={run} disabled={loading} className="btn-ghost text-xs py-2 px-3">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Re-run
            </button>
          </div>

          {!loading && Object.keys(results).length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card-green rounded-2xl p-4 text-center hover-lift">
                <p className="text-2xl font-black text-white">{hasData.length}</p>
                <p className="label mt-1 text-white/60">With Data</p>
              </div>
              <div className="card-yellow rounded-2xl p-4 text-center hover-lift">
                <p className="text-2xl font-black">{empty.length}</p>
                <p className="label mt-1 opacity-60">Empty</p>
              </div>
              <div className="card-ink rounded-2xl p-4 text-center hover-lift">
                <p className="text-2xl font-black text-red-400">{rlsBlocked.length}</p>
                <p className="label mt-1 text-white/50">Blocked</p>
              </div>
            </div>
          )}

          {rlsBlocked.length > 0 && (
            <div className="card-ink rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-xs font-bold text-red-400">RLS blocking {rlsBlocked.length} table(s)</p>
                </div>
                <button onClick={copy} className="btn-yellow text-xs py-1.5 px-3">
                  <Copy size={10} /> {copied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
              <p className="text-xs text-white/50 mb-2">Go to Supabase → SQL Editor → New Query, paste and run:</p>
              <pre className="text-[10px] font-mono bg-black/40 rounded-xl p-3 overflow-x-auto text-[#E8C547] max-h-48 overflow-y-auto">
                {RLS_SQL}
              </pre>
            </div>
          )}

          {hasData.length === TABLES.length && (
            <div className="card-green rounded-2xl p-3 mb-5 flex items-center gap-2">
              <CheckCircle size={14} className="text-white" />
              <p className="text-xs font-semibold text-white">All tables have data — everything is working</p>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                {["Table","Status","Rows","Error"].map(h => <th key={h} className="th-base">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {TABLES.map(table => {
                const r = results[table];
                return (
                  <tr key={table} className="tr-base">
                    <td className="td-base font-mono text-xs text-[#0D0D0D] dark:text-[#E8E6E0]">{table}</td>
                    <td className="td-base">
                      {!r
                        ? <RefreshCw size={11} className="text-[#9CA3AF] animate-spin" />
                        : r.status === "ok"
                          ? <span className="badge-green">OK</span>
                          : <span className="badge-red">Blocked</span>}
                    </td>
                    <td className="td-base text-xs font-mono">
                      {r?.status === "ok"
                        ? <span className={r.sample === 0 ? "text-[#E8C547] font-semibold" : "text-[#52B788] font-bold"}>
                            {r.sample === 0 ? "empty" : `${r.sample} rows`}
                          </span>
                        : "—"}
                    </td>
                    <td className="td-base text-xs text-red-400 max-w-xs truncate font-mono">
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
