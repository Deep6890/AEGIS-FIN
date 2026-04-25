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
    <div className="relative group/tip flex items-center justify-center w-full">
      {children}
      <div className="absolute left-full ml-3 z-50 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white text-[11px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-200">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-neutral-800" />
      </div>
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
    <aside className="fixed left-0 top-0 h-screen w-[64px] bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-center py-5 z-40 transition-colors duration-300">
      {/* Logo */}
      <Tip label="AEGIS-FIN">
        <div className="w-9 h-9 rounded-2xl bg-[var(--orange)] flex items-center justify-center mb-5 cursor-pointer shadow-orange hover:scale-105 transition-transform duration-200 shrink-0">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".9"/>
            <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Tip>

      <div className="w-6 h-px bg-[var(--border)] mb-3 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tip key={to} label={label}>
            <NavLink to={to} end={to === "/"}
              className={({ isActive }) =>
                `w-full h-10 flex items-center justify-center rounded-xl transition-all duration-150 group ${
                  isActive
                    ? "bg-[var(--orange)] text-white shadow-orange"
                    : "text-[var(--text-3)] hover:bg-[rgba(0,0,0,.05)] dark:hover:bg-[rgba(255,255,255,.05)] hover:text-[var(--text)]"
                }`
              }
            >
              {({ isActive }) => (
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} className="transition-transform duration-150 group-hover:scale-110" />
              )}
            </NavLink>
          </Tip>
        ))}
      </nav>

      <div className="w-6 h-px bg-[var(--border)] my-3 shrink-0" />

      {/* Bottom */}
      <div className="flex flex-col items-center gap-0.5 w-full px-2.5 shrink-0">
        <Tip label={dark ? "Light Mode" : "Dark Mode"}>
          <button onClick={toggle} className="w-full h-10 flex items-center justify-center rounded-xl text-[var(--text-3)] hover:bg-[rgba(0,0,0,.05)] dark:hover:bg-[rgba(255,255,255,.05)] hover:text-[var(--text)] transition-all duration-150 group">
            {dark ? <Sun size={18} strokeWidth={1.75} className="group-hover:rotate-45 transition-transform duration-300" /> : <Moon size={18} strokeWidth={1.75} className="group-hover:-rotate-12 transition-transform duration-300" />}
          </button>
        </Tip>
        <Tip label={user?.email || "Profile"}>
          <NavLink to="/profile"
            className={({ isActive }) =>
              `w-full h-10 flex items-center justify-center rounded-xl transition-all duration-150 ${
                isActive ? "bg-[var(--orange)] text-white" : "text-[var(--text-3)] hover:bg-[rgba(0,0,0,.05)] dark:hover:bg-[rgba(255,255,255,.05)] hover:text-[var(--text)]"
              }`
            }
          >
            {({ isActive }) =>
              user ? (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>{initials}</div>
              ) : (
                <User size={18} strokeWidth={1.75} />
              )
            }
          </NavLink>
        </Tip>
        {user && (
          <Tip label="Sign Out">
            <button onClick={handleSignOut} className="w-full h-10 flex items-center justify-center rounded-xl text-[var(--text-3)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-150">
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
