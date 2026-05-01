import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Activity } from "lucide-react";
import { useAegisData } from "../context/AegisDataContext";
import CandlestickChart from "../charts/CandlestickChart";
import { Skeleton } from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

// ── Constants ──────────────────────────────────────────────────────────────

const RET_Z_BINS = [
  { label: "< -3",     min: -Infinity, max: -3 },
  { label: "-3 to -2", min: -3,        max: -2 },
  { label: "-2 to -1", min: -2,        max: -1 },
  { label: "-1 to 0",  min: -1,        max:  0 },
  { label: "0 to 1",   min:  0,        max:  1 },
  { label: "1 to 2",   min:  1,        max:  2 },
  { label: "2 to 3",   min:  2,        max:  3 },
  { label: "> 3",      min:  3,        max: Infinity },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(value, decimals) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(decimals);
}

/** Merge ohlcvRaw + ohlcvHealth by date for CandlestickChart */
export function mergeCandlestickData(ohlcvRaw, ohlcvHealth) {
  const healthByDate = new Map();
  for (const h of ohlcvHealth || []) {
    healthByDate.set(h.date, h);
  }
  return (ohlcvRaw || []).map((r) => {
    const health = healthByDate.get(r.date);
    return {
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      spike_down: health?.spike_down === true,
    };
  });
}

/** Merge two arrays by date, returning { date, companyVal, sectorVal } */
function mergeByDate(companyArr, sectorArr, companyKey, sectorKey, outCompanyKey, outSectorKey) {
  const map = new Map();
  for (const r of companyArr || []) {
    map.set(r.date, { date: r.date, [outCompanyKey]: r[companyKey] ?? null, [outSectorKey]: null });
  }
  for (const r of sectorArr || []) {
    if (map.has(r.date)) {
      map.get(r.date)[outSectorKey] = r[sectorKey] ?? null;
    } else {
      map.set(r.date, { date: r.date, [outCompanyKey]: null, [outSectorKey]: r[sectorKey] ?? null });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Bin ret_z values into 8 bins */
export function buildRetZDistribution(ohlcvHealth) {
  const counts = new Map(RET_Z_BINS.map((b) => [b.label, 0]));
  for (const h of ohlcvHealth || []) {
    if (h.ret_z == null) continue;
    const v = Number(h.ret_z);
    for (const bin of RET_Z_BINS) {
      if (v > bin.min && v <= bin.max) {
        counts.set(bin.label, (counts.get(bin.label) || 0) + 1);
        break;
      }
    }
  }
  return RET_Z_BINS.map((b) => ({ bin: b.label, count: counts.get(b.label) || 0 }));
}

function retZBarColor(bin) {
  if (bin === "< -3" || bin === "-3 to -2") return "#EF4444";
  if (bin === "-2 to -1" || bin === "-1 to 0") return "#F06A3A";
  return "#E8572A";
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function MarketSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, decimals, suffix = "", badges = [] }) {
  const display = fmt(value, decimals);
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="label-caps">{label}</p>
      <p className="value-xl">
        {display}
        {display !== "—" ? suffix : ""}
      </p>
      {badges.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-1">
          {badges.map((b, i) => (
            <span key={i} className={`badge ${b.cls}`}>{b.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-2)", marginBottom: 4 }}>{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color, margin: "2px 0" }}>
          {e.name}: {formatter ? formatter(e.value) : (e.value != null ? Number(e.value).toFixed(4) : "—")}
        </p>
      ))}
    </div>
  );
}

// ── Dual-line chart ────────────────────────────────────────────────────────

function DualLineChart({ data, companyKey, sectorKey, companyLabel, sectorLabel, height = 220, tickFmt }) {
  const tickInterval = useMemo(() => Math.max(1, Math.floor(data.length / 8)) - 1, [data.length]);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 6" stroke="rgba(0,0,0,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-3)", fontSize: 10 }}
            tickLine={false} axisLine={false}
            interval={tickInterval}
            tickFormatter={(v) => v?.slice(5)}
          />
          <YAxis
            tick={{ fill: "var(--text-3)", fontSize: 10 }}
            tickLine={false} axisLine={false} width={50}
            tickFormatter={tickFmt || ((v) => Number(v).toFixed(2))}
          />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(val, name) => [val != null ? Number(val).toFixed(4) : "—", name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="line" iconSize={14} />
          <Line
            type="monotone" dataKey={companyKey} name={companyLabel}
            stroke="#E8572A" strokeWidth={2} dot={false} connectNulls isAnimationActive={false}
          />
          <Line
            type="monotone" dataKey={sectorKey} name={sectorLabel}
            stroke="#EF4444" strokeWidth={2} strokeDasharray="5 3"
            dot={false} connectNulls isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MarketVolatility() {
  const { id } = useParams();
  const {
    ohlcvRaw,
    ohlcvHealth,
    sectorHealthDetail,
    company,
    loading,
    errors,
    setCompanyId,
  } = useAegisData();

  React.useEffect(() => {
    if (id) setCompanyId(id);
  }, [id, setCompanyId]);

  // ── Latest ohlcvHealth record ──────────────────────────────────────────
  const latestHealth = useMemo(() => {
    if (!ohlcvHealth?.length) return null;
    return [...ohlcvHealth].sort((a, b) => (a.date > b.date ? -1 : 1))[0];
  }, [ohlcvHealth]);

  // ── KPI badges ────────────────────────────────────────────────────────
  const kpiBadges = useMemo(() => {
    const badges = [];
    if (latestHealth?.spike_down) badges.push({ label: "Spike Down", cls: "badge-red" });
    if (latestHealth?.spike_up)   badges.push({ label: "Spike Up",   cls: "badge-orange" });
    return badges;
  }, [latestHealth]);

  // ── Candlestick data ───────────────────────────────────────────────────
  const candlestickData = useMemo(
    () => mergeCandlestickData(ohlcvRaw, ohlcvHealth),
    [ohlcvRaw, ohlcvHealth]
  );

  // ── Company vs Sector Health Score ────────────────────────────────────
  const healthScoreData = useMemo(
    () => mergeByDate(ohlcvHealth, sectorHealthDetail, "health_score", "health_score", "companyHealth", "sectorHealth"),
    [ohlcvHealth, sectorHealthDetail]
  );

  // ── Volatility comparison ──────────────────────────────────────────────
  const volatilityData = useMemo(
    () => mergeByDate(ohlcvHealth, sectorHealthDetail, "volatility", "volatility", "companyVol", "sectorVol"),
    [ohlcvHealth, sectorHealthDetail]
  );

  // ── Return Z-Score distribution ────────────────────────────────────────
  const retZDistribution = useMemo(
    () => buildRetZDistribution(ohlcvHealth),
    [ohlcvHealth]
  );

  // ── Cumulative return comparison ───────────────────────────────────────
  const cumReturnData = useMemo(
    () => mergeByDate(ohlcvHealth, sectorHealthDetail, "cum_change_1y", "cum_change_1y", "companyCum", "sectorCum"),
    [ohlcvHealth, sectorHealthDetail]
  );

  const hasNoData = !ohlcvRaw?.length;

  // ── Guards ─────────────────────────────────────────────────────────────
  if (loading.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">Market Sentiment &amp; Price Volatility</h1>
          <p className="page-subheading">Historical price action, volatility profile, and return distribution</p>
        </div>
        <MarketSkeleton />
      </div>
    );
  }

  if (!loading.company && hasNoData && !errors.company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="label-caps mb-1">AEGIS-FIN</p>
          <h1 className="page-heading">
            {company ? `${company.name} (${company.ticker})` : "Market Sentiment & Price Volatility"}
          </h1>
          <p className="page-subheading">Historical price action, volatility profile, and return distribution</p>
        </div>
        <EmptyState
          title="No market data available"
          sub="No OHLCV records exist for this company in the selected time window."
          icon={Activity}
        />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <div>
        <p className="label-caps mb-1">AEGIS-FIN</p>
        <h1 className="page-heading">
          {company ? `${company.name} (${company.ticker})` : "Market Sentiment & Price Volatility"}
        </h1>
        <p className="page-subheading">Historical price action, volatility profile, and return distribution</p>
      </div>

      {errors.company && (
        <div className="badge badge-red" style={{ padding: "10px 16px", fontSize: "0.85rem" }}>
          Data unavailable: {errors.company}
        </div>
      )}

      {/* ── 1. KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="1Y Return"
          value={latestHealth?.cum_change_1y}
          decimals={2}
          suffix="%"
        />
        <KpiCard
          label="Volatility"
          value={latestHealth?.volatility}
          decimals={4}
          badges={kpiBadges}
        />
        <KpiCard
          label="Return Z-Score"
          value={latestHealth?.ret_z}
          decimals={4}
        />
        <KpiCard
          label="Health Score"
          value={latestHealth?.health_score}
          decimals={1}
        />
      </div>

      {/* ── 2. Candlestick Chart ───────────────────────────────────────── */}
      <div className="card p-5">
        <p className="label-caps mb-1">Price Action — Candlestick Chart</p>
        <p className="muted mb-4">Red dots mark dates where a downward price spike was detected.</p>
        <CandlestickChart data={candlestickData} height={320} />
      </div>

      {/* ── 3 & 4: Health Score + Volatility Comparison ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 3. Company vs Sector Health Score */}
        <div className="card p-5">
          <p className="label-caps mb-4">Company vs. Sector Health Score</p>
          {healthScoreData.length === 0 ? (
            <EmptyState title="No health score data" sub="No health score records found." icon={Activity} />
          ) : (
            <DualLineChart
              data={healthScoreData}
              companyKey="companyHealth"
              sectorKey="sectorHealth"
              companyLabel="Company"
              sectorLabel="Sector"
              tickFmt={(v) => Number(v).toFixed(1)}
            />
          )}
        </div>

        {/* 4. Volatility Comparison */}
        <div className="card p-5">
          <p className="label-caps mb-4">Volatility Comparison</p>
          {volatilityData.length === 0 ? (
            <EmptyState title="No volatility data" sub="No volatility records found." icon={Activity} />
          ) : (
            <DualLineChart
              data={volatilityData}
              companyKey="companyVol"
              sectorKey="sectorVol"
              companyLabel="Company"
              sectorLabel="Sector"
              tickFmt={(v) => Number(v).toFixed(3)}
            />
          )}
        </div>
      </div>

      {/* ── 5 & 6: Return Z-Score Distribution + Cumulative Return ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 5. Return Z-Score Distribution */}
        <div className="card p-5">
          <p className="label-caps mb-4">Return Z-Score Distribution</p>
          {!ohlcvHealth?.length ? (
            <EmptyState title="No return data" sub="No return z-score records found." icon={Activity} />
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retZDistribution} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(0,0,0,0.04)" />
                  <XAxis
                    dataKey="bin"
                    tick={{ fill: "var(--text-3)", fontSize: 10 }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-3)", fontSize: 10 }}
                    tickLine={false} axisLine={false} width={35}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(val) => [val ?? "—", "Count"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {retZDistribution.map((entry) => (
                      <Cell key={entry.bin} fill={retZBarColor(entry.bin)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 6. Cumulative Return Comparison */}
        <div className="card p-5">
          <p className="label-caps mb-4">Cumulative 1Y Return — Company vs. Sector</p>
          {cumReturnData.length === 0 ? (
            <EmptyState title="No cumulative return data" sub="No cum_change_1y records found." icon={Activity} />
          ) : (
            <DualLineChart
              data={cumReturnData}
              companyKey="companyCum"
              sectorKey="sectorCum"
              companyLabel="Company"
              sectorLabel="Sector"
              tickFmt={(v) => `${Number(v).toFixed(1)}%`}
            />
          )}
        </div>
      </div>

    </div>
  );
}
