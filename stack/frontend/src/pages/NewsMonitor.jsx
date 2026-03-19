import { useState } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { Newspaper, Flame, BrainCircuit, ExternalLink, Clock, Target, Hash } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const formatSentiment = (sentiment) => {
  if (sentiment === 'positive') return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '↗' };
  if (sentiment === 'neutral') return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '→' };
  return { bg: 'bg-rose-100', text: 'text-rose-700', icon: '↘' };
};

export default function NewsMonitor() {
  const { newsMonitor, dashboardData } = useAppData();
  const [filter, setFilter] = useState('All');

  const sentimentTimeline = newsMonitor.sentimentTimeline;
  const newsFeed = dashboardData.newsFeed;

  return (
    <PageLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">News Monitor</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <Newspaper size={16} /> Real-time market pulse, AI sentiment scoring & impact radius
          </p>
        </div>
        
        <div className="bg-white px-1 py-1 rounded-xl shadow-sm border border-emerald-100 flex gap-1">
          {['All', 'Banking', 'Auto', 'IT', 'Macro'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition font-bold ${filter === f ? 'bg-[#2d6a4f] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* L COL: Live Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-emerald-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={16} className="text-amber-500" /> Live Terminal Feed</h3>
            <span className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Receiving Events
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {newsFeed.map((news) => {
              const style = formatSentiment(news.sentiment);
              return (
                <div key={news.id} className="group p-5 bg-white border border-gray-100 hover:border-emerald-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${style.bg.replace('100', '500')}`}></div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${style.bg} ${style.text}`}>
                        {news.sentiment} {style.icon}
                      </span>
                      <span className="font-bold text-gray-400 text-xs flex items-center gap-1"><Clock size={12}/> {news.time}</span>
                      <div className="flex gap-2">
                        {news.companies.map(c => (
                          <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{c}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-300 bg-gray-50 rounded-lg px-2 py-1 shadow-inner border border-gray-100 flex items-center gap-1">
                      <Target size={12}/> Impact: {news.impact}/10
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-[#2d6a4f] transition flex justify-between">
                    {news.headline}
                    <ExternalLink size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition" />
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* R COL: Analytics */}
        <div className="space-y-6 flex flex-col">
          
          <div className="bg-gradient-to-br from-[#0f1f0f] to-[#1a3322] rounded-2xl p-6 shadow-xl border border-emerald-800 text-white flex-1 relative overflow-hidden">
            <BrainCircuit className="absolute top-4 right-4 text-emerald-500/10 w-32 h-32" />
            <h3 className="font-bold text-lg text-emerald-50 mb-4 flex items-center gap-2 z-10 relative">
              <Flame size={18} className="text-amber-500" /> Sentiment Velocity (30D)
            </h3>
            
            <div className="h-40 relative z-10 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sentimentTimeline}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{backgroundColor: '#0f1f0f', borderColor: '#2d6a4f', borderRadius: '8px'}}/>
                  <Area type="monotone" dataKey="score" stroke="#10b981" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-700/50 relative z-10 backdrop-blur-sm">
              <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><BrainCircuit size={16}/> AI Synthesis</h4>
              <p className="text-sm text-emerald-50/80 leading-relaxed">
                Aggregate market sentiment has decoupled from fundamental prices over the past 48 hours. Negative news velocity in the auto sector is creating a localized volatility cluster.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 h-1/3">
            <h3 className="font-bold text-[#0f1f0f] text-lg mb-4 flex items-center gap-2"><Hash size={18} className="text-gray-400" /> Trending Themes</h3>
            <div className="space-y-3">
              {['#Q3Earnings', '#RateHike', '#CapexCycle', '#NPA_Concerns'].map((tag, i) => (
                <div key={i} className="flex justify-between items-center group cursor-pointer p-2 -mx-2 hover:bg-emerald-50 rounded-lg transition">
                  <span className="font-bold text-gray-700 group-hover:text-emerald-700">{tag}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold">{Math.floor(Math.random()*400)+100} hits</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}
