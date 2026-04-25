import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Building2, TrendingUp, GitBranch,
  Brain, Globe, ShieldAlert, Upload, Activity,
  Stethoscope, LineChart, MoreHorizontal, X
} from "lucide-react";

const PRIMARY_NAV = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard"   },
  { to: "/companies",   icon: Building2,       label: "Companies"   },
  { to: "/risk-engine", icon: Brain,           label: "Risk Engine" },
  { to: "/sectors",     icon: TrendingUp,      label: "Sectors"     },
];

const MORE_NAV = [
  { to: "/correlation", icon: GitBranch,   label: "Correlation"   },
  { to: "/macro",       icon: Globe,       label: "Macro Overlay" },
  { to: "/balance",     icon: ShieldAlert, label: "Balance Sheet" },
  { to: "/upload",      icon: Upload,      label: "Upload CSV"    },
  { to: "/pipeline",    icon: Activity,    label: "Pipeline"      },
  { to: "/diagnostics", icon: Stethoscope, label: "Diagnostics"   },
  { to: "/finplan",     icon: LineChart,   label: "FinPlan"       },
];

export default function FloatingDock() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Expanded menu */}
      {moreOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-white dark:bg-[#1A1C23] rounded-2xl shadow-card-lg border border-[#E5E1D8] dark:border-[#1F2128] p-2 min-w-[200px]">
            {MORE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                  ${isActive
                    ? "bg-[#E8C547]/15 text-[#0D0D0D] dark:text-[#E8C547] font-bold"
                    : "text-[#6B7280] hover:bg-[#F7F5F0] dark:hover:bg-[#22252E] hover:text-[#0D0D0D] dark:hover:text-white"
                  }
                `}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Dock */}
      <nav className="dock" id="floating-dock">
        {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              isActive ? "dock-item-active" : "dock-item"
            }
            title={label}
          >
            <Icon size={18} strokeWidth={isActive => isActive ? 2.5 : 2} />
          </NavLink>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-0.5" />

        {/* More button */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={moreOpen ? "dock-item-active" : "dock-item"}
          title="More"
        >
          {moreOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
        </button>
      </nav>
    </>
  );
}
