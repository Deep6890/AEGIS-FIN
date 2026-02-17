import React from 'react';

const RiskCard = ({ count, label, type }) => {
    const configs = {
        high: {
            gradient: "from-[#2a1a1a] to-[#1a1212]",
            border: "border-red-900/20 hover:border-red-800/40",
            textColor: "text-red-400/60",
            labelColor: "text-red-300",
            iconBg: "bg-red-500/10",
            iconColor: "text-red-400",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        },
        medium: {
            gradient: "from-[#2a2416] to-[#1a1810]",
            border: "border-yellow-900/20 hover:border-yellow-800/40",
            textColor: "text-yellow-400/60",
            labelColor: "text-yellow-300",
            iconBg: "bg-yellow-500/10",
            iconColor: "text-yellow-400",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        },
        low: {
            gradient: "from-[#1a2620] to-[#121a16]",
            border: "border-green-900/20 hover:border-green-800/40",
            textColor: "text-green-400/60",
            labelColor: "text-green-300",
            iconBg: "bg-green-500/10",
            iconColor: "text-green-400",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        }
    };

    const config = configs[type];

    return (
        <div className={`flex-1 bg-gradient-to-br ${config.gradient} rounded-2xl p-6 border ${config.border} transition-all`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`${config.textColor} text-sm font-medium mb-2`}>Total Accounts</p>
                    <h3 className="text-white text-3xl font-bold mb-1">{count}</h3>
                    <p className={`${config.labelColor} text-lg font-semibold`}>{label}</p>
                </div>
                <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center`}>
                    <svg className={`w-8 h-8 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {config.icon}
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default RiskCard;
