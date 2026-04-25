import React, { useEffect, useState, useCallback } from "react";
import {
  Activity, CheckCircle, XCircle, Clock, RefreshCw,
  Layers, Database, Play, ChevronDown, ChevronRight, Terminal,
  Building2, TrendingUp, Brain, GitBranch, ShieldAlert, Users, Globe
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import { PageSkeleton } from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useChartTheme } from "../hooks/useChartTheme";
import { useAppData } from "../context/AppDataContext";
import { supabase } from "../lib/supabase";

/* ── 9-Layer architecture descriptions ─────────────────────────────────────── */
const LAYERS = [
  { id: 1,    name: "Sector Engine",      icon: TrendingUp,  desc: "Fetches OHLCV for all 14 sector/macro indices from Yahoo Finance. Computes daily returns, EMA, trend, volatility, ATR, momentum." },
  { id: 2,    name: "Sector Health",      icon: Activity,    desc: "Runs rolling z-scores on each sector's own 60-day history. Outputs health_score (0–100 percentile rank), signal (STRONG/NEUTRAL/WATCH/WEAK), regime, spike detection." },
  { id: "2b", name: "Macro Overlay",      icon: Globe,       desc: "Derives daily macro regime from VIX, USD-INR, Gold, Crude Oil z-scores. RISK_OFF = multiple headwinds. RISK_ON = tailwinds." },
  { id: 3,    name: "Company Engine",     icon: Building2,   desc: "Fetches OHLCV for the company ticker. Computes the same health metrics as sectors: returns, volatility, ATR, drawdown, momentum, trend." },
  { id: 4,    name: "Correlation Engine", icon: GitBranch,   desc: "Builds Pearson correlation matrix (company vs each sector) and full daily rolling correlation time-series for 20/60/100-day windows." },
  { id: 5,    name: "Sector Sift",        icon: TrendingUp,  desc: "Ranks sectors by 60-day rolling correlation with the company. Top-N most correlated sectors drive the sector overlay in layers 6 & 7." },
  { id: 6,    name: "Balance Sheet",      icon: ShieldAlert, desc: "Pulls 20 quarters of financial ratios. Scores each ratio vs its own history (percentile rank), computes YoY change, applies sector pressure overlay." },
  { id: 7,    name: "Holdings Engine",    icon: Users,       desc: "Fetches shareholder data: HHI concentration, institutional holding %, insider ownership. Applies sector health signal as overlay." },
  { id: 8,    name: "ML Classifier",      icon: Brain,       desc: "Feeds features into a CatBoost classifier. Outputs composite_score (0–100), composite_tier (TIER_1–4), composite_grade (A–F), and dimension scores." },
  { id: 9,    name: "Feature Store",      icon: Database,    desc: "Saves the exact ML input features used for this run. Audit trail for model retraining and explainability. Stored per company per date." },
];

function LayerCard({ layer }) {
  const [open, setOpen] = useState(false);
  const Icon = layer.icon;
  return (
    <div className={`border border-[var(--border)] rounded-2xl overflow-hidden transition-all duration-200 ${open ? "border-[var(--orange)]/30" : "hover:border-[var(--orange)]/20"}`}
      style={{ background: "var(--surface)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3.5 text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
          style={{ background: open ? "var(--orange)" : "rgba(0,0,0,0.05)", color: open ? "white" : "var(--text-3)" }}>
          {layer.id}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon size={14} className={open ? "text-[var(--orange)]" : "text-[var(--text-3)]"} />
          <span className="text-sm font-semibold text-[var(--text)] truncate">{layer.name}</span>
        </div>
        {open ? <ChevronDown size={14} className="text-[var(--orange)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--text-3)] shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <p className="text-xs text-[var(--text-2)] leading-relaxed">{layer.desc}</p>
        </div>
      )}
    </div>
  );
}

export default function PipelineMonitor() {
  const { companies, sectors, latestMl, portfolioStats } = useAppData();
  const ct = useChartTheme();
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Get real counts from DB
      const [
        classifierRes, correlationRes, ohlcvHealthRes,
        sectorHealthRes, bsRatiosRes, holdingRes
      ] = await Promise.all([
        supabase.from("classifier").select("*", { count: "exact", head: true }),
        supabase.from("correlation").select("*", { count: "exact", head: true }),
        supabase.from("ohlcv_health").select("*", { count: "exact", head: true }),
        supabase.from("sector_health").select("*", { count: "exact", head: true }),
        supabase.from("balance_sheet_ratios").select("*", { count: "exact", head: true }),
        supabase.from("stock_holding").select("*", { count: "exact", head: true }),
      ]);

      // Get latest classifier run date
      const latestRun = await supabase.from("classifier").select("date").order("date", { ascending: false }).limit(1);

      setDbStats({
        classifierRows:   classifierRes.count || 0,
        correlationRows:  correlationRes.count || 0,
        ohlcvHealthRows:  ohlcvHealthRes.count || 0,
        sectorHealthRows: sectorHealthRes.count || 0,
        bsRatiosRows:     bsRatiosRes.count || 0,
        holdingRows:      holdingRes.count || 0,
        lastRunDate:      latestRun.data?.[0]?.date || null,
        companiesScored:  latestMl.length,
      });
    } catch (e) {
      console.error("Pipeline stats error:", e);
    } finally {
      setLoading(false);
    }
  }, [latestMl]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Score distribution from real data
  const bucketData = [
    { label: "0–20",   count: latestMl.filter(r => (r.composite_score || 0) < 20).length,  fill: "#D1D5DB" },
    { label: "20–40",  count: latestMl.filter(r => (r.composite_score || 0) >= 20 && (r.composite_score || 0) < 40).length, fill: "#9CA3AF" },
    { label: "40–60",  count: latestMl.filter(r => (r.composite_score || 0) >= 40 && (r.composite_score || 0) < 60).length, fill: "var(--orange)" },
    { label: "60–80",  count: latestMl.filter(r => (r.composite_score || 0) >= 60 && (r.composite_score || 0) < 80).length, fill: "var(--orange)" },
    { label: "80–100", count: latestMl.filter(r => (r.composite_score || 0) >= 80).length, fill: "var(--orange)" },
  ];

  if (loading) return <PageLayout title="Pipeline"><PageSkeleton /></PageLayout>;

  return (
    <PageLayout title="Pipeline">
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--orange)] mb-2">Intelligence Engine</p>
          <h1 className="page-heading">9-Layer Pipeline</h1>
          <p className="page-subheading">
            AEGIS-FIN processes companies through 9 analytical layers — from raw OHLCV to ML classification.
            Run daily after NSE market close.
          </p>
        </div>

        {/* ── Live DB stats ─────────────────────────────────────────────── */}
        <div className="glass-card p-6 relative overflow-hidden stagger-1">
          <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-[var(--orange)]/6 blur-[60px] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="label-caps mb-1">Live Database Status</p>
                <p className="text-xs text-[var(--text-3)]">
                  {dbStats?.lastRunDate ? `Last pipeline run: ${dbStats.lastRunDate}` : "No pipeline runs yet"}
                </p>
              </div>
              <button onClick={loadStats} className="btn-ghost text-xs py-2 px-3">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Companies",       value: companies.length,              icon: Building2,  sub: "in database" },
                { label: "Sectors",         value: sectors.length,                icon: TrendingUp, sub: "tracked" },
                { label: "Scored",          value: dbStats?.companiesScored || 0, icon: Brain,      sub: "classifier rows", accent: true },
                { label: "Sector Health",   value: dbStats?.sectorHealthRows || 0,icon: Activity,   sub: "daily rows" },
                { label: "OHLCV Health",    value: dbStats?.ohlcvHealthRows || 0, icon: Database,   sub: "company rows" },
                { label: "Balance Sheet",   value: dbStats?.bsRatiosRows || 0,    icon: ShieldAlert,sub: "ratio rows" },
                { label: "Holdings",        value: dbStats?.holdingRows || 0,     icon: Users,      sub: "metric rows" },
                { label: "Correlations",    value: dbStats?.correlationRows || 0, icon: GitBranch,  sub: "JSONB rows" },
              ].map(({ label, value, icon: Icon, sub, accent }) => (
                <div key={label} className={`p-4 rounded-2xl border ${accent ? "border-[var(--orange)]/30 bg-[var(--orange)]/5" : "border-[var(--border)] bg-neutral-50 dark:bg-neutral-900/60"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} className={accent ? "text-[var(--orange)]" : "text-[var(--text-3)]"} />
                    <p className="label-caps">{label}</p>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${accent ? "text-[var(--orange)]" : "text-[var(--text)]"}`}>{value.toLocaleString()}</p>
                  <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Portfolio score distribution ──────────────────────────────── */}
        {latestMl.length > 0 && (
          <div className="card p-6 stagger-2">
            <p className="title-md mb-1">Score Distribution</p>
            <p className="text-xs text-[var(--text-3)] mb-5">
              Composite score distribution across {latestMl.length} scored companies. Based on real classifier data.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl text-center">
                <p className="label-caps mb-1">Avg Score</p>
                <p className="text-xl font-bold text-[var(--orange)]">{portfolioStats.avgSurvival}</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl text-center">
                <p className="label-caps mb-1">Healthy ≥70</p>
                <p className="text-xl font-bold text-[var(--text)]">{portfolioStats.healthy}</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl text-center">
                <p className="label-caps mb-1">Watch 40–70</p>
                <p className="text-xl font-bold text-[var(--text)]">{portfolioStats.watch}</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl text-center">
                <p className="label-caps mb-1">Distress &lt;40</p>
                <p className="text-xl font-bold text-[var(--text)]">{portfolioStats.distress}</p>
              </div>
            </div>
            {bucketData.some(b => b.count > 0) && (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="2 4" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: ct.tick }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip {...ct.tooltip} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {bucketData.map((b, i) => (
                      <rect key={i} fill={b.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Two column: Architecture + Scored companies ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-3">

          {/* 9-Layer Architecture */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-[var(--orange)]" />
              <p className="title-md">9-Layer Architecture</p>
            </div>
            <p className="text-xs text-[var(--text-3)] mb-4">Click any layer to see what it does.</p>
            <div className="space-y-1.5">
              {LAYERS.map(layer => <LayerCard key={layer.id} layer={layer} />)}
            </div>
          </div>

          {/* Scored companies */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-[var(--orange)]" />
              <p className="title-md">Scored Companies</p>
            </div>
            <p className="text-xs text-[var(--text-3)] mb-4">
              {latestMl.length > 0
                ? `${latestMl.length} companies have been scored by the ML classifier.`
                : "No companies scored yet. Run the pipeline to generate scores."}
            </p>
            {latestMl.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {[...latestMl]
                  .sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0))
                  .map(r => {
                    const c = companies.find(co => co.id === r.company_id);
                    const score = r.composite_score;
                    const tier  = r.composite_tier;
                    const grade = r.composite_grade;
                    return (
                      <div key={r.id || r.company_id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-[var(--border)]">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "var(--orange)", color: "white" }}>
                          {grade || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">{c?.name || r.company_id?.slice(0, 8)}</p>
                          <p className="text-[10px] font-mono text-[var(--text-3)]">{c?.ticker} · {tier}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${Math.min(100, score || 0)}%` }} />
                          </div>
                          <span className="text-sm font-bold tabular-nums text-[var(--text)] w-8 text-right">{score?.toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <EmptyState title="No scores yet" sub="Run the pipeline to generate ML scores for all companies." />
            )}
          </div>
        </div>

        {/* ── How to run ────────────────────────────────────────────────── */}
        <div className="card p-6 stagger-4">
          <div className="flex items-center gap-2 mb-4">
            <Play size={16} className="text-[var(--orange)]" />
            <p className="title-md">How to Run the Pipeline</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Seed History (First Time)",
                cmd:   "python seed_history.py",
                desc:  "One-time setup. Fetches 3 years of OHLCV for all sectors and companies, runs all 9 layers.",
                path:  "backend/Services/LogicEngine/"
              },
              {
                title: "Run Daily Pipeline",
                cmd:   "python -c \"from LogicEngine.pipeline import run_sectors, run_batch; ...\"",
                desc:  "Fetches today's data, runs all layers, updates DB. Run after NSE market close.",
                path:  "backend/Services/LogicEngine/"
              },
              {
                title: "Onboard New Companies",
                cmd:   "python csv_onboard.py companies.csv",
                desc:  "Add new companies from a CSV file. Fetches history and runs full pipeline.",
                path:  "backend/Services/LogicEngine/"
              },
            ].map(({ title, cmd, desc, path }) => (
              <div key={title} className="p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl border border-[var(--border)] hover-lift">
                <p className="text-xs font-bold text-[var(--text)] mb-2">{title}</p>
                <code className="block text-[10px] font-mono text-[var(--orange)] bg-neutral-900 dark:bg-black px-3 py-2 rounded-xl mb-2 overflow-x-auto">{cmd}</code>
                <p className="text-[10px] text-[var(--text-3)] leading-relaxed mb-1">{desc}</p>
                <p className="text-[9px] font-mono text-[var(--text-3)] opacity-60">Run from: {path}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 insight-box">
            <p className="text-xs">
              <span className="font-bold">Schema:</span> New v2 schema uses{" "}
              <code className="font-mono">classifier</code>,{" "}
              <code className="font-mono">correlation</code>,{" "}
              <code className="font-mono">ohlcv_health</code>,{" "}
              <code className="font-mono">sector_health</code>,{" "}
              <code className="font-mono">balance_sheet_ratios</code>,{" "}
              <code className="font-mono">stock_holding</code>.
              Make sure <code className="font-mono">.env</code> has <code className="font-mono">SUPABASE_URL</code> and <code className="font-mono">SUPABASE_KEY</code>.
            </p>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
