import { useState } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';
import { Settings as SettingsIcon, Bell, Palette, Database, FileSpreadsheet, Download, ShieldCheck, ToggleLeft, ToggleRight, Sliders } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [darkMode, setDarkMode] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <main className="flex-1 px-8 py-6 flex flex-col min-w-0 overflow-y-auto">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">System Settings</h1>
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <SettingsIcon size={16} /> Configure risk threshholds, exports, and platform behaviors
              </p>
            </div>
            
            <button className="bg-[#2d6a4f] px-6 py-2 border border-emerald-100 shadow-md rounded-xl font-bold text-white hover:bg-[#1b4332] transition">
              Save Changes
            </button>
          </div>

          <div className="flex gap-8 flex-1 min-h-0">
            
            {/* L COL: Tabs */}
            <div className="w-64 shrink-0 flex flex-col gap-2">
              {[
                { id: 'alerts', label: 'Alert Thresholds', icon: <Bell size={18} /> },
                { id: 'display', label: 'Display & Theme', icon: <Palette size={18} /> },
                { id: 'export', label: 'Export Defaults', icon: <Download size={18} /> },
                { id: 'data', label: 'API Integrations', icon: <Database size={18} /> },
                { id: 'security', label: 'Security & Access', icon: <ShieldCheck size={18} /> },
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition ${activeTab === t.id ? 'bg-[#2d6a4f] text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-white hover:border hover:border-emerald-100 hover:text-emerald-700 hover:shadow-sm'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* R COL: Content */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 overflow-y-auto">
              
              {activeTab === 'alerts' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <Sliders size={20} className="text-emerald-600" /> Risk Alert Parameters
                    </h2>
                    <button className="text-sm font-bold text-emerald-600 hover:underline">Reset to Defaults</button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-[1fr,150px] gap-6 items-center">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Volatility Ratio Spike</label>
                        <p className="text-xs text-gray-500">Trigger critical alert when IV/HV ratio exceeds threshold (Standard: 1.5x)</p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input type="number" defaultValue="1.50" step="0.05" className="w-full bg-transparent font-bold text-right text-emerald-700 font-mono outline-none" />
                        <span className="text-gray-400 font-bold">x</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr,150px] gap-6 items-center">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Sentiment Divergence</label>
                        <p className="text-xs text-gray-500">Flag when price moves UP but AI sentiment score drops below threshold</p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-gray-400 font-bold ml-2">Z-Score</span>
                        <input type="number" defaultValue="-2.0" step="0.1" className="w-full bg-transparent font-bold text-right text-rose-500 font-mono outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr,150px] gap-6 items-center">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Debt/Equity Redline</label>
                        <p className="text-xs text-gray-500">Global flag across all sectors except Financials when D/E breaks limit</p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input type="number" defaultValue="2.00" step="0.1" className="w-full bg-transparent font-bold text-right text-gray-700 font-mono outline-none" />
                        <span className="text-gray-400 font-bold">ratio</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <div>
                        <h4 className="font-bold text-emerald-900">Push Notifications & Email</h4>
                        <p className="text-xs text-emerald-700 mt-1">Receive daily digests and instant spike alerts to d.verma@sc.com</p>
                      </div>
                      <button onClick={() => setEmailAlerts(!emailAlerts)}>
                        {emailAlerts ? <ToggleRight size={40} className="text-[#2d6a4f]" /> : <ToggleLeft size={40} className="text-gray-300" />}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'display' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-100 pb-4">UI & Preferences</h2>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Interface Theme</label>
                        <p className="text-xs text-gray-500">Dark mode optimized for multi-monitor trading setups</p>
                      </div>
                      <button onClick={() => setDarkMode(!darkMode)}>
                        {darkMode ? <ToggleRight size={40} className="text-[#2d6a4f]" /> : <ToggleLeft size={40} className="text-gray-300" />}
                      </button>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Default Market Profile</label>
                      <p className="text-xs text-gray-500 mb-2">Primary sector to load on login and dashboard charts</p>
                      <select className="w-64 bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-emerald-700 outline-none">
                        <option>Banking</option>
                        <option>IT - Software</option>
                        <option>FMCG</option>
                        <option>Automobile</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Base Currency</label>
                      <p className="text-xs text-gray-500 mb-2">Display all financial metrics in standard denomination</p>
                      <select className="w-64 bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-emerald-700 outline-none">
                        <option>INR (Colossal/Crores)</option>
                        <option>USD ($ Millions)</option>
                        <option>INR (Absolute)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-100 pb-4">Report Builder Setup</h2>
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                    <FileSpreadsheet size={48} className="text-emerald-600 mb-4 opacity-50" />
                    <h4 className="font-bold text-lg text-gray-700 mb-2">PDF/Excel Template Engine</h4>
                    <p className="text-sm text-gray-500 max-w-sm mb-6">Configure committee-ready report headers, brand logos, and default pagination styles for 1-click downloads.</p>
                    <button className="bg-white border border-gray-200 shadow-sm px-6 py-2 rounded-lg font-bold text-emerald-700 hover:border-emerald-300 transition">
                      Upload Bank Logo
                    </button>
                  </div>
                </div>
              )}

              {/* Data & Security tabs placeholder */}
              {(activeTab === 'data' || activeTab === 'security') && (
                <div className="flex h-full items-center justify-center text-gray-400 font-bold animate-in fade-in zoom-in-95">
                  <p>Configuration panel loaded in read-only mode (Insufficient ACL privileges).</p>
                </div>
              )}

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
