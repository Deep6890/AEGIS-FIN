import React, { useEffect, useState, useCallback } from "react";
import {
  Activity, CheckCircle, XCircle, Clock, RefreshCw,
  Layers, Database, Play, ChevronDown, ChevronRight, Terminal
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import LoadingSpinner, { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchPipelineLog, fetchPipelineStats } from "../lib/api";

const LAYERS = [
  { id: 1, name: "Sector Engine",       desc: "Fetches OHLCV for 12 NSE sector indices from Yahoo Finance. Computes returns, volatility, ATR, drawdown, momentum, trend for every trading day." },
  { id: 2, name: "Sector Health",       desc: "Runs rolling z-scores on each sector's own history. Outputs health_score (0â€“100 percentile rank), signal (STRONG/NEUTRAL/WATCH/WEAK), regime (BULL/BEAR/NEUTRAL), spike detection." },
  { id: "2b", name: "Macro Overlay",    desc: "Derives daily macro regime from VIX, USD-INR, Gold, Crude Oil z-scores. RISK_OFF = multiple headwinds active. RISK_ON = tailwinds. Adjusts sector signals accordingly." },
  { id: 3, name: "Company Engine",      desc: "Fetches OHLCV for the company ticker. Computes the same 9 metric stems as sectors: returns (1d/5d/20d), volatility, ATR, drawdown, volume ratio, momentum, trend." },
  { id: 4, name: "Correlation Engine",  desc: "Builds static Pearson correlation matrix (company vs each sector) and full daily rolling correlation time-series for 20/60/100-day windows across all 8 metric stems." },
  { id: 5, name: "Sector Sift",         desc: "Ranks sectors by 60-day rolling correlation with the company. Top-N most correlated sectors are stored â€” these drive the sector overlay in layers 6 & 7." },
  { id: 6, name: "Balance Sheet",       desc: "Pulls 20 quarters of financial ratios from Yahoo Finance. Scores each ratio vs its own history (percentile rank), computes YoY change, applies sector pressure overlay from top correlated sectors." },
  { id: 7, name: "Holdings Engine",     desc: "Fetches shareholder data: HHI concentration, institutional holding %, promoter pledge. Applies sector health signal as overlay to adjust each metric's status." },
  { id: 8, name: "ML Survival Model",   desc: "Feeds 8 features (D/E, current ratio, revenue growth, equity growth, sector correlation 60d, sector health score, HHI, institutional holding) into a trained survival model. Outputs 0â€“100 score + distress probability." },
  { id: 9, name: "Feature Store",       desc: "Saves the exact 8 ML input features used for this run. Audit trail for model retraining and explainability. Stored per company per date." },
];

function LayerCard({ layer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-[#E5E1D8] dark:border-[#1F2128] rounded-xl overflow-hidden hover:border-[#E8C547]/30 dark:hover:border-[#E8C547]/20 transition-all duration-200">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        <div className="w-7 h-7 rounded-lg bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center text-xs font-black text-[#E8C547] dark:text-[#0D0D0D] shrink-0">
          {layer.id}
        </div>
        <span className="text-sm font-bold flex-1 text-[#0D0D0D] dark:text-[#E8E6E0]">{layer.name}</span>
        {open ? <ChevronDown size={14} className="text-[#E8C547]" /> : <ChevronRight size={14} className="text-[#9CA3AF]" />}
      </button>
      {open && (
        <div className="px-4 pb-3 animate-fade-in">
          <p className="text-xs text-[#6B7280] leading-relaxed">{layer.desc}</p>
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

  const total   = stats.length;
  const ok      = stats.filter(r => r.status === "ok").length;
  const errors  = stats.filter(r => r.status === "error").length;
  const lastRun = logs[0]?.run_at ? new Date(logs[0].run_at).toLocaleString("en-IN") : "â€”";
  const uniqueCompanies = new Set(stats.map(r => r.company)).size;

  const byDay = {};
  stats.forEach(r => {
    const d = r.run_at?.slice(0, 10);
    if (!d) return;
    if (!byDay[d]) byDay[d] = { date: d.slice(5), ok: 0, error: 0 };
    byDay[d][r.status === "ok" ? "ok" : "error"]++;
  });
  const chartData = Object.values(byDay).slice(-14);

  if (loading) return <PageLayout title="Pipeline Monitor"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Pipeline Monitor">
      <div className="space-y-5">

        {/* Hero */}
        <div className="card-ink p-6 relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8C547]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <p className="label text-[#E8C547] mb-1">AEGIS-FIN 9-Layer Pipeline</p>
            <p className="text-sm text-white/60 leading-relaxed max-w-xl">
              Every day after NSE market close, the scheduler processes{" "}
              <span className="font-bold text-[#E8C547]">134 SME companies</span> through all 9 layers.
              Takes ~2â€“4 hours depending on API rate limits.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Database,    label: "Total Runs",  value: total,           color: "card-ink p-5 rounded-2xl",   iconColor: "text-[#E8C547]", valueColor: "text-[#E8C547]" },
            { icon: CheckCircle, label: "Successful",   value: ok,             color: "card p-5 rounded-2xl",       iconColor: "text-[#52B788]", valueColor: "text-[#52B788]" },
            { icon: XCircle,     label: "Failed",       value: errors,         color: "card p-5 rounded-2xl",       iconColor: "text-red-400",   valueColor: "text-red-400" },
            { icon: Activity,    label: "Companies",    value: uniqueCompanies, color: "card p-5 rounded-2xl",      iconColor: "text-[#E8C547]", valueColor: "" },
          ].map(({ icon: Icon, label, value, color, iconColor, valueColor }) => (
            <div key={label} className={`${color} hover-lift`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={iconColor} />
                <p className="label">{label}</p>
              </div>
              <p className={`value-xl ${valueColor}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Last run + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <Clock size={13} />
            Last run: <span className="font-bold text-[#0D0D0D] dark:text-[#E8E6E0]">{lastRun}</span>
          </div>
          <button onClick={load} className="btn-ghost text-xs py-2 px-3">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Runs per day chart */}
        {chartData.length > 0 && (
          <div className="card p-5">
            <p className="title-md mb-1">Pipeline Runs (Last 14 Days)</p>
            <p className="text-xs text-[#9CA3AF] mb-4">Green = successful. Red = failed.</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                <Tooltip {...ct.tooltip} />
                <Bar dataKey="ok"    stackId="a" fill="#52B788" radius={[0,0,0,0]} name="OK" />
                <Bar dataKey="error" stackId="a" fill="#F87171" radius={[4,4,0,0]} name="Error" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Architecture */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-[#E8C547]" />
              <p className="title-md">9-Layer Architecture</p>
            </div>
            <div className="space-y-1.5">
              {LAYERS.map(layer => <LayerCard key={layer.id} layer={layer} />)}
            </div>
          </div>

          {/* Run Log */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={16} className="text-[#E8C547]" />
              <p className="title-md">Run Log</p>
            </div>
            {logs.length ? (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {logs.map(row => (
                  <div key={row.id}>
                    <button
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-[#F7F5F0] dark:hover:bg-[#22252E] transition-colors text-left"
                    >
                      {row.status === "ok"
                        ? <CheckCircle size={13} className="text-[#52B788] shrink-0" />
                        : <XCircle size={13} className="text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-[#0D0D0D] dark:text-[#E8E6E0] flex-1 truncate">{row.company}</span>
                      <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0">{row.ticker}</span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-1">{row.run_at?.slice(0,16).replace("T"," ")}</span>
                    </button>
                    {expanded === row.id && (
                      <div className="mx-2 mb-1 p-3 bg-[#F7F5F0] dark:bg-[#111318] rounded-xl border border-[#E5E1D8] dark:border-[#1F2128] animate-fade-in">
                        {row.error_msg && <p className="text-xs text-red-400 mb-2 font-mono">{row.error_msg}</p>}
                        {row.layers_json && (() => {
                          try {
                            const layers = JSON.parse(row.layers_json);
                            return (
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(layers).map(([k, v]) => (
                                  <div key={k} className="flex items-center gap-1.5">
                                    {v === "ok"
                                      ? <CheckCircle size={10} className="text-[#52B788]" />
                                      : v === "skipped"
                                      ? <Clock size={10} className="text-[#9CA3AF]" />
                                      : <XCircle size={10} className="text-red-400" />}
                                    <span className="text-[10px] text-[#6B7280] truncate">{k.replace("layer","L")}</span>
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
            ) : <EmptyState title="No pipeline runs yet" sub="Run the scheduler or batch runner." />}
          </div>
        </div>

        {/* How to run */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Play size={16} className="text-[#E8C547]" />
            <p className="title-md">How to Run the Pipeline</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Run All Companies Once", cmd: "python run_pipeline.py", desc: "Processes all 134 companies sequentially. Takes 2â€“4 hours." },
              { title: "Resume After Failure",   cmd: "python run_pipeline.py --resume", desc: "Skips completed companies. Use after crash or network error." },
              { title: "Start Daily Scheduler",  cmd: "python scheduler.py --run-now", desc: "Auto-runs every weekday at 18:30 IST after NSE close." },
            ].map(({ title, cmd, desc }) => (
              <div key={title} className="p-4 bg-[#F7F5F0] dark:bg-[#111318] rounded-2xl border border-[#E5E1D8] dark:border-[#1F2128] hover-lift">
                <p className="text-xs font-bold text-[#0D0D0D] dark:text-[#E8E6E0] mb-2">{title}</p>
                <code className="block text-xs font-mono text-[#E8C547] bg-[#0D0D0D] px-3 py-2 rounded-xl mb-2">{cmd}</code>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 insight-box">
            <p className="text-xs text-[#8B6914] dark:text-[#E8C547]">
              <span className="font-bold">Run from:</span> <code className="font-mono">backend/</code> directory.
              Make sure <code className="font-mono">.env</code> is set.
            </p>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}


