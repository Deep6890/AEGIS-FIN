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

function Tip({ label, children }) {
  return (
    <div className="relative group/tip flex items-center justify-center w-full">
      {children}
      <div className="absolute left-full ml-3 z-[100] px-3 py-2 rounded-xl whitespace-nowrap shadow-lg pointer-events-none
        bg-neutral-900/90 dark:bg-neutral-800/90 backdrop-blur-xl text-white text-[11px] font-medium
        opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0
        transition-all duration-200 border border-white/10">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900/90 dark:border-r-neutral-800/90" />
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
    <aside
      className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center py-4 px-2 gap-1"
      style={{
        width: 56,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderRadius: 28,
        boxShadow: "0 8px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
        overflowX: "hidden",
        overflowY: "hidden",
      }}
    >
      {/* Dark mode override */}
      <style>{`.dark aside[class*="fixed left-3"] { background: rgba(18,18,16,0.82) !important; border-color: rgba(255,255,255,0.08) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04) !important; }`}</style>

      {/* AEGIS Logo */}
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-2 cursor-pointer hover:scale-105 transition-transform duration-200 shrink-0 shadow-orange"
          style={{ background: "var(--orange)" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".95"/>
            <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Tip>

      {/* Divider */}
      <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-1 shrink-0" />

      {/* Nav */}
      <nav className="flex flex-col items-center gap-0.5 w-full min-h-0"
        style={{ overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tip key={to} label={label}>
            <NavLink to={to} end={to === "/"}
              className={({ isActive }) =>
                `w-full h-9 flex items-center justify-center rounded-xl transition-all duration-150 group shrink-0 ${
                  isActive
                    ? "text-white shadow-orange"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
                }`
              }
              style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
            >
              {({ isActive }) => (
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.75} className="transition-transform duration-150 group-hover:scale-110" />
              )}
            </NavLink>
          </Tip>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-1 shrink-0" />

      {/* Bottom */}
      <div className="flex flex-col items-center gap-0.5 w-full shrink-0">
        <Tip label={dark ? "Light Mode" : "Dark Mode"}>
          <button onClick={toggle}
            className="w-full h-9 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white transition-all duration-150 group">
            {dark
              ? <Sun size={17} strokeWidth={1.75} className="group-hover:rotate-45 transition-transform duration-300" />
              : <Moon size={17} strokeWidth={1.75} className="group-hover:-rotate-12 transition-transform duration-300" />
            }
          </button>
        </Tip>

        <Tip label={user?.email || "Profile"}>
          <NavLink to="/profile"
            className={({ isActive }) =>
              `w-full h-9 flex items-center justify-center rounded-xl transition-all duration-150 ${
                isActive
                  ? "text-white"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
              }`
            }
            style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
          >
            {({ isActive }) =>
              user ? (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}>{initials}</div>
              ) : (
                <User size={17} strokeWidth={1.75} />
              )
            }
          </NavLink>
        </Tip>

        {user && (
          <Tip label="Sign Out">
            <button onClick={handleSignOut}
              className="w-full h-9 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-150">
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
