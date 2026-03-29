import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, TrendingUp, GitBranch,
  Brain, Globe, ShieldAlert, Sun, Moon, LogOut,
  User, Upload, Activity, Stethoscope
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
];

function Tooltip({ label, children }) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-[#1a1a1a] text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl border border-gray-800">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-[#1a1a1a]" />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-white dark:bg-[#0f0f0f] border-r border-gray-100 dark:border-[#1f1f1f] flex flex-col items-center py-4 z-40 gap-1">

      {/* Logo */}
      <Tooltip label="AEGIS-FIN · Risk Intelligence">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center mb-3 cursor-pointer shadow-sm shadow-orange-500/30">
          <ShieldAlert size={18} className="text-white" />
        </div>
      </Tooltip>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tooltip key={to} label={label}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isActive
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                    : "text-gray-400 dark:text-gray-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500"
                }`
              }
            >
              {() => <Icon size={17} />}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1.5 mt-2 shrink-0">
        <Tooltip label={dark ? "Light Mode" : "Dark Mode"}>
          <button onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 transition-all">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </Tooltip>

        <Tooltip label={user?.email || "Profile"}>
          <NavLink to="/profile"
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive ? "bg-orange-500 text-white" : "text-gray-400 dark:text-gray-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500"
              }`
            }>
            {user
              ? <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center">{initials}</div>
              : <User size={17} />}
          </NavLink>
        </Tooltip>

        {user && (
          <Tooltip label="Sign Out">
            <button onClick={handleSignOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all">
              <LogOut size={17} />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
