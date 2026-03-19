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

import {
  kpiStats,
  allSectors,
  intradayNSE,
  intradayBSE,
  marketInfo,
  sectorRiskDonut,
  vixCurrent,
  vixSparkline,
  newsFeed,
  sectorCompanyList,
  sectorSentimentData,
  totalAssetsData,
  pnlData,
  cashFlowData,
  ratiosData,
} from '../data/dashboardData';

export default function Home() {
  const [selectedSectors, setSelectedSectors] = useState([]);

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">

      <HeaderNav />

      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <main className="flex-1 px-5 py-4 flex flex-col gap-4 overflow-y-auto">

          {/* ── SECTION 1: KPI Stat Cards ─────────────────────────────── */}
          <KpiStatCards
            stats={kpiStats}
            sectors={allSectors}
            selectedSectors={selectedSectors}
            onSectorChange={setSelectedSectors}
          />

          {/* ── SECTION 2: Live Market Chart ──────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Market Action</h2>
            <p className="text-[13px] text-[#8fa88f]">Live intraday movements and index breadth</p>
          </div>
          <LiveMarketChart
            nseData={intradayNSE}
            bseData={intradayBSE}
            marketInfo={marketInfo}
          />

          {/* ── SECTION 3: Risk Distribution (Donut + VIX) ────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Risk & Volatility</h2>
            <p className="text-[13px] text-[#8fa88f]">Market stress metrics and vulnerability mapping</p>
          </div>
          <RiskDistributionRow
            sectorRiskDonut={sectorRiskDonut}
            vixCurrent={vixCurrent}
            vixSparkline={vixSparkline}
          />

          {/* ── SECTION 4: News Sentiment & Risk Summary ──────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Sentiment Analytics</h2>
            <p className="text-[13px] text-[#8fa88f]">AI-driven news pulse and sector risk ranking</p>
          </div>
          <SectorSentimentRow sectors={sectorSentimentData} />
          <NewsAndRiskRow newsFeed={newsFeed} sectorCompanyList={sectorCompanyList} />

          {/* ── SECTION 5: Total Assets & Balance Sheet ────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Total Assets</h2>
            <p className="text-[13px] text-[#8fa88f]">Balance sheet composition and asset growth</p>
          </div>
          <TotalAssetsRow data={totalAssetsData} />

          {/* ── SECTION 6: P&L Summary ────────────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Revenue & Profit</h2>
            <p className="text-[13px] text-[#8fa88f]">Quarterly P&L performance metrics</p>
          </div>
          <PnLSummaryRow metrics={pnlData} />

          {/* ── SECTION 7: Cash Flow ──────────────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Cash Flow</h2>
            <p className="text-[13px] text-[#8fa88f]">Operating, investing and financing activities</p>
          </div>
          <CashFlowRow data={cashFlowData} />

          {/* ── SECTION 8: Ratios & Debt ──────────────────────────────── */}
          <div className="mt-4 mb-1">
            <h2 className="text-[18px] font-bold text-[#0f1f0f] tracking-tight">Ratios & Debt</h2>
            <p className="text-[13px] text-[#8fa88f]">Key financial health indicators and liabilities</p>
          </div>
          <RatiosDebtRow data={ratiosData} />

        </main>
      </div>

    </div>
  );
}
