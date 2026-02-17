import React from 'react'
import MainNavBar from '../components/Navbar/MainNavBar'
import RiskCard from '../components/Cards/RiskCard'
import RiskSection from '../components/Cards/RiskSection'

export default function RiskAnalysis() {
    const accountsData = {
        high: [
            {
                bankCode: "SF",
                bankName: "SmartFlare MSME",
                lastDigits: "1925",
                accountType: "Business Current Account",
                balance: "12,50,000",
                whaleIndex: "Medium",
                riskScore: 72,
                sector: "IT Services",
                cashflow: "2.5L",
            },
            {
                bankCode: "MC",
                bankName: "Manufacturing Co",
                lastDigits: "5678",
                accountType: "Business Savings Account",
                balance: "8,75,000",
                whaleIndex: "High",
                riskScore: 85,
                sector: "Manufacturing",
                cashflow: "5.2L",
            },
        ],
        medium: [
            {
                bankCode: "TE",
                bankName: "Tech Enterprises",
                lastDigits: "3456",
                accountType: "Business Current Account",
                balance: "10,20,000",
                whaleIndex: "Medium",
                riskScore: 55,
                sector: "Technology",
                cashflow: "4.2L",
            },
            {
                bankCode: "FD",
                bankName: "Food Distribution",
                lastDigits: "7890",
                accountType: "Business Savings Account",
                balance: "6,50,000",
                whaleIndex: "Low",
                riskScore: 48,
                sector: "Food & Beverage",
                cashflow: "3.8L",
            },
        ],
        low: [
            {
                bankCode: "RE",
                bankName: "Retail Enterprises",
                lastDigits: "9012",
                accountType: "Business Current Account",
                balance: "15,20,000",
                whaleIndex: "Low",
                riskScore: 35,
                sector: "Retail",
                cashflow: "8.5L",
            },
            {
                bankCode: "HC",
                bankName: "Healthcare Corp",
                lastDigits: "2345",
                accountType: "Business Savings Account",
                balance: "18,90,000",
                whaleIndex: "Low",
                riskScore: 28,
                sector: "Healthcare",
                cashflow: "9.2L",
            },
        ]
    };

    return (
        <div className='w-full min-h-screen bg-black rounded-2xl px-4 sm:px-6 py-4 flex flex-col'>
            {/* TITLE */}
            <section className="max-w-7xl mx-auto w-full mt-10">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Risk Analysis
                    </span>
                    <span className="block text-sm sm:text-lg lg:text-xl font-light text-white/70 mt-2 tracking-wider">
                        Portfolio Overview
                    </span>
                </h1>
            </section>

            {/* PORTFOLIO CARDS */}
            <section className="max-w-7xl mx-auto w-full mt-10 flex flex-col lg:flex-row gap-6">
                <RiskCard count="24" label="High Risk" type="high" />
                <RiskCard count="48" label="Medium Risk" type="medium" />
                <RiskCard count="128" label="Low Risk" type="low" />
            </section>

            <RiskSection title="High Risk" accounts={accountsData.high} />
            <RiskSection title="Medium Risk" accounts={accountsData.medium} />
            <RiskSection title="Low Risk" accounts={accountsData.low} />
        </div>
    )
}
