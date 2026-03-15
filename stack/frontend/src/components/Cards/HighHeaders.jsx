import { MoreHorizontal, TrendingDown, Building2, Wind, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';

const iconMap = {
    'Unstable Sector': { icon: TrendingDown, bg: 'bg-purple-100', color: 'text-purple-300' },
    'Unstable Company': { icon: Building2, bg: 'bg-[#f5efe6]', color: 'text-[#c9a97a]' },
    'Environment Risk': { icon: Wind, bg: 'bg-green-50', color: 'text-green-300' },
    'Market Stress': { icon: AlertTriangle, bg: 'bg-purple-100', color: 'text-purple-300' },
    'Credit Alert': { icon: ShieldAlert, bg: 'bg-[#f5efe6]', color: 'text-[#c9a97a]' },
    'Volatility Index': { icon: Activity, bg: 'bg-green-50', color: 'text-green-300' },
};

const badgeColor = (t) => {
    if (!t) return 'bg-gray-100 text-gray-500';
    if (t.startsWith('+')) return 'bg-green-100 text-green-700';
    if (t.startsWith('-')) return 'bg-red-100 text-red-600';
    return 'bg-gray-100 text-gray-500';
};

export default function HighHeaders({ name, points, tagScore, sentence }) {
    const entry = iconMap[name] ?? { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-600' };
    const Icon = entry.icon;
    return (
        <div className="w-full bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm">

            {/* Top Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${entry.bg}`}>
                        <Icon size={18} className={entry.color} />
                    </div>
                    <span className="text-[14px] font-medium text-gray-700">{name}</span>
                </div>
                <MoreHorizontal size={18} className="text-gray-400 cursor-pointer" />
            </div>

            {/* Bottom Row */}
            <div className="flex items-center gap-3 flex-wrap mt-3">
                <span className="text-3xl font-bold text-gray-900">{points}</span>
                <span className={`text-[12px] px-2 py-1 rounded-full ${badgeColor(tagScore)}`}>{tagScore}</span>
                <span className="text-[12px] text-gray-400">{sentence}</span>
            </div>

        </div>
    );
}
