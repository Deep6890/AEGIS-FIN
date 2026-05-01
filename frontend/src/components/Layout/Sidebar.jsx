import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, TrendingUp, GitBranch,
  Brain, Globe, ShieldAlert, Sun, Moon, LogOut,
  User, Upload, Activity, Stethoscope, BarChart3, Zap, Compass,
  MoreHorizontal, X
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

// Primary nav — always visible in sidebar
const NAV_PRIMARY = [
  { to: "/",                    icon: LayoutDashboard, label: "Dashboard"      },
  { to: "/companies",           icon: Building2,       label: "Companies"      },
  { to: "/sectors",             icon: TrendingUp,      label: "Sectors"        },
  { to: "/correlation",         icon: GitBranch,       label: "Correlation"    },
  { to: "/risk-engine",         icon: Brain,           label: "Risk Engine"    },
  { to: "/macro",               icon: Globe,           label: "Macro Overlay"  },
  { to: "/balance",             icon: ShieldAlert,     label: "Balance Sheet"  },
  { to: "/market-intelligence", icon: BarChart3,       label: "Market Intel"   },
];

// Secondary nav — shown in "More" flyout panel
const NAV_MORE = [
  { to: "/upload",    icon: Upload,     label: "Upload CSV"  },
  { to: "/pipeline",  icon: Activity,   label: "Pipeline"    },
  { to: "/diagnostics", icon: Stethoscope, label: "Diagnostics" },
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
  const location = useLocation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [showMore, setShowMore] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close "More" panel when route changes
  React.useEffect(() => { setShowMore(false); }, [location.pathname]);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  // Is any "more" page currently active?
  const moreIsActive = NAV_MORE.some(n => location.pathname === n.to);

  // ── Mobile bottom dock ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
          style={{
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderTop: "1px solid rgba(255,255,255,0.85)",
          }}
        >
          <style>{`.dark nav[class*="fixed bottom-0"] { background: rgba(18,18,16,0.82) !important; border-color: rgba(255,255,255,0.08) !important; }`}</style>
          {NAV_PRIMARY.slice(0, 6).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-150 ${
                  isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"
                }`
              }
              style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
              title={label}
            >
              {({ isActive }) => <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />}
            </NavLink>
          ))}
          <NavLink to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-150 ${
                isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"
              }`
            }
            style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
          >
            {({ isActive }) =>
              user
                ? <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>{initials}</div>
                : <User size={20} strokeWidth={1.75} />
            }
          </NavLink>
          <button onClick={toggle} className="flex flex-col items-center justify-center py-2 px-2 rounded-lg text-neutral-500 dark:text-neutral-400">
            {dark ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
          </button>
        </nav>
        <div className="h-16" />
      </>
    );
  }

  // ── Desktop sidebar ───────────────────────────────────────────────────────
  return (
    <>
      {/* "More" flyout panel */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
          {/* Panel */}
          <div
            className="fixed left-[72px] top-1/2 -translate-y-1/2 z-50 py-3 px-2 flex flex-col gap-0.5"
            style={{
              width: 180,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.85)",
              borderRadius: 20,
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            }}
          >
            <style>{`.dark .more-panel { background: rgba(18,18,16,0.92) !important; border-color: rgba(255,255,255,0.08) !important; }`}</style>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">More Pages</span>
              <button onClick={() => setShowMore(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
            {NAV_MORE.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 ${
                    isActive
                      ? "text-white"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
                  }`
                }
                style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 1.75} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </>
      )}

      {/* Sidebar */}
      <aside
        className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center py-3 px-2 gap-0.5"
        style={{
          width: 56,
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: 28,
          boxShadow: "0 8px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <style>{`.dark aside[class*="fixed left-3"] { background: rgba(18,18,16,0.82) !important; border-color: rgba(255,255,255,0.08) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04) !important; }`}</style>

        {/* Logo */}
        <Tip label="AEGIS-FIN · Risk Intelligence">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-1 cursor-pointer hover:scale-105 transition-transform duration-200 shrink-0"
            style={{ background: "var(--orange)" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".95"/>
              <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Tip>

        <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-0.5 shrink-0" />

        {/* Primary nav */}
        <nav className="flex flex-col items-center gap-0.5 w-full shrink-0">
          {NAV_PRIMARY.map(({ to, icon: Icon, label }) => (
            <Tip key={to} label={label}>
              <NavLink to={to} end={to === "/"}
                className={({ isActive }) =>
                  `w-full h-8 flex items-center justify-center rounded-xl transition-all duration-150 group shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
                  }`
                }
                style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
              >
                {({ isActive }) => (
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} className="transition-transform duration-150 group-hover:scale-110" />
                )}
              </NavLink>
            </Tip>
          ))}
        </nav>

        {/* More button */}
        <Tip label="More Pages">
          <button
            onClick={() => setShowMore(v => !v)}
            className={`w-full h-8 flex items-center justify-center rounded-xl transition-all duration-150 group shrink-0 ${
              showMore || moreIsActive
                ? "text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
            }`}
            style={(showMore || moreIsActive) ? { background: "var(--orange)" } : {}}
          >
            <MoreHorizontal size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:scale-110" />
          </button>
        </Tip>

        <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-0.5 shrink-0" />

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-0.5 w-full shrink-0">
          <Tip label={dark ? "Light Mode" : "Dark Mode"}>
            <button onClick={toggle}
              className="w-full h-8 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white transition-all duration-150 group">
              {dark
                ? <Sun size={16} strokeWidth={1.75} className="group-hover:rotate-45 transition-transform duration-300" />
                : <Moon size={16} strokeWidth={1.75} className="group-hover:-rotate-12 transition-transform duration-300" />
              }
            </button>
          </Tip>

          <Tip label={user?.email || "Profile"}>
            <NavLink to="/profile"
              className={({ isActive }) =>
                `w-full h-8 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  isActive
                    ? "text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:text-neutral-900 dark:hover:text-white"
                }`
              }
              style={({ isActive }) => isActive ? { background: "var(--orange)" } : {}}
            >
              {({ isActive }) =>
                user ? (
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  }`}>{initials}</div>
                ) : (
                  <User size={16} strokeWidth={1.75} />
                )
              }
            </NavLink>
          </Tip>

          {user && (
            <Tip label="Sign Out">
              <button onClick={handleSignOut}
                className="w-full h-8 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-150">
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </Tip>
          )}
        </div>
      </aside>
    </>
  );
}
