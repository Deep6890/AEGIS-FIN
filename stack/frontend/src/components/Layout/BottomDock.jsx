import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldAlert, TrendingUp, MoreHorizontal } from 'lucide-react';

export default function BottomDock() {
  const items = [
    { id: 'dashboard', path: '/', icon: LayoutDashboard, title: 'Dashboard' },
    { id: 'companies', path: '/companies', icon: Building2, title: 'Companies' },
    { id: 'risk', path: '/risk-engine', icon: ShieldAlert, title: 'Risk Engine' },
    { id: 'sectors', path: '/sectors', icon: TrendingUp, title: 'Sectors' },
    // more links can go in a popover, but matching the prompt strictly:
    { id: 'more', path: '/more', icon: MoreHorizontal, title: 'More' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 bg-neutral-900 dark:bg-neutral-950 rounded-dock shadow-dock">
      {items.map(({ id, path, icon: Icon, title }) => (
        <NavLink
          key={id}
          to={path}
          title={title}
          className={({ isActive }) =>
            `p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
              isActive && path !== '/more'
                ? 'bg-brand-yellow text-neutral-900'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`
          }
        >
          <Icon size={20} />
        </NavLink>
      ))}
    </div>
  );
}
