import React, { useState, useRef } from "react";
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  Building2, TrendingUp, DollarSign, Tag
} from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";

const REQUIRED_COLS = [
  "Company Name", "NSE/BSE Ticker", "Exchange Index",
  "SME Type", "Sector", "Industry", "Loan Taken",
  "Estimated Total Debt (Cr)", "Estimated Market Cap (Cr)"
];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

const SECTOR_COLOR = {
  Technology: "badge-blue",
  Healthcare: "badge-green",
  Financials: "badge-orange",
  Industrials: "badge-amber",
  "Real Estate": "badge-amber",
  Energy: "badge-red",
  Consumer: "badge-orange",
  Textiles: "badge-gray",
  Packaging: "badge-gray",
};

export default function UploadCSV() {
  const [rows, setRows]       = useState([]);
  const [error, setError]     = useState("");
  const [fileName, setFileName] = useState("");
  const [search, setSearch]   = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [loanFilter, setLoanFilter]     = useState("all");
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result);
        const missing = REQUIRED_COLS.filter(c => !Object.keys(parsed[0] || {}).includes(c));
        if (missing.length) {
          setError(`Missing columns: ${missing.join(", ")}`);
          return;
        }
        setRows(parsed);
      } catch {
        setError("Failed to parse CSV. Check the format.");
      }
    };
    reader.readAsText(file);
  };

  const onDrop = e => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const sectors = ["all", ...new Set(rows.map(r => r["Sector"]).filter(Boolean))];

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r["Company Name"]?.toLowerCase().includes(q) ||
      r["NSE/BSE Ticker"]?.toLowerCase().includes(q) ||
      r["Industry"]?.toLowerCase().includes(q);
    const matchSector = sectorFilter === "all" || r["Sector"] === sectorFilter;
    const matchLoan   = loanFilter === "all" ||
      (loanFilter === "yes" && r["Loan Taken"]?.toLowerCase() === "yes") ||
      (loanFilter === "no"  && r["Loan Taken"]?.toLowerCase() === "no");
    return matchSearch && matchSector && matchLoan;
  });

  // Stats
  const totalDebt   = rows.reduce((s, r) => s + (parseFloat(r["Estimated Total Debt (Cr)"]) || 0), 0);
  const totalMcap   = rows.reduce((s, r) => s + (parseFloat(r["Estimated Market Cap (Cr)"]) || 0), 0);
  const withLoan    = rows.filter(r => r["Loan Taken"]?.toLowerCase() === "yes").length;

  return (
    <PageLayout title="Upload CSV">
      <div className="space-y-5">

        {/* Drop zone */}
        {!rows.length && (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="card p-12 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-orange-200 dark:border-orange-800 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Upload size={26} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Drop your CSV here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Must match <span className="font-mono text-orange-500">sme_companies_loan_analysis.csv</span> format</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {REQUIRED_COLS.slice(0, 5).map(c => (
                <span key={c} className="badge-gray text-[10px]">{c}</span>
              ))}
              <span className="badge-gray text-[10px]">+{REQUIRED_COLS.length - 5} more</span>
            </div>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* File info + clear */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-400">{rows.length} companies loaded</span>
              </div>
              <button onClick={() => { setRows([]); setFileName(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <X size={13} /> Clear
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Building2,   label: "Total Companies",    value: rows.length,                        color: "text-orange-500" },
                { icon: DollarSign,  label: "Total Debt (Cr)",    value: `₹${(totalDebt/100).toFixed(0)}Cr`, color: "text-red-500"    },
                { icon: TrendingUp,  label: "Total MCap (Cr)",    value: `₹${(totalMcap/100).toFixed(0)}Cr`, color: "text-emerald-500"},
                { icon: Tag,         label: "With Loans",         value: `${withLoan} / ${rows.length}`,     color: "text-amber-500"  },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={color} />
                    <p className="stat-label">{label}</p>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search company, ticker, industry..."
                className="flex-1 min-w-48 px-3 py-2 text-xs input-base"
              />
              <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
                className="px-3 py-2 text-xs input-base">
                {sectors.map(s => <option key={s} value={s}>{s === "all" ? "All Sectors" : s}</option>)}
              </select>
              <select value={loanFilter} onChange={e => setLoanFilter(e.target.value)}
                className="px-3 py-2 text-xs input-base">
                <option value="all">All Loans</option>
                <option value="yes">Has Loan</option>
                <option value="no">No Loan</option>
              </select>
            </div>

            <p className="text-xs text-gray-400">{filtered.length} of {rows.length} companies</p>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {["#","Company","Ticker","Exchange","Sector","Industry","Loan","Debt (Cr)","MCap (Cr)"].map(h => (
                        <th key={h} className="text-left py-3 px-3 stat-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-orange-50/20 dark:hover:bg-orange-900/10 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-gray-400">{r["Sr No"] || i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white text-xs">{r["Company Name"]}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-orange-500">{r["NSE/BSE Ticker"]}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{r["Exchange Index"]}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            r["Sector"] === "Technology" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                            r["Sector"] === "Healthcare" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                            r["Sector"] === "Financials" ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                            r["Sector"] === "Energy"     ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                            "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}>{r["Sector"]}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{r["Industry"]}</td>
                        <td className="py-2.5 px-3">
                          {r["Loan Taken"]?.toLowerCase() === "yes"
                            ? <span className="badge-red">Yes</span>
                            : <span className="badge-green">No</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                          {parseFloat(r["Estimated Total Debt (Cr)"]) > 0 ? `₹${r["Estimated Total Debt (Cr)"]}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                          ₹{r["Estimated Market Cap (Cr)"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
