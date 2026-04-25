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
        bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-medium
        rounded-xl whitespace-nowrap shadow-card-md
        opacity-0 pointer-events-none
        group-hover/tip:opacity-100
        transition-opacity duration-150 z-50
      ">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-neutral-800" />
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
      bg-white dark:bg-neutral-900
      border-r border-neutral-200 dark:border-neutral-800
      flex flex-col items-center py-4 z-40 gap-1
    ">
      {/* Logo */}
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center mb-3 cursor-pointer shadow-sm">
          <ShieldAlert size={17} className="text-white" />
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
                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0
                ${isActive
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
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
            className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all"
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
                ? "bg-brand-orange text-white"
                : "text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }
            `}
          >
            {user
              ? <div className="w-7 h-7 rounded-lg bg-brand-orange/10 text-brand-orange text-xs font-bold flex items-center justify-center">{initials}</div>
              : <User size={17} />
            }
          </NavLink>
        </Tip>

        {user && (
          <Tip label="Sign Out">
            <button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all"
            >
              <LogOut size={17} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
