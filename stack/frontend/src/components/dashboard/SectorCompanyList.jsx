import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';

function getColor(score) {
  if (score < 45) return '#dc2626';
  if (score < 70) return '#f59e0b';
  return '#2d6a4f';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-[#0f1f0f] text-white px-3 py-2 rounded-2xl text-[11px] shadow-xl">
      <p className="text-[#8fa88f] mb-1">{d.fullName}</p>
      <p>Risk Share: <span className="font-semibold">{(d.value * 100).toFixed(1)}%</span></p>
      <p>Avg Score: <span className="font-semibold">{d.avgScore.toFixed(0)}</span></p>
      <p>Companies: <span className="font-semibold">{d.count}</span></p>
    </div>
  );
};

export default function PremiumSectorBars({ data }) {

  const { chartData, overallAvg } = useMemo(() => {
    let totalRisk = 0;
    let totalScore = 0;
    let totalCompanies = 0;

    const sectors = data.map(g => {
      const riskSum = g.companies.reduce((acc, c) => acc + (100 - c.score), 0);
      const avgScore = g.companies.reduce((acc, c) => acc + c.score, 0) / g.companies.length;

      totalRisk += riskSum;
      totalScore += g.companies.reduce((acc, c) => acc + c.score, 0);
      totalCompanies += g.companies.length;

      return {
        fullName: g.sector,
        name: g.sector.slice(0, 6),
        riskSum,
        avgScore,
        count: g.companies.length
      };
    });

    const chartData = sectors
      .map(s => ({
        ...s,
        value: s.riskSum / totalRisk,
        background: s.count // for faint bar
      }))
      .sort((a, b) => b.value - a.value);

    return {
      chartData,
      overallAvg: totalScore / totalCompanies
    };

  }, [data]);

  return (
    <div className="bg-[#f8faf8] rounded-3xl p-5">

      {/* Header */}
      <div className="mb-5">
        <p className="text-[13px] font-medium text-[#0f1f0f]">
          Sector Risk vs System
        </p>
        <p className="text-[11px] text-[#8fa88f]">
          Compare sector contribution with overall baseline
        </p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barCategoryGap="35%">

          {/* X Axis */}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#a0b8a0' }}
            axisLine={false}
            tickLine={false}
          />

          {/* Baseline (SYSTEM AVG) */}
          <ReferenceLine
            y={overallAvg / 100}
            stroke="#9ca3af"
            strokeDasharray="4 4"
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eef5ef' }} />

          {/* Background Bars */}
          <Bar
            dataKey="background"
            fill="#e8f0e8"
            radius={[20, 20, 0, 0]}
            barSize={38}
          />

          {/* Main Bars */}
          <Bar
            dataKey="value"
            radius={[20, 20, 0, 0]}
            barSize={24}
          >
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={getColor(d.avgScore)}
              />
            ))}
          </Bar>

        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}