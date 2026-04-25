import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Database, Copy, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import PageLayout from "../components/Layout/PageLayout";

const TABLES = [
  "companies","sectors","ratio_definitions","holding_metric_definitions",
  "ohlcv_raw","sector_ohlcv_raw","ohlcv_health","sector_health",
  "balance_sheet_ratios","balance_sheet_hist","stock_holding",
  "correlation","classifier","pipeline_log","user_profiles","csv_sessions",
];

const RLS_SQL = `-- Paste in Supabase → SQL Editor → Run
ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratio_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE holding_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ohlcv_raw              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_ohlcv_raw       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ohlcv_health           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_health          ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_ratios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_hist     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_holding          ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation            ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifier             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_log           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_companies"    ON companies             FOR SELECT USING (true);
CREATE POLICY "anon_read_sectors"      ON sectors               FOR SELECT USING (true);
CREATE POLICY "anon_read_ratio_defs"   ON ratio_definitions     FOR SELECT USING (true);
CREATE POLICY "anon_read_holding_defs" ON holding_metric_definitions FOR SELECT USING (true);
CREATE POLICY "anon_read_ohlcv"        ON ohlcv_raw             FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_ohlcv" ON sector_ohlcv_raw      FOR SELECT USING (true);
CREATE POLICY "anon_read_ohlcv_health" ON ohlcv_health          FOR SELECT USING (true);
CREATE POLICY "anon_read_sector_health"ON sector_health         FOR SELECT USING (true);
CREATE POLICY "anon_read_bs_ratios"    ON balance_sheet_ratios  FOR SELECT USING (true);
CREATE POLICY "anon_read_bs_hist"      ON balance_sheet_hist    FOR SELECT USING (true);
CREATE POLICY "anon_read_stock_holding"ON stock_holding         FOR SELECT USING (true);
CREATE POLICY "anon_read_correlation"  ON correlation           FOR SELECT USING (true);
CREATE POLICY "anon_read_classifier"   ON classifier            FOR SELECT USING (true);
CREATE POLICY "anon_read_pipeline_log" ON pipeline_log          FOR SELECT USING (true);`;

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

  const copy = () => { navigator.clipboard.writeText(RLS_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <PageLayout title="Diagnostics">
      <div className="max-w-2xl mx-auto space-y-5 pb-10 animate-slide-up">

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">System</p>
          <h1 className="page-heading">Diagnostics</h1>
          <p className="page-subheading">Check Supabase table connectivity and RLS policy status.</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--orange)]/10 flex items-center justify-center">
                <Database size={15} className="text-[var(--orange)]" />
              </div>
              <p className="title-md">Supabase Diagnostics</p>
            </div>
            <button onClick={run} disabled={loading} className="btn-ghost text-xs py-2 px-3">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Re-run
            </button>
          </div>

          {!loading && Object.keys(results).length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card-orange p-4 text-center">
                <p className="text-2xl font-bold text-white">{hasData.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-1">With Data</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text)]">{empty.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mt-1">Empty</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text)]">{rlsBlocked.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mt-1">Blocked</p>
              </div>
            </div>
          )}

          {rlsBlocked.length > 0 && (
            <div className="card p-4 mb-5 border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-[var(--text-2)]" />
                  <p className="text-xs font-bold text-[var(--text-2)]">RLS blocking {rlsBlocked.length} table(s)</p>
                </div>
                <button onClick={copy} className="btn-active text-xs py-1.5 px-3">
                  <Copy size={10} /> {copied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
              <p className="text-xs text-[var(--text-3)] mb-3">Go to Supabase → SQL Editor → New Query, paste and run:</p>
              <pre className="text-[10px] font-mono bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] rounded-xl p-3 overflow-x-auto text-[var(--orange)] max-h-48 overflow-y-auto">
                {RLS_SQL}
              </pre>
            </div>
          )}

          {hasData.length === TABLES.length && (
            <div className="card-orange p-3 mb-5 flex items-center gap-2">
              <CheckCircle size={14} className="text-white" />
              <p className="text-xs font-semibold text-white">All tables have data — everything is working</p>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>{["Table","Status","Rows","Error"].map(h => <th key={h} className="th-base">{h}</th>)}</tr>
            </thead>
            <tbody>
              {TABLES.map(table => {
                const r = results[table];
                return (
                  <tr key={table} className="tr-base">
                    <td className="td-base font-mono text-xs text-[var(--text)]">{table}</td>
                    <td className="td-base">
                      {!r
                        ? <RefreshCw size={11} className="text-[var(--text-3)] animate-spin" />
                        : r.status === "ok"
                          ? <span className="badge-green">OK</span>
                          : <span className="badge-gray">Blocked</span>}
                    </td>
                    <td className="td-base text-xs font-mono">
                      {r?.status === "ok"
                        ? <span className={r.sample === 0 ? "text-[var(--text-3)]" : "text-[var(--orange)] font-bold"}>
                            {r.sample === 0 ? "empty" : `${r.sample} rows`}
                          </span>
                        : "—"}
                    </td>
                    <td className="td-base text-xs text-[var(--text-3)] max-w-xs truncate font-mono">
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
