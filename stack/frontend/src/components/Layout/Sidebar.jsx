import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, TrendingUp, GitBranch,
  Brain, Globe, ShieldAlert, Sun, Moon, LogOut,
  User, Upload, Activity, Stethoscope, LineChart
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/companies",   icon: Building2,       label: "Companies"    },
  { to: "/sectors",     icon: TrendingUp,      label: "Sectors"      },
  { to: "/correlation", icon: GitBranch,       label: "Correlation"  },
  { to: "/risk-engine", icon: Brain,           label: "Risk Engine"  },
  { to: "/macro",       icon: Globe,           label: "Macro Overlay"},
  { to: "/balance",     icon: ShieldAlert,     label: "Balance Sheet"},
  { to: "/upload",      icon: Upload,          label: "Upload CSV"   },
  { to: "/pipeline",    icon: Activity,        label: "Pipeline"     },
  { to: "/diagnostics", icon: Stethoscope,     label: "Diagnostics"  },
  { to: "/finplan",     icon: LineChart,       label: "FinPlan"      },
];

function Tip({ label, children }) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      <span className="
        absolute left-full ml-3 px-2.5 py-1.5
        bg-[#0D0D0D] dark:bg-[#1A1C23] text-white text-xs font-semibold
        rounded-xl whitespace-nowrap shadow-lg
        opacity-0 pointer-events-none
        group-hover/tip:opacity-100
        transition-opacity duration-150 z-50
      ">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0D0D0D] dark:border-r-[#1A1C23]" />
      </span>
    </div>
  );
}

export default function Sidebar() {
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/login"); };
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <aside className="
      fixed left-0 top-0 h-screen w-[60px]
      bg-white dark:bg-[#1A1C23]
      border-r border-[#E5E1D8] dark:border-[#1F2128]
      flex flex-col items-center py-4 z-40 gap-1
    ">
      {/* Logo */}
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div className="w-9 h-9 rounded-xl bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center mb-3 cursor-pointer shrink-0">
          <ShieldAlert size={17} className="text-[#E8C547] dark:text-[#0D0D0D]" />
        </div>
      </Tip>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2 overflow-y-auto scrollbar-none">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tip key={to} label={label}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) => `
                w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0
                ${isActive
                  ? "bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D] shadow-sm"
                  : "text-[#6B7280] hover:bg-[#F5F2EC] dark:hover:bg-[#1F2128] hover:text-[#0D0D0D] dark:hover:text-[#E8E6E0]"
                }
              `}
            >
              {() => <Icon size={17} />}
            </NavLink>
          </Tip>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1 mt-2 shrink-0">
        <Tip label={dark ? "Light Mode" : "Dark Mode"}>
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-[#F5F2EC] dark:hover:bg-[#1F2128] hover:text-[#0D0D0D] dark:hover:text-[#E8E6E0] transition-all"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </Tip>

        <Tip label={user?.email || "Profile"}>
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              w-10 h-10 rounded-xl flex items-center justify-center transition-all
              ${isActive
                ? "bg-[#0D0D0D] dark:bg-[#E8C547] text-[#E8C547] dark:text-[#0D0D0D]"
                : "text-[#6B7280] hover:bg-[#F5F2EC] dark:hover:bg-[#1F2128]"
              }
            `}
          >
            {user
              ? <div className="w-7 h-7 rounded-lg bg-[#E8C547]/20 text-[#8B6914] dark:text-[#E8C547] text-xs font-bold flex items-center justify-center">{initials}</div>
              : <User size={17} />
            }
          </NavLink>
        </Tip>

        {user && (
          <Tip label="Sign Out">
            <button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all"
            >
              <LogOut size={17} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
