import { useState } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';

import KpiStatCards from '../components/dashboard/KpiStatCards';
import LiveMarketChart from '../components/dashboard/LiveMarketChart';
import RiskDistributionRow from '../components/dashboard/RiskDistributionRow';
import NewsAndRiskRow from '../components/dashboard/NewsAndRiskRow';
import SectorSentimentRow from '../components/dashboard/SectorSentimentRow';
import TotalAssetsRow from '../components/dashboard/TotalAssetsRow';
import PnLSummaryRow from '../components/dashboard/PnLSummaryRow';
import CashFlowRow from '../components/dashboard/CashFlowRow';
import RatiosDebtRow from '../components/dashboard/RatiosDebtRow';
import { useAppData } from '../context/AppDataContext';


export default function Home() {
  // Collecting the Data
  const {
    kpiStats, allSectors, intradayNSE, intradayBSE, marketInfo, marketBreadth,
    sectorRiskDonut, vixCurrent, vixSparkline, newsFeed,
    sectorCompanyList, sectorSentimentData, totalAssetsData,
    pnlData, cashFlowData, ratiosData,
  } = useAppData();


  const [selectedSectors, setSelectedSectors] = useState([]);
  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      {/* Main horizontal header*/}
      <HeaderNav />
      {/* Main vertical nav and content area */}
      <div className="flex flex-1 min-h-0">
        <VerticalNav />
        {/* Main area of the componets */}
        <main className="flex-1 px-4 md:px-5 py-4 pb-20 md:pb-4 flex flex-col gap-4 overflow-y-auto">
          {/* Need to add more big header here*/}

          {/*KPI Stat Cards shows the major global tag lines*/}
          <KpiStatCards
            stats={kpiStats}
            sectors={allSectors}
            selectedSectors={selectedSectors}
            onSectorChange={setSelectedSectors}
          />

          {/* Live Market Chart shows the nifty data and nifty's and sensex dirrections*/}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Market Action</h2>
            <p className="text-[13px] text-[#8fa88f]">Live intraday movements and index breadth</p>
          </div>
          <LiveMarketChart
            nseData={intradayNSE}
            bseData={intradayBSE}
            marketInfo={marketInfo}
            marketBreadth={marketBreadth}
          />

          {/*Sector vise risk profile and vix sentiments for vix and sector distribution*/}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Risk & Volatility</h2>
            <p className="text-[13px] text-[#8fa88f]">Market stress metrics and vulnerability mapping</p>
          </div>
          <RiskDistributionRow
            sectorRiskDonut={sectorRiskDonut}
            vixCurrent={vixCurrent}
            vixSparkline={vixSparkline}
          />

          {/* Sentiment section covers 7 days sectors dirift market new centiments and sector wise risk covers homany companies*/}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Sentiment Analytics</h2>
            <p className="text-[13px] text-[#8fa88f]">AI-driven news pulse and sector risk ranking</p>
          </div>
          <SectorSentimentRow sectors={sectorSentimentData} />
          {/* Need to edit this section to add some some good insgihst this gonna repetd again*/}
          <NewsAndRiskRow newsFeed={newsFeed} sectorCompanyList={sectorCompanyList} />

          {/* This is bassically for distribution of havving assest total for each given company how much data backeup there total given company from that we can find the over all valuations  also shows breack downs for assests distibutions*/}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Total Assets</h2>
            <p className="text-[13px] text-[#8fa88f]">Balance sheet composition and asset growth</p>
          </div>
          <TotalAssetsRow data={totalAssetsData} />

          {/* Summary sections*/}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Revenue & Profit</h2>
            <p className="text-[13px] text-[#8fa88f]">Quarterly P&L performance metrics</p>
          </div>
          {/* THis is basically shows the revenu and statastical over alll portfolio summary*/}
          <PnLSummaryRow metrics={pnlData} />

          {/* ── SECTION 7: Cash Flow ──────────────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Cash Flow</h2>
            <p className="text-[13px] text-[#8fa88f]">Operating, investing and financing activities</p>
          </div>
          {/* THis shows given company by overflow that is basically portfolio out flow inflow calcculated manner*/}
          <CashFlowRow data={cashFlowData} />

          {/* ── SECTION 8: Ratios & Debt ──────────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Ratios & Debt</h2>
            <p className="text-[13px] text-[#8fa88f]">Key financial health indicators and liabilities</p>
          </div>
          {/* Summary and inflow outflow is there need to update that is all are reduendent and not carrying much informations */}
          <RatiosDebtRow data={ratiosData} />

        </main>
      </div>

    </div>
  );
}
