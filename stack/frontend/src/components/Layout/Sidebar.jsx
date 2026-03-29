import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Building2, TrendingUp, GitBranch,
  Brain, Globe, ShieldAlert, ChevronRight
} from "lucide-react";

const NAV = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/companies",   icon: Building2,       label: "Companies"    },
  { to: "/sectors",     icon: TrendingUp,      label: "Sectors"      },
  { to: "/correlation", icon: GitBranch,       label: "Correlation"  },
  { to: "/risk-engine", icon: Brain,           label: "Risk Engine"  },
  { to: "/macro",       icon: Globe,           label: "Macro Overlay"},
  { to: "/balance",     icon: ShieldAlert,     label: "Balance Sheet"},
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">AEGIS-FIN</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Risk Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-orange-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">AEGIS-FIN v2.0 · NSE India</p>
      </div>
    </aside>
  );
}
