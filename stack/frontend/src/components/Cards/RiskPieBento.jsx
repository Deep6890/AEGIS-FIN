import BasicPie from '../libAssests/PieChart';

// Horizontal stacked bar showing distribution
function StackedBar({ data }) {
  return (
    <div className="flex w-full h-2 rounded-full overflow-hidden gap-0.5">
      {data.map(({ name, value, color }) => (
        <div
          key={name}
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export default function RiskPieBento({ riskDistribution }) {
  const total = riskDistribution.reduce((s, d) => s + d.value, 0);
  const dominant = [...riskDistribution].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 h-full">

      {/* header */}
      <div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Risk Distribution</span>
        <p className="text-[14px] font-bold text-slate-900 mt-1">Sector-wise Exposure</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Dominant: <span className="font-semibold text-slate-600">{dominant?.name}</span> at {dominant?.value}%
        </p>
      </div>

      {/* donut */}
      <div className="flex-1 flex items-center justify-center">
        <BasicPie data={riskDistribution} />
      </div>

      {/* stacked bar */}
      <StackedBar data={riskDistribution} />

      {/* legend */}
      <div className="flex flex-col gap-2.5">
        {riskDistribution.map(({ name, color, value }) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-slate-500">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-800">{value}%</span>
              <span className="text-[10px] text-slate-400">of {total}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
