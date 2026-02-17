import React from 'react';
import AccountPanel from './AccountPanel';

const RiskSection = ({ title, accounts, riskType }) => {
    const themes = {
        high: {
            accentColor: "#ef4444",
            borderColor: "border-red-500/30",
            glowColor: "shadow-red-500/20",
            bgPattern: "bg-gradient-to-r from-red-500/5 to-transparent"
        },
        medium: {
            accentColor: "#f59e0b",
            borderColor: "border-yellow-500/30",
            glowColor: "shadow-yellow-500/20",
            bgPattern: "bg-gradient-to-r from-yellow-500/5 to-transparent"
        },
        low: {
            accentColor: "#59ce8f",
            borderColor: "border-green-500/30",
            glowColor: "shadow-green-500/20",
            bgPattern: "bg-gradient-to-r from-green-500/5 to-transparent"
        }
    };

    const theme = themes[riskType];

    return (
        <section className="max-w-7xl mx-auto w-full mt-10 flex flex-col">
            <div className="text-3xl text-amber-50 my-5">
                <span className="font-bold"> {title} </span> Accounts
            </div>
            <div className="space-y-3">
                {accounts.map((account, index) => (
                    <AccountPanel
                        key={index}
                        account={{
                            ...account,
                            onPrimaryAction: () => console.log("View clicked"),
                        }}
                        onClick={() => console.log("Panel clicked")}
                        theme={theme}
                    />
                ))}
            </div>
        </section>
    );
};

export default RiskSection;
