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
      <span className="
        absolute left-full ml-3 px-3 py-2
        bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl
        border border-neutral-900/[0.08] dark:border-white/[0.1]
        text-neutral-900 dark:text-white text-[11px] font-bold tracking-widest uppercase
        rounded-xl whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        opacity-0 pointer-events-none
        group-hover/tip:opacity-100 group-hover/tip:translate-x-1
        transition-all duration-300 z-50
      ">
        {label}
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
      fixed left-0 top-0 h-screen w-[72px]
      bg-white/50 dark:bg-white/[0.02] backdrop-blur-3xl
      border-r border-neutral-900/[0.08] dark:border-white/[0.05]
      flex flex-col items-center py-6 z-40 gap-6
      transition-colors duration-500
    ">
      {/* Premium Geometric Logo */}
      <Tip label="AEGIS-FIN">
        <div className="relative w-12 h-12 flex items-center justify-center cursor-pointer group mb-2">
          <div className="absolute inset-0 bg-brand-orange/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-brand-orange">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Tip>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-2 w-full overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `nav::-webkit-scrollbar { display: none !important; }`}} />
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tip key={to} label={label}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) => `
                relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group
                ${isActive ? "bg-neutral-900/[0.05] dark:bg-white/[0.05] text-brand-orange" : "text-neutral-500 hover:bg-neutral-900/[0.03] dark:hover:bg-white/[0.03] hover:text-neutral-900 dark:hover:text-white"}
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-orange rounded-r-full transition-all duration-300 ${isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"}`} />
                </>
              )}
            </NavLink>
          </Tip>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-2 mt-auto shrink-0 pb-2 w-full">
        <Tip label={dark ? "Light Mode" : "Dark Mode"}>
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-neutral-500 hover:bg-neutral-900/[0.03] dark:hover:bg-white/[0.03] hover:text-neutral-900 dark:hover:text-white transition-all duration-300 group"
          >
            {dark ? <Sun size={20} className="group-hover:rotate-90 transition-transform duration-500" /> : <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-500" />}
          </button>
        </Tip>

        <Tip label={user?.email || "Profile"}>
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group
              ${isActive ? "bg-neutral-900/[0.05] dark:bg-white/[0.05] text-brand-orange" : "text-neutral-500 hover:bg-neutral-900/[0.03] dark:hover:bg-white/[0.03] hover:text-neutral-900 dark:hover:text-white"}
            `}
          >
            {({ isActive }) => (
              <>
                {user ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isActive ? "bg-brand-orange text-white" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700"}`}>
                    {initials}
                  </div>
                ) : (
                  <User size={20} strokeWidth={isActive ? 2.5 : 2} />
                )}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-orange rounded-r-full transition-all duration-300 ${isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"}`} />
              </>
            )}
          </NavLink>
        </Tip>

        {user && (
          <Tip label="Sign Out">
            <button
               onClick={handleSignOut}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
            >
              <LogOut size={20} />
            </button>
          </Tip>
        )}
      </div>
    </aside>
  );
}
