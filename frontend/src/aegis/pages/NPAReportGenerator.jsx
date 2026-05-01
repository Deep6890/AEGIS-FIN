import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";
import WaterfallChart from "../charts/WaterfallChart";
import { Skeleton } from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

// ── Pure helper functions (exported for testing) ───────────────────────────

/**
 * Returns the badge CSS class for a given NPA class string.
 * Property 5: Badge color is deterministic
 * @param {"Safe"|"Watchlist"|"High Risk"|null|undefined} cls
 * @returns {string}
 */
export function getReportBadgeClass(cls) {
  if (cls === "High Risk") return "badge badge-red";
  if (cls === "Watchlist") return "badge badge-amber";
  if (cls === "Safe") return "badge badge-green";
  return "badge";
}

/**
 * Returns the recommendation banner text for a given NPA class string.
 * @param {"Safe"|"Watchlist"|"High Risk"|null|undefined} cls
 * @returns {string}
 */
export function getRecommendationText(cls) {
  if (cls === "High Risk") return "Action Required: High Default Probability";
  if (cls === "Watchlist") return "Monitor Closely: Elevated Risk Indicators";
  if (cls === "Safe") return "Status: Healthy Performing Asset";
  return "Classification unavailable";
}

/**
 * Determines the triggering condition label(s) for a red flag metric.
 * @param {{ hist_pct_rank: number|null, yoy_pct: number|null }} metric
 * @returns {string}
 */
export function getTriggerLabel(metric) {
  const lowRank = (metric.hist_pct_rank ?? 100) < 10;
  const yoyDrop = (metric.yoy_pct ?? 0) < -20;
  if (lowRank && yoyDrop) return "Low Percentile Rank & YoY Drop > 20%";
  if (lowRank) return "Low Percentile Rank";
  if (yoyDrop) return "YoY Drop > 20%";
  return "";
}

/**
 * Filters a metrics array to only those qualifying as red flags.
 * Property 8: Red Flags filter is exhaustive and exclusive
 *
 * @param {Array<{ name: string, hist_pct_rank: number|null, yoy_pct: number|null, value: number|null, category: string }>} metrics
 * @returns {Array}
 */
export function getRedFlags(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics.filter(
    (m) => (m.hist_pct_rank ?? 100) < 10 || (m.yoy_pct ?? 0) < -20
  );
}

/**
 * Deduplicates metrics to the most recent period per metric name.
 * Assumes the input is already ordered by period descending (as returned by Supabase).
 * @param {Array<{ name: string, [key: string]: any }>} metrics
 * @returns {Array}
 */
export function deduplicateByName(metrics) {
  const seen = new Set();
  const result = [];
  for (const m of metrics) {
    if (!seen.has(m.name)) {
      seen.add(m.name);
      result.push(m);
    }
  }
  return result;
}

/**
 * Builds the unified metrics array from balanceSheet and holdingScores,
 * deduplicating to the most recent period per metric name.
 * @param {Array} balanceSheet
 * @param {Array} holdingScores
 * @returns {Array<{ name, hist_pct_rank, yoy_pct, value, category }>}
 */
export function buildMetrics(balanceSheet, holdingScores) {
  const bsMetrics = (balanceSheet || []).map((r) => ({
    name: r.ratio_definitions?.name ?? "Unknown",
    hist_pct_rank: r.hist_pct_rank,
    yoy_pct: r.yoy_pct,
    value: r.value,
    category: r.ratio_definitions?.category ?? "",
  }));

  const holdMetrics = (holdingScores || []).map((r) => ({
    name: r.holding_metric_definitions?.name ?? "Unknown",
    hist_pct_rank: r.hist_pct_rank,
    yoy_pct: null,
    value: r.value,
    category: r.holding_metric_definitions?.category ?? "",
  }));

  const combined = [...bsMetrics, ...holdMetrics];
  return deduplicateByName(combined);
}

// ── Skeleton layout for loading state ─────────────────────────────────────
function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────
export default function NPAReportGenerator() {
  const { id } = useParams();
  const {
    insight,
    company,
    balanceSheet,
    holdingScores,
    loading,
    errors,
    setCompanyId,
  } = useAegisData();

  // Sync companyId into context whenever the route param changes
  React.useEffect(() => {
    if (id) setCompanyId(id);
  }, [id, setCompanyId]);

  // ── Waterfall chart data ─────────────────────────────────────────────────
  const waterfallData = useMemo(() => {
    if (!insight) return null;
    return {
      base: 50,
      adjustments: [
        { label: "Fundamental", value: (insight.fundamental_score ?? 50) - 50 },
        { label: "Sentiment", value: (insight.sentiment_score ?? 50) - 50 },
        { label: "Trend", value: (insight.trend_score ?? 50) - 50 },
      ],
      final: insight.final_score ?? 50,
    };
  }, [insight]);

  // ── Red flags ────────────────────────────────────────────────────────────
  const redFlags = useMemo(() => {
    const metrics = buildMetrics(balanceSheet, holdingScores);
    return getRedFlags(metrics);
  }, [balanceSheet, holdingScores]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">NPA AI Report Generator</h1>
          <p className="page-subheading">Comprehensive NPA risk report for credit committee</p>
        </div>
        <ReportSkeleton />
      </div>
    );
  }

  // ── Empty state — no insight record ─────────────────────────────────────
  if (!loading.company && !insight && !errors.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">
            {company ? `${company.name} (${company.ticker})` : "NPA AI Report Generator"}
          </h1>
          <p className="page-subheading">Comprehensive NPA risk report for credit committee</p>
        </div>
        <EmptyState
          title="No insight data available"
          sub="No company_insights record exists for this company. Run the analysis pipeline to generate scores."
          icon={FileText}
        />
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header — hidden when printing */}
      <div className="aegis-no-print">
        <p className="label-caps mb-1">AEGIS-FIN</p>
        <h1 className="page-heading">
          {company ? `${company.name} (${company.ticker})` : "NPA AI Report Generator"}
        </h1>
        <p className="page-subheading">Comprehensive NPA risk report for credit committee</p>
      </div>

      {/* Print-only report header */}
      <div className="hidden print:block mb-4">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          NPA Risk Report — {company ? `${company.name} (${company.ticker})` : "Company"}
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Print / Export PDF button */}
      <div className="aegis-no-print flex justify-end">
        <button
          className="btn-primary aegis-no-print"
          onClick={() => window.print()}
        >
          Print / Export PDF
        </button>
      </div>

      {/* Error banner */}
      {errors.company && (
        <div className="badge badge-red">
          Data unavailable: {errors.company}
        </div>
      )}

      {/* ── Section 1: Score Waterfall ────────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-1">Score Decomposition</p>
        <p className="muted mb-4">
          How component scores adjust from the base to produce the final NPA risk score
        </p>
        {waterfallData ? (
          <WaterfallChart
            base={waterfallData.base}
            adjustments={waterfallData.adjustments}
            final={waterfallData.final}
          />
        ) : (
          <EmptyState
            title="No score data"
            sub="Insight scores are unavailable for this company."
            icon={FileText}
          />
        )}
        {/* Score legend */}
        {insight && (
          <div className="flex flex-wrap gap-6 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <p className="label-caps">Base Score</p>
              <p className="value-lg">50</p>
            </div>
            <div>
              <p className="label-caps">Fundamental</p>
              <p className="value-lg">{insight.fundamental_score ?? "—"}</p>
            </div>
            <div>
              <p className="label-caps">Sentiment</p>
              <p className="value-lg">{insight.sentiment_score ?? "—"}</p>
            </div>
            <div>
              <p className="label-caps">Trend</p>
              <p className="value-lg">{insight.trend_score ?? "—"}</p>
            </div>
            <div>
              <p className="label-caps">Final Score</p>
              <p className="value-lg">{insight.final_score != null ? Number(insight.final_score).toFixed(2) : "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Key Red Flags ──────────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-1">Key Red Flags</p>
        <p className="muted mb-4">
          Metrics where historical percentile rank &lt; 10 or year-over-year change &lt; −20%
        </p>

        {redFlags.length === 0 ? (
          <p className="muted" style={{ fontStyle: "italic" }}>
            No critical red flags detected for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px" }} className="label-caps">
                    Metric
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }} className="label-caps">
                    Category
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }} className="label-caps">
                    Value
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }} className="label-caps">
                    Hist. Rank
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }} className="label-caps">
                    YoY %
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }} className="label-caps">
                    Trigger
                  </th>
                </tr>
              </thead>
              <tbody>
                {redFlags.map((flag, i) => (
                  <tr
                    key={`${flag.name}-${i}`}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                      {flag.name}
                    </td>
                    <td style={{ padding: "10px 12px" }} className="muted">
                      {flag.category || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {flag.value != null ? Number(flag.value).toFixed(2) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {flag.hist_pct_rank != null ? (
                        <span
                          className={(flag.hist_pct_rank ?? 100) < 10 ? "badge badge-red" : ""}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {Number(flag.hist_pct_rank).toFixed(1)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {flag.yoy_pct != null ? (
                        <span
                          className={(flag.yoy_pct ?? 0) < -20 ? "badge badge-red" : ""}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {Number(flag.yoy_pct).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge badge-red" style={{ fontSize: "0.7rem" }}>
                        {getTriggerLabel(flag)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Final Recommendation Banner ────────────────────── */}
      {insight && (
        <div className="card p-5">
          <p className="label-caps mb-3">Final Recommendation</p>
          <div
            className={getReportBadgeClass(insight.class)}
            style={{ fontSize: "1rem", padding: "12px 20px", display: "inline-block" }}
          >
            {getRecommendationText(insight.class)}
          </div>
          {insight.summary && (
            <p className="muted mt-4" style={{ lineHeight: 1.7 }}>
              {insight.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
