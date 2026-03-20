import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'M', 'T'];

// Sentiment color based on score
const sentimentColor = (score) => {
  if (score >= 0.7) return '#16a34a';
  if (score >= 0.45) return '#f59e0b';
  return '#ef4444';
};

// Graph hover tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1f0f] text-white px-2.5 py-1.5 rounded-lg text-[10px] shadow-xl border border-white/10">
      <p className="text-white/50 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {(p.value * 100).toFixed(0)}
        </p>
      ))}
    </div>
  );
};

function SectorTile({ sector, shortName, sentiment, niftyCorr, score, trend, correlation }) {
  const color = sentimentColor(score);
  const chartData = DAYS.map((d, i) => ({
    d,
    sentiment: sentiment[i],
    nifty: niftyCorr[i],
  }));

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">{shortName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold" style={{ color }}>
            {(score * 100).toFixed(0)}
          </span>
          {trend === 'up'
            ? <TrendingUp size={12} style={{ color }} />
            : <TrendingDown size={12} color="#ef4444" />}
        </div>
      </div>

      {/* Sparkline: sentiment bars + Nifty correlation line */}
      <div className="h-[52px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="d" hide />
            <YAxis domain={[0, 1]} hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="sentiment"
              name="Sentiment"
              fill={color}
              opacity={0.25}
              radius={[2, 2, 0, 0]}
              barSize={10}
            />
            <Line
              dataKey="sentiment"
              name="Sentiment"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              legendType="none"
            />
            <Line
              dataKey="nifty"
              name="Nifty Corr"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 2"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <span className="text-[10px] text-slate-400">7-day sentiment</span>
        <span className="text-[10px] text-slate-400">
          Nifty corr <span className="font-semibold text-slate-500">{(correlation * 100).toFixed(0)}%</span>
        </span>
      </div>

    </div>
  );
}

// Main component secctor analysis
export default function SectorSentimentRow({ sectors = [] }) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {sectors.map((s) => (
        <SectorTile key={s.sector} {...s} />
      ))}
    </div>
  );
}
