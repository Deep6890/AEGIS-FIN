import { useState, useCallback } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Activity, CalendarDays, RefreshCcw, Layers } from 'lucide-react';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Nifty Bank' }, style: { backgroundColor: '#10b981', color: 'white', fontWeight: 'bold' } },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'HDFC Bank' }, style: { backgroundColor: '#f1f5f9' } },
  { id: '3', position: { x: 400, y: 100 }, data: { label: 'ICICI Bank' }, style: { backgroundColor: '#f1f5f9' } },
  { id: '4', position: { x: 250, y: 200 }, data: { label: 'RBI Rate Hike' }, style: { backgroundColor: '#f43f5e', color: 'white', fontWeight: 'bold' } },
  { id: '5', position: { x: -50, y: 200 }, data: { label: 'IT Index' }, style: { backgroundColor: '#06b6d4', color: 'white' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981', strokeWidth: 3 } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#10b981', strokeWidth: 3 } },
  { id: 'e4-1', source: '4', target: '1', label: 'Negative impact', style: { stroke: '#f43f5e', strokeWidth: 2 } },
  { id: 'e4-5', source: '5', target: '4', style: { stroke: '#94a3b8', strokeDasharray: '5 5' } }
];

const mockHeatmap = [
  [1.0, 0.82, -0.45, 0.12, 0.65],
  [0.82, 1.0, -0.38, 0.22, 0.58],
  [-0.45, -0.38, 1.0, 0.15, -0.25],
  [0.12, 0.22, 0.15, 1.0, 0.42],
  [0.65, 0.58, -0.25, 0.42, 1.0]
];
const labels = ['BANK', 'HDFCBANK', 'IT', 'INFY', 'AUTO'];

const getColor = (val) => {
  if (val === 1) return 'bg-emerald-900 border-emerald-800 text-white';
  if (val > 0.7) return 'bg-emerald-600 border-emerald-700 text-white';
  if (val > 0.3) return 'bg-emerald-300 border-emerald-400 text-emerald-900';
  if (val > 0) return 'bg-emerald-100 border-emerald-200 text-emerald-800';
  if (val > -0.3) return 'bg-rose-100 border-rose-200 text-rose-800';
  return 'bg-rose-400 border-rose-500 text-white';
};

export default function CorrelationExplorer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeTab, setActiveTab] = useState('network');

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <main className="flex-1 px-6 py-5 flex flex-col min-w-0">
          
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0f1f0f] tracking-tight">Correlation Explorer</h1>
              <p className="text-sm text-[#8fa88f] mt-1">Discover hidden relationships between sectors, stocks, and macro events.</p>
            </div>
            
            <div className="bg-white border border-emerald-100 p-1 rounded-xl flex gap-1 shadow-sm">
              <button onClick={() => setActiveTab('network')} className={`p-2 rounded-lg flex items-center gap-2 text-sm transition ${activeTab === 'network' ? 'bg-[#2d6a4f] text-white font-bold shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Network size={16} /> Network Graph
              </button>
              <button onClick={() => setActiveTab('heatmap')} className={`p-2 rounded-lg flex items-center gap-2 text-sm transition ${activeTab === 'heatmap' ? 'bg-[#2d6a4f] text-white font-bold shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Layers size={16} /> Matrix Heatmap
              </button>
              <button onClick={() => setActiveTab('flow')} className={`p-2 rounded-lg flex items-center gap-2 text-sm transition ${activeTab === 'flow' ? 'bg-[#2d6a4f] text-white font-bold shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Activity size={16} /> Sector Flow
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden relative flex flex-col">
            
            {activeTab === 'network' && (
              <div className="flex-1 relative">
                <div className="absolute top-4 left-4 z-10 w-72 bg-white/90 backdrop-blur rounded-xl shadow border border-gray-100 p-4">
                  <h3 className="font-bold text-[#0f1f0f] mb-3 flex items-center gap-2">
                    <RefreshCcw size={16} className="text-emerald-500" /> Dynamic Filtering
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-400 block mb-1">Central Node</span>
                      <select className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm">
                        <option>Nifty Bank</option>
                        <option>Nifty IT</option>
                        <option>RBI Repo Rate</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 block mb-1">Minimum Correlation</span>
                      <input type="range" className="w-full accent-emerald-600" min="0" max="100" defaultValue="50"/>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 block mb-1">Time Horizon</span>
                      <div className="flex gap-1">
                        {['1M', '3M', '6M', '1Y'].map(t => (
                          <button key={t} className={`flex-1 text-xs py-1 rounded border ${t === '3M' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'border-gray-100'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <ReactFlow 
                  nodes={nodes} 
                  edges={edges} 
                  onNodesChange={onNodesChange} 
                  onEdgesChange={onEdgesChange}
                  fitView
                >
                  <Background color="#10b981" gap={24} size={2} className="opacity-10" />
                  <Controls />
                </ReactFlow>
              </div>
            )}

            {activeTab === 'heatmap' && (
              <div className="flex-1 p-8 overflow-auto flex items-center justify-center bg-gray-50">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold mb-6 text-gray-800 flex justify-between items-center">
                    Cross-Asset Correlation Matrix
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500 font-normal">Pearson R (90 Days)</span>
                  </h3>
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3"></th>
                        {labels.map(l => (
                          <th key={l} className="p-3 text-xs font-bold text-gray-500 tracking-wider text-center border-b border-gray-100">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockHeatmap.map((row, i) => (
                        <tr key={i}>
                          <td className="p-3 text-xs font-bold text-gray-500 tracking-wider text-right border-r border-gray-100">{labels[i]}</td>
                          {row.map((val, col) => (
                            <td key={col} className="p-1">
                              <div className={`w-12 h-12 flex items-center justify-center rounded text-xs font-bold shadow-sm border hover:scale-110 transition cursor-pointer ${getColor(val)}`}>
                                {val.toFixed(2)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Strong Negative</span>
                      <div className="flex-1 h-3 mx-4 rounded-full bg-gradient-to-r from-rose-500 via-emerald-100 to-emerald-700"></div>
                      <span>Strong Positive</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'flow' && (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
                <div className="max-w-3xl w-full">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Sector Rotation Simulation</h3>
                  <p className="text-gray-500 mb-8">Visualization of liquidity flows during rate cycles. (Placeholder for flow diagram)</p>
                  
                  <div className="relative h-64 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <CalendarDays size={48} className="text-emerald-400 mx-auto mb-4 opacity-50 block" />
                      <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase">Select an event in the timeline</p>
                    </div>
                    {/* Simplified macro-event timeline slider overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%]">
                      <input type="range" className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer border-0" defaultValue="50"/>
                      <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Rate Hike</span>
                        <span>Budget</span>
                        <span>Q3 Earnings</span>
                        <span>CPI Data</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}
