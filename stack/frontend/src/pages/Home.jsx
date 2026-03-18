import { useState } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';

import KpiStatCards        from '../components/dashboard/KpiStatCards';
import LiveMarketChart     from '../components/dashboard/LiveMarketChart';
import RiskDistributionRow from '../components/dashboard/RiskDistributionRow';
import NewsFeed            from '../components/dashboard/NewsFeed';
import SectorCompanyList   from '../components/dashboard/SectorCompanyList';

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
} from '../data/dashboardData';

export default function Home() {
  const [selectedSectors, setSelectedSectors] = useState([]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      <HeaderNav />

      <div className="flex flex-1 overflow-hidden">
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
          <LiveMarketChart
            nseData={intradayNSE}
            bseData={intradayBSE}
            marketInfo={marketInfo}
          />

          {/* ── SECTION 3: Risk Distribution (Donut + VIX) ────────────── */}
          <RiskDistributionRow
            sectorRiskDonut={sectorRiskDonut}
            vixCurrent={vixCurrent}
            vixSparkline={vixSparkline}
          />

          {/* ── SECTION 4: News Feed + Company List ───────────────────── */}
          <div className="flex gap-4">
            <NewsFeed news={newsFeed} />
            <SectorCompanyList
              data={sectorCompanyList}
              selectedSectors={selectedSectors}
            />
          </div>

        </main>
      </div>

    </div>
  );
}
