import { useState } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import { Database, UploadCloud, FileText, CheckCircle2, History, RotateCw, AlertTriangle, Settings2, Link2 } from 'lucide-react';

export default function DataManager() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, mapped, uploaded

  return (
    <PageLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1f0f] tracking-tight">Data Manager</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <Database size={16} /> Self-service ingestion, mapping schema, and sync diagnostics
          </p>
        </div>
        
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-white px-4 py-2 border border-emerald-100 rounded-xl shadow-sm hover:bg-emerald-50 text-emerald-700 font-bold text-sm transition transition">
            <Link2 size={16} /> API Keys
          </button>
          <button className="flex items-center gap-2 bg-[#2d6a4f] px-4 py-2 border border-emerald-100 rounded-xl shadow-md hover:bg-[#1b4332] text-white font-bold text-sm transition">
            <RotateCw size={16} /> Force Sync All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* L COL: Upload & Map */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-emerald-100 flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-xl text-gray-800">New Data Source Upload</h3>
              <p className="text-sm text-gray-500">Upload CSV/Excel dumps of fundamental data or custom portfolios.</p>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-[#2d6a4f] bg-emerald-50/50' : 'border-gray-300 hover:border-emerald-400 bg-gray-50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); setUploadStatus('mapped'); }}
            >
              <div className="w-16 h-16 bg-white shadow-sm border border-emerald-100 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={32} className="text-[#2d6a4f]" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg">Drag & drop your file here</h4>
              <p className="text-sm text-gray-400 mt-1 mb-6">Supports CSV, XLSX, JSON (Max 50MB)</p>
              <button className="bg-white border text-sm border-gray-200 shadow-sm px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-emerald-50 hover:text-[#2d6a4f] transition">
                Browse Files
              </button>
            </div>
            
            {uploadStatus === 'mapped' && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-4">
                <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
                  <Settings2 size={18} className="text-[#2d6a4f]" /> Schema Column Mapping
                </h4>
                
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Source CSV</div>
                  <div></div>
                  <div className="text-sm font-bold text-[#2d6a4f] uppercase tracking-wider mb-2">System Schema</div>

                  {/* Map rows */}
                  {[
                    { src: 'Comp_Name', dest: 'Company Name' },
                    { src: 'ISIN_Code', dest: 'ISIN' },
                    { src: 'Net_Rev_Q3', dest: 'Quarterly Revenue' },
                    { src: 'Gross_Margin_Pct', dest: 'Gross Margin' },
                  ].map((r, i) => (
                    <div className="contents" key={i}>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" readOnly value={r.src} className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm font-medium text-gray-600 outline-none" />
                      </div>
                      
                      <div className="flex justify-center text-emerald-400">
                        -------&gt;
                      </div>

                      <div>
                        <select className="w-full bg-emerald-50 border border-emerald-200 focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] rounded-lg py-2 px-3 text-sm font-bold text-[#2d6a4f] outline-none">
                          <option>{r.dest}</option>
                          <option>Ignore field</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setUploadStatus('uploaded')} className="bg-[#2d6a4f] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#1b4332] transition">
                    Confirm & Ingest
                  </button>
                </div>
              </div>
            )}
            
            {uploadStatus === 'uploaded' && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 animate-in fade-in zoom-in-95 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900">Ingestion Successful</h4>
                    <p className="text-sm text-emerald-700">Processed 482 rows and mapped 4 columns automatically.</p>
                  </div>
                </div>
                <button onClick={() => setUploadStatus('idle')} className="text-emerald-700 bg-white border border-emerald-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-100 transition">
                  Upload Another
                </button>
              </div>
            )}

          </div>

        </div>

        {/* R COL: Health & History */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Data Freshness</h3>
            <div className="space-y-4">
              {[
                { name: 'Live Market Index (NSE)', time: 'Under 1s', status: 'optimal' },
                { name: 'Global News Sentiment', time: '12m ago', status: 'optimal' },
                { name: 'Company Fundamentals', time: '24h ago', status: 'warning' },
                { name: 'RBI Regulatory Feeds', time: '3d ago', status: 'alert' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><History size={12}/> Sync: {s.time}</div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${s.status === 'optimal' ? 'bg-emerald-100 text-emerald-600' : s.status === 'warning' ? 'bg-amber-100 text-amber-500' : 'bg-rose-100 text-rose-500'}`}>
                    {s.status === 'alert' ? <AlertTriangle size={14}/> : <CheckCircle2 size={14} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Recent Sync Logs</h3>
            <div className="space-y-0">
              <div className="relative pl-6 pb-6 border-l-2 border-emerald-200 last:border-0 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                <p className="font-bold text-sm text-gray-800">Portfolio Update.csv</p>
                <p className="text-xs text-gray-500 mt-1">Manual upload by user • 2,410 entities parsed</p>
              </div>
              <div className="relative pl-6 pb-6 border-l-2 border-emerald-200 last:border-0 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                <p className="font-bold text-sm text-gray-800">Bloomberg API Webhook</p>
                <p className="text-xs text-gray-500 mt-1">Automated sync • 0 anomalies</p>
              </div>
              <div className="relative pl-6 pb-6 border-l-2 border-rose-200 last:border-0 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-rose-500 rounded-full border-4 border-white shadow-sm"></div>
                <p className="font-bold text-sm text-gray-800">BSE Intraday Fallback</p>
                <p className="text-xs text-rose-500 mt-1">Connection timeout, retried successfully after 4m</p>
              </div>
            </div>
            <button className="w-full text-center text-sm font-bold text-emerald-600 hover:text-emerald-800 transition mt-4 py-2 opacity-80 hover:opacity-100 hover:bg-emerald-50 rounded-lg">
              View full history
            </button>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}
