import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid, MessageSquare, Building2,
  LandPlot, FileSpreadsheet, Newspaper, Database,
  Settings, User, LogOut,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

// All things are good just need to change the icons bit more and need to change the theme bit more 

// # assined to the given data 
const topItems = [
  { icon: LayoutGrid, path: '/', tooltip: 'Dashboard' },
  { icon: MessageSquare, path: '/chat', tooltip: 'AI Tutor' },
  { icon: Building2, path: '/companies', tooltip: 'Company Browser' },
  { icon: LandPlot, path: '/sectors', tooltip: 'Sector Intelligence' },
  { icon: FileSpreadsheet, path: '/balance-sheet', tooltip: 'Balance Sheet Hub' },
  { icon: Newspaper, path: '/news', tooltip: 'News Monitor' },
  { icon: Database, path: '/data', tooltip: 'Data Manager' },
];
const bottomItems = [
  { icon: User, path: '/profile', tooltip: 'Profile' },
  { icon: Settings, path: '/settings', tooltip: 'Settings' }
];

export default function VerticalNav() {
  const { currentUser } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="z-50 flex md:flex-col items-center bg-white py-2 md:py-4 shrink-0 border-t md:border-t-0 md:border-r border-emerald-100 fixed bottom-0 left-0 right-0 h-16 md:relative md:h-full md:w-[72px] overflow-x-auto md:overflow-visible">
      <div className="flex md:flex-col justify-between items-center bg-[#f4f9f6] md:border border-emerald-100 rounded-full md:py-5 px-3 md:px-0 h-full w-full md:w-[48px] flex-1">
        {/* Navigation items that is for routing*/}
        <div className="flex md:flex-col items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar w-full md:w-auto px-2 md:px-0">
          {topItems.map(({ icon: Icon, path, tooltip }, i) => (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              title={tooltip}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition
                ${path && location.pathname === path
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#8fa88f] hover:text-[#2d6a4f] hover:bg-emerald-100'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
          {/* Bottom navigation items */}
        <div className="hidden md:flex flex-col items-center gap-4 mt-auto">
          {bottomItems.map(({ icon: Icon, path, tooltip }, i) => (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              title={tooltip}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition
                ${path && location.pathname === path
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#8fa88f] hover:text-[#2d6a4f] hover:bg-emerald-100'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>
      {/* log out options  */}
      <div className="hidden md:flex flex-col items-center gap-3 pt-4">
        <div className="w-9 h-9 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700 text-xs font-bold">{currentUser?.initials ?? '?'}</div>
        <button className="text-[#8fa88f] hover:text-[#2d6a4f] transition">
          <LogOut size={16} />
        </button>
      </div>

    </div>
  );
}
