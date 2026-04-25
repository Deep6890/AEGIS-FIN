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
  { to: "/finplan",     icon: LineChart,       label: "FinPlan App"  },
];

function Tip({ label, children }) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-black dark:bg-[#1a1a1a] text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-black dark:border-r-[#1a1a1a]" />
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
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div className="w-9 h-9 rounded-xl bg-black dark:bg-[#FFC224] flex items-center justify-center mb-3 cursor-pointer">
          <ShieldAlert size={17} className="text-[#FFC224] dark:text-black" />
        </div>
      </Tip>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tip key={to} label={label}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isActive
                    ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black shadow-md"
                    : "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-black dark:hover:text-white"
                }`
              }
            >
              {() => <Icon size={17} />}
            </NavLink>
          </Tip>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1 mt-2 shrink-0">
        <Tip label={dark ? "Light Mode" : "Dark Mode"}>
          <button onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-black dark:hover:text-white transition-all">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </Tip>

        <Tip label={user?.email || "Profile"}>
          <NavLink to="/profile"
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? "bg-black dark:bg-[#FFC224] text-[#FFC224] dark:text-black"
                  : "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-black dark:hover:text-white"
              }`
            }>
            {user
              ? <div className="w-7 h-7 rounded-lg bg-[#FFC224]/20 text-[#b38a00] dark:text-[#FFC224] text-xs font-black flex items-center justify-center">{initials}</div>
              : <User size={17} />}
          </NavLink>
        </Tip>

        {user && (
          <Tip label="Sign Out">
            <button onClick={handleSignOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all">
              <LogOut size={17} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
