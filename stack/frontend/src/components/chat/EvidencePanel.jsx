import { FileText, ExternalLink } from 'lucide-react';

// ── Trend dot ───────────────────────────────────────────────────────────────
const trendDot = { stable: 'bg-[#2d6a4f]', watch: 'bg-amber-400', risk: 'bg-red-400' };

// ── Table evidence card ─────────────────────────────────────────────────────
function TableCard({ card }) {
  return (
    <div className="bg-white border border-[#e4ebe4] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#f0f5f0]">
        <p className="text-[12px] font-bold text-[#1a2e1a]">{card.title}</p>
        <p className="text-[10px] text-[#9ab09a] mt-0.5">{card.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#f7f9f7]">
              <th className="text-left px-4 py-2 text-[#7a9a7a] font-semibold">Company</th>
              <th className="text-right px-3 py-2 text-[#7a9a7a] font-semibold">OCF</th>
              <th className="text-right px-3 py-2 text-[#7a9a7a] font-semibold">FCF%</th>
              <th className="text-right px-3 py-2 text-[#7a9a7a] font-semibold">DSO</th>
              <th className="text-center px-3 py-2 text-[#7a9a7a] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((r, i) => (
              <tr key={i} className="border-t border-[#f0f5f0] hover:bg-[#f7f9f7] transition-colors">
                <td className="px-4 py-2.5 font-semibold text-[#1a2e1a]">{r.company}</td>
                <td className="px-3 py-2.5 text-right text-[#4a6a4a]">{r.ocf}</td>
                <td className="px-3 py-2.5 text-right text-[#4a6a4a]">{r.fcf}</td>
                <td className="px-3 py-2.5 text-right text-[#4a6a4a]">{r.dso}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${trendDot[r.trend] ?? 'bg-slate-300'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Comparison evidence card ────────────────────────────────────────────────
function ComparisonCard({ card }) {
  const { left, right } = card;
  const scoreColor = s => s >= 80 ? 'text-[#2d6a4f]' : s >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="bg-white border border-[#e4ebe4] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#f0f5f0]">
        <p className="text-[12px] font-bold text-[#1a2e1a]">{card.title}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#f0f5f0] p-4 gap-0">
        {[left, right].map((side, i) => (
          <div key={i} className={`flex flex-col gap-2.5 ${i === 1 ? 'pl-4' : 'pr-4'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-[#1a2e1a]">{side.name}</span>
              <span className={`text-[18px] font-black ${scoreColor(side.score)}`}>{side.score}</span>
            </div>
            {[
              { label: 'Revenue', value: side.revenue },
              { label: 'EBIT Margin', value: side.margin },
              { label: 'Cash', value: side.cash },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-[10px] text-[#9ab09a]">{m.label}</span>
                <span className="text-[11px] font-semibold text-[#1a2e1a]">{m.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric evidence card ────────────────────────────────────────────────────
function MetricCard({ card }) {
  const sev = {
    risk:   { bg: 'bg-red-50',         text: 'text-red-600',      border: 'border-red-200' },
    watch:  { bg: 'bg-amber-50',        text: 'text-amber-700',    border: 'border-amber-200' },
    stable: { bg: 'bg-[#eaf5ee]',       text: 'text-[#1a3c2e]',   border: 'border-[#b5d8c5]' },
  }[card.severity] ?? { bg: 'bg-[#f7f9f7]', text: 'text-[#4a6a4a]', border: 'border-[#e4ebe4]' };

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-1.5 ${sev.bg} ${sev.border}`}>
      <span className="text-[10px] font-bold text-[#7a9a7a] uppercase tracking-widest">{card.title}</span>
      <span className={`text-[28px] font-black leading-none tracking-tighter ${sev.text}`}>{card.value}</span>
      <span className="text-[11px] font-semibold text-[#4a6a4a]">{card.company}</span>
      <span className="text-[10px] text-[#9ab09a]">{card.sub}</span>
    </div>
  );
}

// ── Citation row ────────────────────────────────────────────────────────────
function CitationRow({ citation }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#f0f5f0] last:border-0 group">
      <div className="w-6 h-6 rounded-lg bg-[#f0f5f0] flex items-center justify-center shrink-0">
        <FileText size={10} className="text-[#2d6a4f]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#1a2e1a] truncate">{citation.company} · {citation.row}</p>
        <p className="text-[9px] text-[#9ab09a] truncate">{citation.source}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-[#1a2e1a]">{citation.value}</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md
          ${citation.change.startsWith('+') ? 'bg-[#eaf5ee] text-[#2d6a4f]' : citation.change.startsWith('−') || citation.change.startsWith('-') ? 'bg-red-50 text-red-500' : 'bg-[#f7f9f7] text-[#7a9a7a]'}`}>
          {citation.change}
        </span>
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────
export default function EvidencePanel({ evidenceCards, citations }) {
  if (!evidenceCards?.length && !citations?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#f0f5f0] flex items-center justify-center">
          <FileText size={20} className="text-[#b5c9b5]" />
        </div>
        <p className="text-[12px] font-semibold text-[#9ab09a]">Evidence cards will appear here as the AI answers your questions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Evidence cards */}
      {evidenceCards?.map((card, i) => (
        <div key={i}>
          {card.type === 'table'      && <TableCard card={card} />}
          {card.type === 'comparison' && <ComparisonCard card={card} />}
          {card.type === 'metric'     && <MetricCard card={card} />}
        </div>
      ))}

      {/* Citations */}
      {citations?.length > 0 && (
        <div className="bg-white border border-[#e4ebe4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f5f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-[#2d6a4f]" />
              <span className="text-[11px] font-bold text-[#1a2e1a]">Data Sources</span>
            </div>
            <span className="text-[10px] text-[#9ab09a]">{citations.length} citations</span>
          </div>
          <div className="px-4 py-1">
            {citations.map(c => <CitationRow key={c.id} citation={c} />)}
          </div>
        </div>
      )}

    </div>
  );
}
