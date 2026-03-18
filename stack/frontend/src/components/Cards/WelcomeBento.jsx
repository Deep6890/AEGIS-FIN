import { Sparkles } from 'lucide-react';

export default function WelcomeBento() {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-slate-900 text-white p-8 flex flex-col justify-end min-h-[160px] shadow-lg border border-slate-800">
      
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
        <div className="flex items-center gap-2 text-indigo-300 font-medium text-[12px] tracking-wider uppercase mb-1">
          <Sparkles size={14} />
          <span>Market Intelligence • {dateStr}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
          Good Morning. The market is showing resilient broad-based momentum today.
        </h1>
        <p className="text-[14px] text-slate-400 mt-1 max-w-xl">
          We've analyzed signals across all sectors. Risk distribution remains stable, and institutional flows hint at an emerging mid-cap rally.
        </p>
      </div>
    </div>
  );
}
