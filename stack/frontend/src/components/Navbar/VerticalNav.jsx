import {
  LayoutGrid, MessageSquare, BarChart3,
  CalendarDays, Users, FileText,
  Settings, HelpCircle, LogOut,
} from 'lucide-react';

const topItems    = [LayoutGrid, MessageSquare, BarChart3, CalendarDays, Users, FileText];
const bottomItems = [Settings, HelpCircle];

export default function VerticalNav() {
  return (
    <div className="h-full w-[72px] flex flex-col items-center bg-white py-4 shrink-0 border-r border-slate-200">

      <div className="flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-full py-5 w-[48px] flex-1">

        <div className="flex flex-col items-center gap-4">
          {topItems.map((Icon, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition">
              <Icon size={17} />
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {bottomItems.map((Icon, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition">
              <Icon size={17} />
            </button>
          ))}
        </div>

      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="w-9 h-9 rounded-full border border-slate-300 bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold">D</div>
        <button className="text-slate-400 hover:text-indigo-500 transition">
          <LogOut size={16} />
        </button>
      </div>

    </div>
  );
}
