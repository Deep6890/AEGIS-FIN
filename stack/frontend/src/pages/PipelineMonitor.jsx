import React, { useEffect, useState, useCallback } from "react";
import {
  Activity, CheckCircle, XCircle, Clock, RefreshCw,
  Layers, Database, Cpu, TrendingUp, AlertTriangle,
  Play, ChevronDown, ChevronRight, Terminal
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchPipelineLog, fetchPipelineStats } from "../lib/api";

const LAYERS = [
  { id: 1, name: "Sector Engine",       desc: "Fetches OHLCV for 12 NSE sector indices from Yahoo Finance. Computes returns, volatility, ATR, drawdown, momentum, trend for every trading day." },
  { id: 2, name: "Sector Health",       desc: "Runs rolling z-scores on each sector's own history. Outputs health_score (0–100 percentile rank), signal (STRONG/NEUTRAL/WATCH/WEAK), regime (BULL/BEAR/NEUTRAL), spike detection." },
  { id: "2b", name: "Macro Overlay",    desc: "Derives daily macro regime from VIX, USD-INR, Gold, Crude Oil z-scores. RISK_OFF = multiple headwinds active. RISK_ON = tailwinds. Adjusts sector signals accordingly." },
  { id: 3, name: "Company Engine",      desc: "Fetches OHLCV for the company ticker. Computes the same 9 metric stems as sectors: returns (1d/5d/20d), volatility, ATR, drawdown, volume ratio, momentum, trend." },
  { id: 4, name: "Correlation Engine",  desc: "Builds static Pearson correlation matrix (company vs each sector) and full daily rolling correlation time-series for 20/60/100-day windows across all 8 metric stems." },
  { id: 5, name: "Sector Sift",         desc: "Ranks sectors by 60-day rolling correlation with the company. Top-N most correlated sectors are stored — these drive the sector overlay in layers 6 & 7." },
  { id: 6, name: "Balance Sheet",       desc: "Pulls 20 quarters of financial ratios from Yahoo Finance. Scores each ratio vs its own history (percentile rank), computes YoY change, applies sector pressure overlay from top correlated sectors." },
  { id: 7, name: "Holdings Engine",     desc: "Fetches shareholder data: HHI concentration, institutional holding %, promoter pledge. Applies sector health signal as overlay to adjust each metric's status." },
  { id: 8, name: "ML Survival Model",   desc: "Feeds 8 features (D/E, current ratio, revenue growth, equity growth, sector correlation 60d, sector health score, HHI, institutional holding) into a trained survival model. Outputs 0–100 score + distress probability." },
  { id: 9, name: "Feature Store",       desc: "Saves the exact 8 ML input features used for this run. Audit trail for model retraining and explainability. Stored per company per date." },
];

function LayerCard({ layer, active }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${
      active
        ? "border-[#FFC224] bg-[#FFC224]/5"
        : "border-gray-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111]"
    }`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
          active ? "bg-black text-[#FFC224]" : "bg-gray-100 dark:bg-[#1f1f1f] text-gray-500 dark:text-gray-400"
        }`}>
          {layer.id}
        </div>
        <span className={`text-sm font-black flex-1 ${
          active ? "text-[#b38a00] dark:text-[#FFC224]" : "text-gray-800 dark:text-gray-200"
        }`}>{layer.name}</span>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{layer.desc}</p>
        </div>
      )}
    </div>
  );
}

export default function PipelineMonitor() {
  const [logs, setLogs]       = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const ct = useChartTheme();

  const load = useCallback(async () => {
    setLoading(true);
    const [l, s] = await Promise.all([fetchPipelineLog(200), fetchPipelineStats()]);
    setLogs(l.data || []);
    setStats(s.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total   = stats.length;
  const ok      = stats.filter(r => r.status === "ok").length;
  const errors  = stats.filter(r => r.status === "error").length;
  const lastRun = logs[0]?.run_at ? new Date(logs[0].run_at).toLocaleString("en-IN") : "—";

  // Runs per day chart
  const byDay = {};
  stats.forEach(r => {
    const d = r.run_at?.slice(0, 10);
    if (!d) return;
    if (!byDay[d]) byDay[d] = { date: d.slice(5), ok: 0, error: 0 };
    byDay[d][r.status === "ok" ? "ok" : "error"]++;
  });
  const chartData = Object.values(byDay).slice(-14);

  // Unique companies processed
  const uniqueCompanies = new Set(stats.map(r => r.company)).size;

  return (
    <PageLayout title="Pipeline Monitor">
      <div className="space-y-5">

        {/* Header insight */}
        <div className="bento-black">
          <p className="text-xs font-black text-[#FFC224] uppercase tracking-widest mb-1">AEGIS-FIN 9-Layer Pipeline</p>
          <p className="text-sm text-white/70 leading-relaxed">
            Every day after NSE market close, the scheduler fetches live data for all{" "}
            <span className="font-black text-[#FFC224]">134 SME companies</span> from Yahoo Finance,
            runs all 9 analytical layers, and pushes results to Supabase.
            The entire process takes ~2–4 hours depending on API rate limits.
            Each company gets a fresh survival score, balance sheet analysis, and sector correlation update.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Database,    label: "Total Runs",          value: total,           color: "text-[#FFC224]",  bg: "bento-black" },
            { icon: CheckCircle, label: "Successful",          value: ok,              color: "text-[#00B341]",  bg: "bento-white" },
            { icon: XCircle,     label: "Failed",              value: errors,          color: "text-red-500",    bg: "bento-white" },
            { icon: Activity,    label: "Companies Processed", value: uniqueCompanies, color: "text-[#FF8A00]",  bg: "bento-white" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} flex flex-col gap-1`}>
              <div className="flex items-center gap-2">
                <Icon size={14} className={color} />
                <p className={`stat-label ${bg === "bento-black" ? "text-white/60" : ""}`}>{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Last run + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={13} />
            Last run: <span className="font-black text-gray-600 dark:text-gray-300">{lastRun}</span>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-black dark:text-[#FFC224] border border-black dark:border-[#FFC224] rounded-xl hover:bg-black hover:text-[#FFC224] dark:hover:bg-[#FFC224] dark:hover:text-black transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Runs per day chart */}
        {chartData.length > 0 && (
          <div className="card p-4 sm:p-5">
            <p className="section-title mb-1">Pipeline Runs (Last 14 Days)</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Green = successful company runs. Red = failed runs.</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                <Tooltip {...ct.tooltip} />
                <Bar dataKey="ok"    stackId="a" fill="#00B341" radius={[0,0,0,0]} name="OK" />
                <Bar dataKey="error" stackId="a" fill="#ef4444" radius={[3,3,0,0]} name="Error" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Pipeline Architecture */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} className="text-[#FF8A00]" />
              <p className="section-title">9-Layer Architecture</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Click any layer to see what it does.</p>
            <div className="space-y-1.5">
              {LAYERS.map(layer => (
                <LayerCard key={layer.id} layer={layer} active={false} />
              ))}
            </div>
          </div>

          {/* Run Log */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={16} className="text-[#FF8A00]" />
              <p className="section-title">Run Log</p>
            </div>
            {loading ? <LoadingSpinner /> : logs.length ? (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {logs.map(row => (
                  <div key={row.id}>
                    <button
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-left"
                    >
                      {row.status === "ok"
                        ? <CheckCircle size={13} className="text-[#00B341] shrink-0" />
                        : <XCircle    size={13} className="text-red-500 shrink-0" />}
                      <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex-1 truncate">{row.company}</span>
                      <span className="text-[10px] font-mono text-gray-400 shrink-0">{row.ticker}</span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">{row.run_at?.slice(0,16).replace("T"," ")}</span>
                    </button>
                    {expanded === row.id && (
                      <div className="mx-2 mb-1 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a]">
                        {row.error_msg && (
                          <p className="text-xs text-red-500 mb-2 font-mono">{row.error_msg}</p>
                        )}
                        {row.layers_json && (() => {
                          try {
                            const layers = JSON.parse(row.layers_json);
                            return (
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(layers).map(([k, v]) => (
                                  <div key={k} className="flex items-center gap-1.5">
                                    {v === "ok"
                                      ? <CheckCircle size={10} className="text-[#00B341]" />
                                      : v === "skipped"
                                      ? <Clock size={10} className="text-gray-400" />
                                      : <XCircle size={10} className="text-red-500" />}
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{k.replace("layer","L")}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No pipeline runs yet" sub="Run the scheduler or batch runner to see logs here." />}
          </div>
        </div>

        {/* How to run */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Play size={16} className="text-[#FF8A00]" />
            <p className="section-title">How to Run the Pipeline</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Run All Companies Once",
                cmd:   "python run_pipeline.py",
                desc:  "Processes all 134 companies from the CSV sequentially. Takes 2–4 hours. Saves progress so you can resume if interrupted."
              },
              {
                title: "Resume After Failure",
                cmd:   "python run_pipeline.py --resume",
                desc:  "Skips companies already completed in the last run. Use this after a crash or network interruption."
              },
              {
                title: "Start Daily Scheduler",
                cmd:   "python scheduler.py --run-now",
                desc:  "Starts the auto-scheduler. Runs every weekday at 18:30 IST (after NSE close). --run-now also triggers immediately."
              },
            ].map(({ title, cmd, desc }) => (
              <div key={title} className="p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a]">
                <p className="text-xs font-black text-gray-800 dark:text-gray-200 mb-2">{title}</p>
                <code className="block text-xs font-mono text-[#FFC224] bg-black px-3 py-2 rounded-2xl mb-2">{cmd}</code>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-[#FFC224]/10 border border-[#FFC224]/20 rounded-2xl">
            <p className="text-xs text-[#b38a00] dark:text-[#FFC224]">
              <span className="font-black">Run from:</span> <code className="font-mono">backend/</code> directory.
              Make sure <code className="font-mono">.env</code> has <code className="font-mono">SUPABASE_URL</code> and <code className="font-mono">SUPABASE_SERVICE_KEY</code> set.
              Install deps first: <code className="font-mono">pip install schedule supabase yfinance pandas numpy</code>
            </p>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
