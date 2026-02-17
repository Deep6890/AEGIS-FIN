import React from "react";

const msmeData = [
    {
        name: "Sharma Traders",
        account: "MSME-102394",
        riskScore: 72,
        whaleIndex: "Medium",
        cashflow: 125000,
    },
    {
        name: "Kumar Enterprises",
        account: "MSME-204981",
        riskScore: 34,
        whaleIndex: "Low",
        cashflow: 268000,
    },
    {
        name: "Patel Industries",
        account: "MSME-784512",
        riskScore: 61,
        whaleIndex: "High",
        cashflow: 110000,
    },
];

export default function TopMsme() {
    return (
        <div className="w-full rounded-xl bg-[#2e2e2e]/80 backdrop-blur-md shadow-lg p-4">

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
                Top MSME Performance Snapshot
            </h2>

            {/* Mobile scroll */}
            <div className="w-full overflow-x-auto">
                <table className="min-w-[900px] w-full border-collapse text-sm text-gray-200">

                    {/* Header */}
                    <thead>
                        <tr className="bg-[#3f3f3f] text-gray-300">
                            <th className="px-4 py-3 text-left">MSME Name</th>
                            <th className="px-4 py-3 text-left">Account No</th>
                            <th className="px-4 py-3 text-left">Risk Score</th>
                            <th className="px-4 py-3 text-left">Whale Index</th>
                            <th className="px-4 py-3 text-left">Monthly Cashflow</th>
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                        {msmeData.map((msme, index) => (
                            <tr
                                key={index}
                                className="border-b border-white/10 hover:bg-white/5 transition"
                            >
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {msme.name}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                    {msme.account}
                                </td>

                                {/* No background on risk score */}
                                <td className="px-4 py-3 font-medium">
                                    {msme.riskScore}
                                </td>

                                <td className="px-4 py-3">
                                    {msme.whaleIndex}
                                </td>

                                <td className="px-4 py-3">
                                    ₹{(msme.cashflow / 1000).toFixed(1)}K / month
                                </td>
                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>
        </div>
    );
}
