import React from "react";
import MainNavBar from "../components/Navbar/MainNavBar";
import BannerElementCard from "../components/Cards/BannerElementCard";
import InstentUpdateBannerCard from "../components/Cards/InstentUpdateBannerCard";
import ChartCard from "../components/Cards/ChartCard";

export default function Home() {
    return (
        <div className="w-full min-h-screen bg-black rounded-2xl px-4 sm:px-6 py-4 flex flex-col">

            {/* HEADER */}
            <header className="w-full">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <h1 className="text-lg sm:text-3xl font-semibold text-white">
                        SmartFlare
                    </h1>

                    <div className="flex-1 flex justify-center">
                        <MainNavBar />
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="max-w-7xl mx-auto w-full mt-10 flex flex-col lg:flex-row gap-8 items-start">

                {/* Title */}
                <div className="lg:w-1/3">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                        <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            Risk & Fraud
                        </span>
                        <span className="block text-sm sm:text-lg lg:text-xl font-light text-white/70 mt-2 tracking-wider">
                            Analysis
                        </span>
                    </h1>
                </div>

                {/* Banner Cards */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <BannerElementCard
                        semiHeader="Average Black rate"
                        header="Live Risk Bias"
                        value="44.44%"
                        bgColor="bg-[#59ce8f]"
                        overAllTextColor="text-black"
                        headerColor="text-white"
                    />
                    <BannerElementCard
                        semiHeader="Average Recovery rate"
                        header="Recovery Velocity"
                        value="44.44%"
                        bgColor="bg-white"
                        overAllTextColor="text-black"

                    />
                    <BannerElementCard
                        semiHeader="Value at Risk (VaR)"
                        header="Expected Credit Loss"
                        value="1.2cr"
                        bgColor="bg-[#181818]"
                    />
                </div>
            </section>

            {/* {Quick Summary } */}
            <section className="max-w-7xl mx-auto w-full mt-10 flex-col">
                <div className="text-3xl text-amber-50 my-5">
                    <span className="font-bold"> Important</span> , summary of bank's data
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <InstentUpdateBannerCard header="Total Registration" value="120120" />
                    <InstentUpdateBannerCard header="Weak Cashflow Accounts" value="73" />
                    <InstentUpdateBannerCard header="Assigned Recommendations" value="120120" />
                    <InstentUpdateBannerCard header="Whale Dependency Alerts" value="120120" />
                    <InstentUpdateBannerCard header="Sector Volatility Alert" value="120120" />
                </div>
            </section>

            {/* Chart section*/}
            <section className="max-w-7xl mx-auto w-full mt-10 flex flex-col">
                <div className="text-3xl text-amber-50 my-5">
                    <span className="font-bold"> Trend </span> , the stockMarket
                </div>
                <ChartCard header="Sector Stock Market Trend">
                    {/* Chart Component Goes Here */}
                </ChartCard>
            </section>

        </div>
    );
}
