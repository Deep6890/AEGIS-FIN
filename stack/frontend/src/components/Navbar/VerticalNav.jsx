import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid, MessageSquare, Building2, Network,
  LandPlot, FileSpreadsheet, Newspaper, ShieldAlert, Database,
  Settings, User, LogOut,
} from 'lucide-react';

const topItems = [
  { icon: LayoutGrid, path: '/', tooltip: 'Dashboard' },
  { icon: MessageSquare, path: '/chat', tooltip: 'AI Tutor' },
  { icon: Building2, path: '/companies', tooltip: 'Company Browser' },
  { icon: LandPlot, path: '/sectors', tooltip: 'Sector Intelligence' },
  { icon: Network, path: '/correlations', tooltip: 'Correlation Explorer' },
  { icon: FileSpreadsheet, path: '/balance-sheet', tooltip: 'Balance Sheet Hub' },
  { icon: Newspaper, path: '/news', tooltip: 'News Monitor' },
  { icon: ShieldAlert, path: '/risk', tooltip: 'Risk Radar' },
  { icon: Database, path: '/data', tooltip: 'Data Manager' },
];
const bottomItems = [
  { icon: User, path: '/profile', tooltip: 'Profile' },
  { icon: Settings, path: '/settings', tooltip: 'Settings' }
];

export default function VerticalNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-full w-[72px] flex flex-col items-center bg-white py-4 shrink-0 border-r border-emerald-100">

      <div className="flex flex-col justify-between bg-[#f4f9f6] border border-emerald-100 rounded-full py-5 w-[48px] flex-1">

        <div className="flex flex-col items-center gap-4">
          {topItems.map(({ icon: Icon, path, tooltip }, i) => (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              title={tooltip}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition
                ${ path && location.pathname === path
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#8fa88f] hover:text-[#2d6a4f] hover:bg-emerald-100'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {bottomItems.map(({ icon: Icon, path, tooltip }, i) => (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              title={tooltip}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition
                ${ path && location.pathname === path
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#8fa88f] hover:text-[#2d6a4f] hover:bg-emerald-100'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>

      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="w-9 h-9 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700 text-xs font-bold">D</div>
        <button className="text-[#8fa88f] hover:text-[#2d6a4f] transition">
          <LogOut size={16} />
        </button>
      </div>

    </div>
  );
}
