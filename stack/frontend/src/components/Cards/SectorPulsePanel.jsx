import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, MoreHorizontal } from 'lucide-react';

const sectors = [
    { id: 1, name: 'IT',          score: 82, trend: 'up',   change: '+3.2%', drivers: ['RSI bullish', 'Volume spike'],    volatile: false },
    { id: 2, name: 'Auto',        score: 41, trend: 'down', change: '-2.8%', drivers: ['High debt', 'Demand slump'],      volatile: false },
    { id: 3, name: 'FMCG',        score: 67, trend: 'flat', change: '+0.4%', drivers: ['Stable margins', 'Low churn'],    volatile: false },
    { id: 4, name: 'Pharma',      score: 74, trend: 'up',   change: '+1.9%', drivers: ['Export growth', 'R&D spend'],     volatile: false },
    { id: 5, name: 'Metal',       score: 38, trend: 'down', change: '-4.1%', drivers: ['Global slowdown', 'Input cost'],  volatile: true  },
    { id: 6, name: 'Banking',     score: 71, trend: 'up',   change: '+2.1%', drivers: ['Low NPA', 'Strong CASA'],         volatile: false },
    { id: 7, name: 'Realty',      score: 44, trend: 'down', change: '-1.7%', drivers: ['Rate hike risk', 'Low demand'],   volatile: false },
    { id: 8, name: 'Energy',      score: 58, trend: 'up',   change: '+0.9%', drivers: ['Oil stable', 'Capex rising'],     volatile: false },
    { id: 9, name: 'Telecom',     score: 63, trend: 'flat', change: '+0.2%', drivers: ['ARPU growth', 'Infra spend'],     volatile: false },
    { id: 10, name: 'Consumer',   score: 55, trend: 'down', change: '-0.8%', drivers: ['Inflation pressure', 'Weak Q2'],  volatile: false },
    { id: 11, name: 'Infra',      score: 49, trend: 'up',   change: '+1.3%', drivers: ['Govt capex', 'Order inflow'],     volatile: false },
];

const periods = ['30d', '90d', '180d'];

const heatColor = (score) => {
    if (score >= 70) return { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-50 border-emerald-200' };
    if (score >= 55) return { bg: 'bg-yellow-400', text: 'text-white', light: 'bg-yellow-50 border-yellow-200' };
    if (score >= 40) return { bg: 'bg-orange-400', text: 'text-white', light: 'bg-orange-50 border-orange-200' };
    return { bg: 'bg-red-500', text: 'text-white', light: 'bg-red-50 border-red-200' };
};

const TrendIcon = ({ trend, size = 14 }) => {
    if (trend === 'up')   return <TrendingUp  size={size} className="text-emerald-500" />;
    if (trend === 'down') return <TrendingDown size={size} className="text-red-400" />;
    return <Minus size={size} className="text-neutral-400" />;
};

const ScoreRing = ({ score }) => {
    const c = heatColor(score);
    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold ${c.bg} ${c.text}`}>
            {score}
        </div>
    );
};

export default function SectorPulsePanel() {
    const [period, setPeriod] = useState('30d');
    const [selected, setSelected] = useState(null);

    const volatile = sectors.find(s => s.volatile);

    return (
        <div className="flex flex-col gap-4 w-full">

            {/* ── PANEL HEADER ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[15px] font-semibold text-neutral-900">Sector Pulse</h2>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Live health across 11 market sectors</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                    {periods.map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200
                                ${period === p ? 'bg-white text-neutral-900 shadow-sm border border-gray-200' : 'text-neutral-400 hover:text-neutral-700'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── TOP ROW: Volatile Callout + Heatmap ── */}
            <div className="flex gap-4">

                {/* Most Volatile Callout */}
                {volatile && (
                    <div className="w-64 shrink-0 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-2xl" />
                        <div className="flex items-center justify-between pl-2">
                            <div className="flex items-center gap-2">
                                <Zap size={13} className="text-red-400" />
                                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Most Volatile · 24h</span>
                            </div>
                            <MoreHorizontal size={15} className="text-neutral-300" />
                        </div>
                        <div className="pl-2 flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <span className="text-[22px] font-bold text-neutral-900">{volatile.name}</span>
                                <span className="text-[13px] font-semibold text-red-400">{volatile.change}</span>
                                <TrendIcon trend={volatile.trend} size={16} />
                            </div>
                            <div className="flex gap-1.5 flex-wrap mt-1">
                                {volatile.drivers.map((d, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-red-500">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="pl-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${volatile.score}%` }} />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium">{volatile.score}/100</span>
                        </div>
                    </div>
                )}

                {/* Heatmap Strip */}
                <div className="flex-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Risk Heatmap · All Sectors</span>
                        <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Healthy</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block" /> Moderate</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" /> Caution</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> High Risk</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {sectors.map(s => {
                            const c = heatColor(s.score);
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setSelected(selected?.id === s.id ? null : s)}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 cursor-pointer
                                        ${selected?.id === s.id ? `${c.light} border-current` : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                >
                                    <div className={`w-full h-1.5 rounded-full mx-2 ${c.bg}`} style={{ width: '60%' }} />
                                    <span className="text-[9px] font-semibold text-neutral-600">{s.name}</span>
                                    <span className={`text-[10px] font-bold ${s.trend === 'up' ? 'text-emerald-500' : s.trend === 'down' ? 'text-red-400' : 'text-neutral-400'}`}>
                                        {s.change}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── SECTOR DRILLDOWN (on click) ── */}
            {selected && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex items-center gap-8 animate-pulse-once">
                    <ScoreRing score={selected.score} />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-neutral-900">{selected.name} Sector</span>
                        <span className="text-[11px] text-neutral-400">Drilldown · {period}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendIcon trend={selected.trend} size={16} />
                        <span className={`text-[14px] font-semibold ${selected.trend === 'up' ? 'text-emerald-500' : selected.trend === 'down' ? 'text-red-400' : 'text-neutral-500'}`}>
                            {selected.change}
                        </span>
                    </div>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${heatColor(selected.score).bg}`} style={{ width: `${selected.score}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <div className="flex gap-2">
                        {selected.drivers.map((d, i) => (
                            <span key={i} className="text-[10px] px-2.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600">{d}</span>
                        ))}
                    </div>
                    <button onClick={() => setSelected(null)} className="text-[11px] text-neutral-400 hover:text-neutral-700 ml-auto">✕</button>
                </div>
            )}

            {/* ── SECTOR CARDS GRID ── */}
            <div className="grid grid-cols-4 gap-3">
                {sectors.map(s => {
                    const c = heatColor(s.score);
                    const isActive = selected?.id === s.id;
                    return (
                        <button
                            key={s.id}
                            onClick={() => setSelected(isActive ? null : s)}
                            className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm text-left transition-all duration-200 hover:shadow-md
                                ${isActive ? `${c.light} border-current` : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                            {/* Top */}
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-semibold text-neutral-900">{s.name}</span>
                                <TrendIcon trend={s.trend} />
                            </div>

                            {/* Score */}
                            <div className="flex items-end gap-2">
                                <span className="text-[28px] font-bold text-neutral-900 leading-none">{s.score}</span>
                                <span className="text-[10px] text-neutral-400 mb-1">/ 100</span>
                                <span className={`ml-auto text-[11px] font-semibold ${s.trend === 'up' ? 'text-emerald-500' : s.trend === 'down' ? 'text-red-400' : 'text-neutral-400'}`}>
                                    {s.change}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.bg}`} style={{ width: `${s.score}%` }} />
                            </div>

                            {/* Drivers */}
                            <div className="flex flex-wrap gap-1.5">
                                {s.drivers.map((d, i) => (
                                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

        </div>
    );
}
