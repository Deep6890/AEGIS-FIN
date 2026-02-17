import React from "react";

const AccountPanel = ({ account, onClick }) => {
    const getRiskColor = (score) => {
        if (score >= 70) return "text-red-400 bg-red-500/10 border-red-500/30";
        if (score >= 40) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
        return "text-green-400 bg-green-500/10 border-green-500/30";
    };

    return (
        <div
            onClick={onClick}
            className="w-full bg-[#1b1f27] 
                 hover:bg-[#222733] transition-all duration-300
                 rounded-2xl px-6 py-4 flex items-center justify-between 
                 cursor-pointer border-l-1 border-y border-r border-[#2a2f3a]
                 hover:border-[#289b5e] hover:shadow-lg hover:shadow-[#59ce8f]/10"
        >
            {/* LEFT SECTION */}
            <div className="flex items-center gap-5">
                {/* Logo */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br 
                        flex items-center justify-center text-sm font-semibold text-[#59ce8f] shadow-inner
                        border border-[#59ce8f]/30">
                    {account.bankCode}
                </div>

                {/* Account Info */}
                <div>
                    <h3 className="text-white font-semibold text-base tracking-wide mb-2">
                        {account.bankName} ••{account.lastDigits}
                    </h3>
                    <p className="text-gray-400 text-xs mt-2">
                        {account.accountType}
                    </p>

                    {/* Info Row */}
                    <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-[#59ce8f]/9 text-white border border-[#59ce8f]/10">
                            Whale: {account.whaleIndex}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border ${getRiskColor(account.riskScore)}`}>
                            Risk: {account.riskScore}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#2a2f3a] text-gray-300">
                            Sector: {account.sector}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#2a2f3a] text-gray-300">
                            Cashflow: ₹{account.cashflow}
                        </span>
                    </div>
                </div>
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-gray-500 text-xs uppercase tracking-wider">
                        Balance
                    </p>
                    <p className="text-white font-semibold text-lg">
                        ₹{account.balance}
                    </p>
                </div>

                <button
                    className="px-4 py-2 rounded-xl bg-[#59ce8f] text-sm text-black font-semibold
                     hover:bg-[#4ab87d] transition-all shadow-md hover:shadow-[#59ce8f]/30"
                    onClick={(e) => {
                        e.stopPropagation();
                        account.onPrimaryAction && account.onPrimaryAction();
                    }}
                >
                    View →
                </button>
            </div>
        </div>
    );
};

export default AccountPanel;
