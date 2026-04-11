import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle,
  Eye, Zap, Globe, Activity, Info, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, HelpCircle, Layers
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid,
} from "recharts";
import PageLayout from "../components/Layout/PageLayout";
import StatCard from "../components/ui/StatCard";
import SignalBadge from "../components/ui/SignalBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import LiveMarketBar from "../components/ui/LiveMarketBar";
import { useAppData } from "../context/AppDataContext";
import { useChartTheme } from "../hooks/useChartTheme";
import { fetchMacroOverlay, fetchLatestSectorMetrics } from "../lib/api";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const SIGNAL_COLOR = {
  STRONG: "#10b981",
  NEUTRAL: "#6b7280",
  WATCH: "#f59e0b",
  WEAK: "#ef4444",
  INSUFFICIENT_DATA: "#374151",
};

const PIPELINE_STEPS = [
  {
    num: "01",
    name: "Market Data Ingestion",
    short: "Live OHLCV fetch",
    detail:
      "Every trading day, AEGIS fetches OHLCV (Open, High, Low, Close, Volume) data for all tracked companies and all 9 sector indices from NSE via the data pipeline. This is the raw fuel for everything downstream. If a company misses 3+ consecutive days, it is flagged as stale and excluded from that day's scoring run.",
  },
  {
    num: "02",
    name: "Price Metric Computation",
    short: "Returns, momentum, slope",
    detail:
      "From raw OHLCV the pipeline computes: 1-day, 5-day, 20-day returns (how much did the price move?), rolling volatility (how wild is it?), price slope (is the trend up or down?), and momentum score (rate of change vs its own 60-day history). These become the first layer of inputs to the ML model.",
  },
  {
    num: "03",
    name: "Rolling Z-Score Windows",
    short: "Normalise across sectors",
    detail:
      "Each metric is z-scored against its own 60-day rolling window. Z-score = (today's value − 60-day mean) ÷ 60-day standard deviation. This normalises across sectors with different volatility profiles — a 2% move in Banking is very different from a 2% move in FMCG. Z-scores above +2 or below −2 are considered outliers and trigger spike flags.",
  },
  {
    num: "04",
    name: "Balance Sheet Ratios",
    short: "8 financial health signals",
    detail:
      "Quarterly financial data is ingested and 8 ratios are computed per company: Debt-to-Equity, Interest Coverage Ratio, Current Ratio, EBITDA Margin, Return on Equity, Asset Turnover, Cash Flow to Debt, and Working Capital Ratio. These capture whether a company can service its debts, generate cash, and sustain operations — the core of financial health assessment.",
  },
  {
    num: "05",
    name: "Shareholder Pattern Analysis",
    short: "Promoter pledges & FII flows",
    detail:
      "The pipeline tracks promoter holding %, promoter pledge %, FII/DII flow direction, and change in institutional ownership QoQ. Rising promoter pledges above 40% are a major red flag — it signals the promoter is using shares as collateral, often under financial duress. Increasing institutional ownership is a positive signal.",
  },
  {
    num: "06",
    name: "Macro Overlay",
    short: "VIX · INR · Gold · Crude",
    detail:
      "Four macro signals are pulled daily and z-scored: VIX (India VIX or CBOE — fear gauge), USD-INR rate (currency weakness = FII outflow risk), Gold price (safe-haven demand = risk-off signal), and Brent Crude (input cost inflation risk). The composite z-score of these four becomes the macro score that adjusts all company scores based on the external environment.",
  },
  {
    num: "07",
    name: "Sector Health Classification",
    short: "Signal assignment per index",
    detail:
      "Each sector gets a composite health score (0–100) — a rolling percentile rank of its composite z-score vs its own 60-day history. 100 = historically strongest day; 0 = historically weakest. From this a signal is assigned: STRONG (top 25%), NEUTRAL (middle 50%), WATCH (lower 25%), WEAK (bottom 10%). Companies in WEAK sectors receive a macro-context penalty to their survival score.",
  },
  {
    num: "08",
    name: "ML Survival Model",
    short: "CatBoost gradient boosting",
    detail:
      "A CatBoost gradient boosting model trained on historical NSE company data is the core engine. It ingests ~40 computed features and outputs a probability of financial distress over the next 12 months. This probability is inverted and scaled: survival_score = (1 − distress_prob) × 100. The model is re-trained quarterly on updated historical data.",
  },
  {
    num: "09",
    name: "Score Output",
    short: "0–100 per company daily",
    detail:
      "The final survival score is a 0–100 value per company, updated each trading day. 70+ = low distress risk, fundamentally strong. 40–70 = watch zone, at least one warning signal. Below 40 = high distress risk, review immediately. The score is stored in Supabase and drives all downstream views: company pages, sector tables, and portfolio-level aggregations.",
  },
];

const FORMULA_COMPONENTS = [
  {
    label: "Price momentum",
    weight: "25%",
    detail:
      "Rolling 5-day and 20-day return z-scores, momentum rate-of-change, and price slope vs 60-day trend. Strong positive momentum contributes positively; negative or decelerating momentum reduces the survival score.",
  },
  {
    label: "Balance sheet",
    weight: "30%",
    detail:
      "The largest weight. Includes Debt/Equity, Interest Coverage, Current Ratio, EBITDA Margin, and Cash Flow/Debt ratio. Poor balance sheet is the #1 predictor of distress in the training data — hence the highest weight.",
  },
  {
    label: "Sector context",
    weight: "20%",
    detail:
      "The sector's own health score acts as a contextual modifier. A fundamentally healthy company in a WEAK sector gets a score haircut; a moderately healthy company in a STRONG sector gets a mild boost. Rising tide lifts all boats — but a sinking tide hurts everyone.",
  },
  {
    label: "Macro overlay",
    weight: "15%",
    detail:
      "The composite macro z-score (VIX + INR + Gold + Crude) is applied as a portfolio-level adjustment. In RISK_OFF macro regimes all scores receive a systematic downward nudge — because even healthy companies face liquidity and valuation pressure in macro stress.",
  },
  {
    label: "Shareholder",
    weight: "10%",
    detail:
      "Promoter pledge % above 40% applies a score penalty. Rising FII ownership is a mild positive signal. High promoter pledging is historically the strongest early warning signal for stock-specific blowups in the NSE mid-cap space.",
  },
];

const SIGNAL_EXPLAIN = {
  STRONG:
    "Top quartile of the sector's own momentum history. All indicators (return, volatility, slope, composite) are positively aligned. Consider overweighting stocks in this sector.",
  NEUTRAL:
    "Neither clear strength nor weakness. Mixed signals from the composite z-score. Hold existing positions; don't add aggressively.",
  WATCH:
    "At least one signal is deteriorating — momentum softening or volatility rising. The sector hasn't broken down yet but warrants close monitoring over the next 5–10 trading days.",
  WEAK:
    "Bottom quartile of the sector's own history. Returns are negative, volatility elevated, and momentum declining. Avoid adding exposure; existing positions should be reviewed.",
};

const KPI_INSIGHT = {
  total:
    "Total companies currently tracked across all NSE sectors. Each one gets its own survival score and is re-evaluated every trading day using fresh market data.",
  healthy:
    "Survival score ≥ 70 means the ML model assigns less than 30% probability of financial distress within 12 months. Low leverage, positive cash flow, stable share ownership, and momentum-positive sector context.",
  watch:
    "Score 40–70. Not yet in distress but showing at least one warning signal — rising leverage, sector weakness, or declining momentum. Monitor over the next 30–60 days.",
  distress:
    "Survival score below 40. The ML model has flagged these as high-probability distress candidates. Common triggers: debt-to-equity above sector norms, negative EBITDA trend, or promoter pledging above 50%.",
  avgSurvival:
    "Mean survival score across all ML-scored companies. Above 60 = healthy portfolio. Values below 55 signal portfolio-wide stress — often correlated with broad market drawdowns or macro risk-off periods.",
  sectors:
    "NSE sector indices monitored: Bank Nifty, IT, Auto, Metal, Realty, FMCG, Pharma, Energy + macro overlay. Each sector's health score is computed from rolling z-scores of returns, volatility, momentum and price slope vs its own 60-day history.",
  macroRegimeRiskOn:
    "Macro tailwinds present — low volatility, stable rupee, and supportive commodity prices. Positive composite z-score. Constructive environment for risk assets.",
  macroRegimeRiskOff:
    "Multiple macro headwinds active — VIX elevated, INR weak, or crude rising. Risk assets under pressure. Consider defensive positioning and tighter stop-losses.",
  macroRegimeNeutral:
    "Macro environment is balanced. No strong directional signal from VIX, USD-INR, Gold or Crude. Composite z-score between −1 and +1. Stock-selection drives alpha from here.",
  macroScore:
    "Composite of VIX, USD-INR, Gold and Crude z-scores. Formula: mean of (VIX_z, INR_z, Gold_z, Crude_z). Negative = risk-off pressure. Positive = risk-on tailwind. Values between −1 and +1 are neutral.",
};

/* ─────────────────────────────────────────────
   Small reusable pieces
───────────────────────────────────────────── */

/** Orange insight box — replaces the original InsightBox */
function InsightBox({ icon: Icon = Info, title, children }) {
  return (
    <div className="flex gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
      <Icon size={15} className="text-orange-500 shrink-0 mt-0.5" />
      <div>
        {title && (
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-0.5">
            {title}
          </p>
        )}
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

/** Inline tooltip that appears on hover */
function Tooltip2({ text, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className="absolute z-50 bottom-full left-0 mb-2 w-64 p-2.5 rounded-lg text-xs leading-relaxed
            bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-[#2a2a2a]
            text-gray-600 dark:text-gray-400 shadow-lg pointer-events-none"
          style={{ minWidth: 220 }}
        >
          {text}
          <span className="absolute top-full left-4 w-2 h-2 bg-white dark:bg-[#1c1c1c] border-r border-b border-gray-100 dark:border-[#2a2a2a] rotate-45 -mt-1" />
        </span>
      )}
    </span>
  );
}

/** KPI card with hover-reveal explainer */
function ExplainableStatCard({ icon: Icon, label, value, sub, color = "orange", insightText }) {
  const [showInsight, setShowInsight] = useState(false);

  const colorMap = {
    orange: { icon: "bg-orange-50  dark:bg-orange-950/30  text-orange-500", bar: "bg-orange-400", border: "border-orange-200 dark:border-orange-900/40" },
    emerald: { icon: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500", bar: "bg-emerald-400", border: "border-emerald-200 dark:border-emerald-900/40" },
    amber: { icon: "bg-amber-50   dark:bg-amber-950/30   text-amber-500", bar: "bg-amber-400", border: "border-amber-200   dark:border-amber-900/40" },
    red: { icon: "bg-red-50     dark:bg-red-950/30     text-red-500", bar: "bg-red-400", border: "border-red-200     dark:border-red-900/40" },
    blue: { icon: "bg-blue-50    dark:bg-blue-950/30    text-blue-500", bar: "bg-blue-400", border: "border-blue-200    dark:border-blue-900/40" },
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div
      className={`card p-4 cursor-pointer group transition-all duration-200 ${showInsight ? `border ${c.border}` : ""}`}
      onClick={() => setShowInsight((v) => !v)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon size={15} />
        </div>
        <HelpCircle
          size={13}
          className={`mt-0.5 transition-colors ${showInsight ? "text-orange-400" : "text-gray-300 dark:text-gray-600 group-hover:text-gray-400"}`}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}

      {showInsight && (
        <div className="mt-3 pt-3 border-t border-orange-100 dark:border-orange-900/30">
          <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">{insightText}</p>
        </div>
      )}

      {!showInsight && (
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 group-hover:text-gray-400 dark:group-hover:text-gray-500">
          Click to explain
        </p>
      )}
    </div>
  );
}

/** Expandable row detail for sector table */
function SectorRow({ row }) {
  const [open, setOpen] = useState(false);

  const regimeText = {
    BULL: "Sector momentum is trending positively. Price slope and rolling returns are above the 60-day mean. BULL regime typically persists for 10–20 sessions before reverting — watch for weakening breadth as a leading indicator of regime change.",
    BEAR: "Sector momentum is trending negatively. Rolling returns and slope are below the 60-day mean. In BEAR regime, individual stock picks within this sector carry an additional headwind from the broad sector trend.",
    RANGE: "Sector is oscillating without directional commitment. Returns are inside the normal volatility band with no sustained slope. Range-bound sectors offer lower alpha unless you're targeting mean-reversion trades.",
  };

  const healthColor =
    row.health_score >= 70 ? "bg-emerald-400" : row.health_score >= 40 ? "bg-orange-400" : "bg-red-400";

  const compositeExplain =
    row.composite != null
      ? row.composite > 1
        ? "Strong positive composite — multiple indicators aligned bullishly."
        : row.composite < -1
          ? "Negative composite — multiple indicators aligned bearishly. Down-pressure on sector."
          : "Composite near zero — mixed or flat indicators. No strong directional signal."
      : null;

  return (
    <>
      <tr
        className="tr-base cursor-pointer hover:bg-orange-50/40 dark:hover:bg-orange-950/10 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="td-base">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 dark:text-white text-xs">
              {row.sectors?.name || `Sector ${row.sector_id}`}
            </span>
            {open ? (
              <ChevronUp size={11} className="text-orange-400 shrink-0" />
            ) : (
              <ChevronDown size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />
            )}
          </div>
        </td>
        <td className="td-base">
          <SignalBadge value={row.signal} />
        </td>
        <td className="td-base">
          <SignalBadge value={row.regime} />
        </td>
        <td className="td-base">
          {row.health_score != null ? (
            <div className="flex items-center gap-2">
              <div className="w-14 h-1.5 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${healthColor}`}
                  style={{ width: `${Math.min(100, row.health_score)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {row.health_score.toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">warming up</span>
          )}
        </td>
        <td className="td-base text-xs text-gray-600 dark:text-gray-400">{row.trend || "—"}</td>
        <td className="td-base text-xs font-mono text-gray-600 dark:text-gray-400">
          {row.composite != null ? row.composite.toFixed(2) : "—"}
        </td>
        <td className="td-base">
          <div className="flex gap-1">
            {row.spike_up && <span className="badge-green">↑ Up</span>}
            {row.spike_down && <span className="badge-red">↓ Down</span>}
            {!row.spike_up && !row.spike_down && (
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
            )}
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-orange-50/30 dark:bg-orange-950/10 border-b border-orange-100 dark:border-orange-900/20">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Health score breakdown */}
              <div className="bg-white dark:bg-[#111] rounded-lg border border-orange-100 dark:border-orange-900/30 p-3">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1.5">
                  Health Score — {row.health_score?.toFixed(1) ?? "N/A"}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {row.health_score != null
                    ? row.health_score >= 70
                      ? `Score ${row.health_score.toFixed(1)} places this sector in the top quartile of its own 60-day history. The sector has shown above-average composite z-score readings consistently. This is a positive context for individual stock picks within this sector.`
                      : row.health_score >= 40
                        ? `Score ${row.health_score.toFixed(1)} is in the middle band — sector health is neither strong nor weak vs its own history. Individual stock fundamentals matter more than sector tailwind here.`
                        : `Score ${row.health_score.toFixed(1)} is below the 40th percentile of this sector's own history. This acts as a headwind for stocks in this sector — even fundamentally strong names may underperform if the sector weakness persists.`
                    : "Not enough data yet. Health scoring requires at least 60 days of trading history to compute meaningful percentile ranks."}
                </p>
              </div>

              {/* Regime explanation */}
              {row.regime && (
                <div className="bg-white dark:bg-[#111] rounded-lg border border-orange-100 dark:border-orange-900/30 p-3">
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1.5">
                    Regime — {row.regime}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {regimeText[row.regime] || `Regime ${row.regime}: current market conditions are defining how this sector behaves relative to the broader index.`}
                  </p>
                </div>
              )}

              {/* Composite z + spikes */}
              <div className="bg-white dark:bg-[#111] rounded-lg border border-orange-100 dark:border-orange-900/30 p-3">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1.5">
                  Composite Z-Score{row.composite != null ? ` — ${row.composite.toFixed(2)}` : ""}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                  {compositeExplain ?? "Composite z-score not yet available for this sector."}
                </p>
                {(row.spike_up || row.spike_down) && (
                  <div className={`mt-1 text-xs font-medium rounded px-2 py-1 ${row.spike_up ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"}`}>
                    {row.spike_up
                      ? "↑ Up-spike: today's return exceeded the sector's rolling 95th percentile — a potential breakout. Watch for follow-through volume."
                      : "↓ Down-spike: today's return fell below the rolling 5th percentile — a sharp selloff. Check for news catalyst before adding exposure."}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Signal distribution cell with inline explanation */
function SignalCell({ name, value }) {
  const [open, setOpen] = useState(false);
  const bg = {
    STRONG: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
    NEUTRAL: "bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#2a2a2a]",
    WATCH: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
    WEAK: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
  };
  return (
    <div
      className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${bg[name] || bg.NEUTRAL} ${open ? "ring-1 ring-orange-300 dark:ring-orange-700" : ""}`}
      onClick={() => setOpen((v) => !v)}
    >
      <p className="text-2xl font-bold" style={{ color: SIGNAL_COLOR[name] }}>
        {value}
      </p>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{name}</p>
      {open && (
        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-2 text-center leading-relaxed border-t border-current/10 pt-2">
          {SIGNAL_EXPLAIN[name]}
        </p>
      )}
      {!open && (
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">tap to explain</p>
      )}
    </div>
  );
}

/** Collapsible pipeline explainer */
function PipelineExplainer() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(null);

  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={15} className="text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
            How AEGIS-FIN Works — 9-Layer Intelligence Engine
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            AEGIS-FIN fetches live market data, computes price metrics, balance sheet ratios, macro signals, and feeds them into an ML survival model.
            The result: a{" "}
            <span className="font-semibold text-orange-500">0–100 survival score</span>{" "}
            per company — 100 = financially strongest, 0 = highest distress risk.
          </p>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-orange-400 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        )}
      </button>

      {/* Pipeline steps */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* Step pills */}
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(activeStep === i ? null : i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeStep === i
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-[#111] border-orange-100 dark:border-orange-900/30 text-gray-600 dark:text-gray-400 hover:border-orange-300 dark:hover:border-orange-700"
                  }`}
              >
                <span className={`text-[10px] font-mono ${activeStep === i ? "text-orange-200" : "text-orange-400"}`}>
                  {s.num}
                </span>
                {s.name}
              </button>
            ))}
          </div>

          {/* Active step detail */}
          {activeStep !== null && (
            <div className="bg-white dark:bg-[#111] rounded-lg border border-orange-200 dark:border-orange-900/40 p-3">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1.5">
                Step {PIPELINE_STEPS[activeStep].num} — {PIPELINE_STEPS[activeStep].name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {PIPELINE_STEPS[activeStep].detail}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Interactive survival score formula */
function SurvivalScoreFormula() {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <p className="section-title">Survival Score — How It's Computed</p>
        <Tooltip2 text="Click any component to understand what it measures and why it's weighted that way.">
          <HelpCircle size={13} className="text-gray-400 cursor-help" />
        </Tooltip2>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Each company receives a 0–100 score from a CatBoost ML survival model. Click any component below to see what it measures.
      </p>

      {/* Formula row */}
      <div className="flex flex-wrap items-center gap-2">
        {FORMULA_COMPONENTS.map((fc, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all text-center ${activeIdx === i
                  ? "bg-orange-500 border-orange-500"
                  : "bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#2a2a2a] hover:border-orange-300 dark:hover:border-orange-700"
                }`}
            >
              <span className={`text-[10px] font-medium ${activeIdx === i ? "text-orange-200" : "text-gray-400 dark:text-gray-500"}`}>
                {fc.label}
              </span>
              <span className={`text-lg font-bold mt-0.5 ${activeIdx === i ? "text-white" : "text-orange-500"}`}>
                {fc.weight}
              </span>
            </button>
            {i < FORMULA_COMPONENTS.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 font-light text-lg">+</span>
            )}
          </React.Fragment>
        ))}
        <span className="text-gray-300 dark:text-gray-600 font-light text-lg">=</span>
        <div className="flex flex-col items-center px-3 py-2.5 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 text-center">
          <span className="text-[10px] font-medium text-orange-400">survival score</span>
          <span className="text-lg font-bold text-orange-500 mt-0.5">0–100</span>
        </div>
      </div>

      {/* Active component detail */}
      {activeIdx !== null && (
        <div className="mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
            {FORMULA_COMPONENTS[activeIdx].label} ({FORMULA_COMPONENTS[activeIdx].weight})
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {FORMULA_COMPONENTS[activeIdx].detail}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
export default function Dashboard() {
  const { companies, latestSectorHealth, macro, portfolioStats, loading } =
    useAppData();
  const [macroHistory, setMacroHistory] = useState([]);
  const [sectorMetrics, setSectorMetrics] = useState([]);
  const ct = useChartTheme();

  useEffect(() => {
    fetchMacroOverlay(60).then((r) => setMacroHistory(r.data || []));
    fetchLatestSectorMetrics().then((r) => setSectorMetrics(r.data || []));
  }, []);

  const latestMetrics = useMemo(() => {
    const seen = new Map();
    for (const row of sectorMetrics) {
      if (!seen.has(row.sector_id)) seen.set(row.sector_id, row);
    }
    return Array.from(seen.values());
  }, [sectorMetrics]);

  const signalDist = useMemo(() => {
    const counts = { STRONG: 0, NEUTRAL: 0, WATCH: 0, WEAK: 0 };
    latestSectorHealth.forEach((s) => {
      if (counts[s.signal] !== undefined) counts[s.signal]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [latestSectorHealth]);

  const macroChartData = macroHistory.slice(-30).map((r) => ({
    date: r.date?.slice(5),
    score: parseFloat(r.macro_score?.toFixed(2)),
    vix: parseFloat(r.vix_z?.toFixed(2)),
  }));

  const sectorReturnData = latestMetrics
    .filter((r) => r.sector_return_1d != null)
    .map((r) => ({
      name: r.sectors?.name?.replace(" Sector", "").replace(" Nifty", ""),
      ret: +(r.sector_return_1d * 100).toFixed(2),
    }))
    .sort((a, b) => b.ret - a.ret);

  const macroRegime = macro?.macro_regime;
  const macroScore = macro?.macro_score;

  const macroInsight =
    macroRegime === "RISK_ON"
      ? KPI_INSIGHT.macroRegimeRiskOn
      : macroRegime === "RISK_OFF"
        ? KPI_INSIGHT.macroRegimeRiskOff
        : KPI_INSIGHT.macroRegimeNeutral;

  if (loading)
    return (
      <PageLayout title="Dashboard">
        <LoadingSpinner />
      </PageLayout>
    );

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-5">
        {/* Live Market Bar */}
        <LiveMarketBar />

        {/* ── Live Market Ticker ── */}
        <LiveMarketBar />

        {/* ── Pipeline Explainer (replaces static InsightBox) ── */}
        <PipelineExplainer />

        {/* ── KPI Row 1 ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <ExplainableStatCard
            icon={Building2}
            label="Total Companies"
            value={portfolioStats.total}
            color="orange"
            insightText={KPI_INSIGHT.total}
          />
          <ExplainableStatCard
            icon={CheckCircle}
            label="Healthy ≥ 70"
            value={portfolioStats.healthy}
            color="emerald"
            insightText={KPI_INSIGHT.healthy}
          />
          <ExplainableStatCard
            icon={Eye}
            label="Watch Zone 40–70"
            value={portfolioStats.watch}
            color="amber"
            insightText={KPI_INSIGHT.watch}
          />
          <ExplainableStatCard
            icon={AlertTriangle}
            label="Distress < 40"
            value={portfolioStats.distress}
            color="red"
            insightText={KPI_INSIGHT.distress}
          />
        </div>

        {/* ── KPI Row 2 ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <ExplainableStatCard
            icon={Activity}
            label="Avg Survival Score"
            value={portfolioStats.avgSurvival}
            sub="portfolio average"
            color="orange"
            insightText={KPI_INSIGHT.avgSurvival}
          />
          <ExplainableStatCard
            icon={TrendingUp}
            label="Sectors Tracked"
            value={latestSectorHealth.length}
            color="blue"
            insightText={KPI_INSIGHT.sectors}
          />
          <ExplainableStatCard
            icon={Globe}
            label="Macro Regime"
            value={macroRegime?.replace("_", " ") || "—"}
            color={
              macroRegime === "RISK_ON"
                ? "emerald"
                : macroRegime === "RISK_OFF"
                  ? "red"
                  : "amber"
            }
            insightText={macroInsight}
          />
          <ExplainableStatCard
            icon={Zap}
            label="Macro Score"
            value={macroScore?.toFixed(2) || "—"}
            sub="composite z-score"
            color="orange"
            insightText={KPI_INSIGHT.macroScore}
          />
        </div>

        {/* ── Survival Score Formula (interactive) ── */}
        <SurvivalScoreFormula />

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Macro Score Chart */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="section-title">Macro Score (30d)</p>
                <Tooltip2 text="Composite z-score of VIX, USD-INR, Gold & Crude. Values below 0 mean macro headwinds are active. The neutral band (−1 to +1) is shaded in the chart.">
                  <HelpCircle size={13} className="text-gray-400 cursor-help" />
                </Tooltip2>
              </div>
              {macroRegime && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${macroRegime === "RISK_OFF"
                      ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                      : macroRegime === "RISK_ON"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-500"
                    }`}
                >
                  {macroRegime.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Composite z-score of VIX, USD-INR, Gold &amp; Crude.{" "}
              <span className="text-orange-400 font-medium">Below 0</span> = risk-off environment.{" "}
              <span className="text-emerald-500 font-medium">Above 0</span> = risk-on tailwind.
            </p>
            {macroChartData.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={macroChartData}>
                  <defs>
                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ct.orange} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={ct.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: ct.tick }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: ct.tick }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip {...ct.tooltip} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={ct.orange}
                    strokeWidth={2}
                    fill="url(#macroGrad)"
                    dot={false}
                    name="Macro Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No macro data" sub="Run the pipeline to populate macro overlay." />
            )}
          </div>

          {/* Sector Returns */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <p className="section-title">Sector 1-Day Returns</p>
              <Tooltip2 text="How each NSE sector index moved today vs yesterday's close. Sorted best to worst. Green = gained today, Red = declined today.">
                <HelpCircle size={13} className="text-gray-400 cursor-help" />
              </Tooltip2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              <span className="text-emerald-500 font-medium">Green</span> = sector gained today.{" "}
              <span className="text-red-400 font-medium">Red</span> = sector declined. Sorted best to worst.
            </p>
            {sectorReturnData.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={sectorReturnData}
                  layout="vertical"
                  margin={{ left: 0, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={ct.grid}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: ct.tick }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9, fill: ct.tick }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip {...ct.tooltip} formatter={(v) => [`${v}%`, "Return"]} />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]}>
                    {sectorReturnData.map((e, i) => (
                      <Cell key={i} fill={e.ret >= 0 ? ct.emerald : ct.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No sector data"
                sub="Run the pipeline to populate sector metrics."
              />
            )}
          </div>
        </div>

        {/* ── Signal Distribution (each cell clickable) ── */}
        {signalDist.some((d) => d.value > 0) && (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <p className="section-title">Sector Signal Distribution</p>
              <Tooltip2 text="How many sectors are in each health state right now. Click any cell to read exactly what that signal means and what action it implies.">
                <HelpCircle size={13} className="text-gray-400 cursor-help" />
              </Tooltip2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              How many sectors are in each health state right now.{" "}
              <span className="font-medium">Click any cell</span> to read what that signal means and what portfolio action it implies.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {signalDist.map(({ name, value }) => (
                <SignalCell key={name} name={name} value={value} />
              ))}
            </div>
          </div>
        )}

        {/* ── Sector Health Table (rows expand inline) ── */}
        <div className="card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-title">Sector Health Monitor</p>
                <Tooltip2 text="Each sector's daily health signal from rolling z-scores of returns, volatility, momentum and price slope. Click any row to expand a detailed breakdown of why that sector scored the way it did.">
                  <HelpCircle size={13} className="text-gray-400 cursor-help" />
                </Tooltip2>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Each sector's daily health signal from rolling z-scores.{" "}
                Health Score 0–100 = percentile rank vs own 60-day history.{" "}
                <span className="font-medium text-orange-400">Click any row</span> to expand a full breakdown.
              </p>
            </div>
            {latestSectorHealth.some((r) => r.signal === "INSUFFICIENT_DATA") && (
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900 whitespace-nowrap shrink-0">
                ⏳ Warming up — needs 60+ days of data
              </span>
            )}
          </div>

          {latestSectorHealth.length ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#1f1f1f]">
                    {[
                      "Sector",
                      "Signal",
                      "Regime",
                      "Health Score",
                      "Trend",
                      "Composite",
                      "Spikes",
                    ].map((h) => (
                      <th key={h} className="th-base">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestSectorHealth.map((row) => (
                    <SectorRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No sector health data" />
          )}

          {/* Glossary boxes at the bottom */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InsightBox title="What is Health Score?">
              A 0–100 rolling percentile rank of the sector's composite z-score vs its own 60-day
              history. 100 = historically strongest day. 0 = historically weakest. Adapts to each
              sector's own volatility — a 2% swing in Banking and a 2% swing in FMCG are very
              different events, and health score normalises for that.
            </InsightBox>
            <InsightBox title="What are Spikes?">
              A spike is flagged when today's return falls outside the sector's rolling [5th, 95th]
              percentile band computed over the last 60 trading days. Up-spikes can signal
              breakouts or strong institutional buying. Down-spikes signal sharp selloffs that
              warrant checking for a news catalyst before adding any exposure.
            </InsightBox>
          </div>
        </div>

        {/* ── Macro Narrative ── */}
        {macro?.macro_narrative && (
          <InsightBox title="Today's Macro Narrative">
            {macro.macro_narrative}
          </InsightBox>
        )}

      </div>
    </PageLayout>
  );
}