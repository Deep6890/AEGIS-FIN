import { useState } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTCooltip, ZAxis } from 'recharts';
import { Target, AlertTriangle, Activity, Database, Flame, ListTree, ActivitySquare, ShieldAlert } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function RiskRadar() {
  const { riskRadar } = useAppData();
  const mockRiskData = riskRadar.scatterData;

  return (
    <PageLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Systemic Risk Radar</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-500" /> Early warning system for drawdown clusters and macro regime shifts
          </p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-rose-100 flex items-center gap-2 px-4 shadow-rose-100 font-bold text-rose-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          3 Critical Alerts Active
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* L COL: Top 10 Risk List */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-rose-50 flex justify-between items-center">
              <h3 className="font-bold text-rose-900 flex items-center gap-2"><Flame size={18} /> High-Risk Watchlist</h3>
              <span className="text-xs bg-rose-200 text-rose-800 px-2 py-1 rounded font-bold uppercase tracking-wider">Top 10</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {Array.from({length: 10}).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 hover:bg-rose-50/50 cursor-pointer transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white ${i < 3 ? 'bg-rose-500 shadow-sm shadow-rose-300' : 'bg-gray-300'}`}>{i+1}</div>
                    <div>
                      <div className="font-bold text-gray-800">Company {i+1}</div>
                      <div className="text-xs text-gray-400 font-bold tracking-wide">Banking Sector</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-rose-600">{95 - i*3}</div>
                    <div className="text-[10px] uppercase font-bold text-rose-400">Risk Score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* R COL: Radar Plot & Signals */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-800">Probability vs Impact Cluster Matrix</h3>
              <div className="flex gap-2 text-xs font-bold text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> High Risk</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Watch</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Safe</span>
              </div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
              {/* Quadrant lines */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300" />
              <div className="absolute top-2 right-4 text-xs font-bold text-gray-400 uppercase">Critical Zone (High Prob / High Impact)</div>
              
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis type="number" dataKey="x" name="Probability" unit="%" hide />
                  <YAxis type="number" dataKey="y" name="Impact" unit="%" hide />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} name="Market Cap" />
                  <RTCooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={mockRiskData} fill="#ef4444" shape="circle" 
                    fillOpacity={0.7}
                    // Custom color logic based on quadrant could be added using map, but simpler here
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            
            <div className="bg-gradient-to-br from-[#0f1f0f] to-[#1a3322] border border-[#2d6a4f] rounded-2xl p-6 text-emerald-50 relative overflow-hidden shadow-xl">
              <ActivitySquare className="absolute top-4 right-4 text-emerald-500/10 w-32 h-32" />
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 z-10 relative">
                <Activity size={18} className="text-emerald-400" /> Volatility Regime Detection
              </h3>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-end border-b border-emerald-800 pb-2">
                  <span className="text-emerald-300 font-bold uppercase text-sm tracking-wider">Current Regime</span>
                  <span className="text-xl font-black text-rose-400">Contraction</span>
                </div>
                <p className="text-sm text-emerald-100/80 leading-relaxed">
                  AI model detects a transition into a low-liquidity contraction phase over the last 14 days, historically preceding 10-15% drawdowns in the midcap segment.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Early Warning Signals
              </h3>
              <ul className="space-y-4 relative">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-amber-200"></div>
                <li className="pl-6 relative">
                  <div className="absolute left-[3px] top-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-md shadow-amber-300"></div>
                  <h4 className="font-bold text-gray-800 text-sm">Spike in Promoter Pledging</h4>
                  <p className="text-xs text-gray-500 mt-1">Detected across 4 midcap infrastructure stocks in the last 48 hours.</p>
                </li>
                <li className="pl-6 relative">
                  <div className="absolute left-[3px] top-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-md shadow-rose-300 animate-pulse"></div>
                  <h4 className="font-bold text-rose-600 text-sm">Sectoral Negative News Velocity</h4>
                  <p className="text-xs text-rose-500/80 mt-1">Auto sector sentiment index dropped 2.4 standard deviations below 90D mean.</p>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </PageLayout>
  );
}
