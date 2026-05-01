import React from "react";
import { NavLink, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Globe, List, Building2, ShieldAlert,
  TrendingUp, Users, GitBranch, Activity, Zap, Sun, Moon,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAegisData } from "../context/AegisDataContext";

const OVERVIEW_NAV = [
  { label: "Portfolio",  icon: LayoutDashboard, route: "/aegis/portfolio" },
  { label: "Sectors",    icon: Globe,           route: "/aegis/sectors"   },
  { label: "Companies",  icon: List,            route: "/aegis/companies" },
];

const COMPANY_NAV = [
  { label: "Profile",     icon: Building2,   route: (id) => `/aegis/company/${id}`             },
  { label: "Solvency",    icon: ShieldAlert, route: (id) => `/aegis/company/${id}/solvency`    },
  { label: "Cashflow",    icon: TrendingUp,  route: (id) => `/aegis/company/${id}/cashflow`    },
  { label: "Ownership",   icon: Users,       route: (id) => `/aegis/company/${id}/ownership`   },
  { label: "Correlation", icon: GitBranch,   route: (id) => `/aegis/company/${id}/correlation` },
  { label: "Market",      icon: Activity,    route: (id) => `/aegis/company/${id}/market`      },
  { label: "Stress",      icon: Zap,         route: (id) => `/aegis/company/${id}/stress`      },
];

function Tip({ label, children }) {
  return (
    <div style={{ position: "relative", width: "100%" }} className="group/tip">
      {children}
      <div
        className="group-hover/tip:opacity-100"
        style={{
          position: "absolute",
          left: "calc(100% + 12px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(15,15,15,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#F2F2F2",
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 8,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 200,
          opacity: 0,
          transition: "opacity 0.12s ease",
          letterSpacing: "0.02em",
        }}
      >
        {label}
        <div style={{
          position: "absolute", right: "100%", top: "50%",
          transform: "translateY(-50%)",
          borderWidth: 4, borderStyle: "solid",
          borderColor: "transparent rgba(15,15,15,0.95) transparent transparent",
        }} />
      </div>
    </div>
  );
}

function Sep() {
  return (
    <div style={{
      height: 1, width: "calc(100% - 16px)",
      background: "rgba(0,0,0,0.07)",
      margin: "4px 8px", flexShrink: 0,
    }} />
  );
}

export default function AegisSidebar() {
  const { id: routeCompanyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const { companies, portfolioInsights } = useAegisData();

  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Resolve company name for the pill
  const activeCompany = React.useMemo(() => {
    if (!routeCompanyId || !companies?.length) return null;
    return companies.find(c => c.id === routeCompanyId) ?? null;
  }, [routeCompanyId, companies]);

  // Get risk class for company pill color
  const companyInsight = React.useMemo(() => {
    if (!routeCompanyId || !portfolioInsights?.length) return null;
    return portfolioInsights.find(i => i.company_id === routeCompanyId) ?? null;
  }, [routeCompanyId, portfolioInsights]);

  const pillColor = React.useMemo(() => {
    const cls = companyInsight?.class;
    if (!cls) return "var(--orange)";
    const c = cls.toLowerCase();
    if (c.includes("high") || c.includes("distress")) return "#EF4444";
    if (c.includes("weak") || c.includes("watch")) return "var(--orange-2)";
    return "var(--orange)";
  }, [companyInsight]);

  const isActive = (route) => {
    if (typeof route === "string") return location.pathname === route;
    if (!routeCompanyId) return false;
    const href = route(routeCompanyId);
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const navBtnStyle = (active) => ({
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none", transition: "all 0.15s ease",
    background: active ? "var(--orange)" : "transparent",
    color: active ? "#fff" : dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.38)",
    border: "none", cursor: "pointer",
  });

  // ── Mobile bottom dock ─────────────────────────────────────────────────────
  if (isMobile) {
    const allNav = [...OVERVIEW_NAV, ...COMPANY_NAV.slice(0, 3)];
    return (
      <>
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "space-around",
          padding: "8px 12px",
          background: dark ? "rgba(18,18,16,0.94)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
        }}>
          {allNav.map(item => {
            const Icon = item.icon;
            const href = typeof item.route === "string" ? item.route : (routeCompanyId ? item.route(routeCompanyId) : null);
            const active = isActive(item.route);
            if (!href) return (
              <span key={item.label} style={{ opacity: 0.25, cursor: "not-allowed", padding: "6px 8px", color: "var(--text-3)" }}>
                <Icon size={20} strokeWidth={1.75} />
              </span>
            );
            return (
              <NavLink key={item.label} to={href} style={{ padding: "6px 8px", borderRadius: 10, textDecoration: "none", background: active ? "var(--orange)" : "transparent", color: active ? "#fff" : dark ? "#888" : "#ABABAB", transition: "all 0.15s" }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              </NavLink>
            );
          })}
          <button onClick={toggle} style={{ padding: "6px 8px", background: "transparent", border: "none", cursor: "pointer", color: dark ? "#888" : "#ABABAB" }}>
            {dark ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
          </button>
        </nav>
        <div style={{ height: 64 }} />
      </>
    );
  }

  // ── Desktop pill sidebar ───────────────────────────────────────────────────
  return (
    <aside
      style={{
        position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)",
        zIndex: 40, width: 52,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "10px 6px",
        background: dark ? "rgba(16,16,14,0.92)" : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        border: dark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.95)",
        borderRadius: 28,
        boxShadow: dark
          ? "0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 8px 48px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        overflowX: "visible",
        gap: 2,
        scrollbarWidth: "none",
      }}
    >
      {/* Logo */}
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: "linear-gradient(135deg, #E8572A 0%, #C2410C 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginBottom: 2,
          boxShadow: "0 4px 14px rgba(232,87,42,0.4)",
        }}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".95" />
            <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Tip>

      <Sep />

      {/* Overview nav */}
      {OVERVIEW_NAV.map(item => {
        const Icon = item.icon;
        const active = isActive(item.route);
        return (
          <Tip key={item.label} label={item.label}>
            <NavLink to={item.route} style={navBtnStyle(active)}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
            </NavLink>
          </Tip>
        );
      })}

      <Sep />

      {/* Company context pill — shows selected company ticker */}
      {routeCompanyId && activeCompany ? (
        <Tip label={`${activeCompany.name} · Click to change`}>
          <button
            onClick={() => navigate("/aegis/companies")}
            style={{
              width: 36, height: 22, borderRadius: 8,
              background: pillColor,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 2,
              boxShadow: `0 2px 8px ${pillColor}55`,
            }}
          >
            <span style={{
              fontSize: 8, fontWeight: 800, color: "#fff",
              letterSpacing: "0.04em", textTransform: "uppercase",
              maxWidth: 30, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "'DM Mono', monospace",
            }}>
              {activeCompany.ticker?.replace(".NS", "").replace(".BO", "").slice(0, 5)}
            </span>
          </button>
        </Tip>
      ) : (
        <Tip label="Select a company to unlock analysis">
          <button
            onClick={() => navigate("/aegis/companies")}
            style={{
              width: 36, height: 22, borderRadius: 8,
              background: "rgba(0,0,0,0.06)",
              border: "1px dashed rgba(0,0,0,0.15)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>CO.</span>
          </button>
        </Tip>
      )}

      {/* Company-scoped nav */}
      {COMPANY_NAV.map(item => {
        const Icon = item.icon;
        const href = routeCompanyId ? item.route(routeCompanyId) : null;
        const active = isActive(item.route);

        if (!href) {
          return (
            <Tip key={item.label} label={`${item.label} — select a company first`}>
              <span style={{ ...navBtnStyle(false), opacity: 0.22, cursor: "not-allowed" }}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
            </Tip>
          );
        }

        return (
          <Tip key={item.label} label={item.label}>
            <NavLink
              to={href}
              end={item.label === "Profile"}
              style={({ isActive: na }) => navBtnStyle(na || active)}
            >
              {({ isActive: na }) => {
                const act = na || active;
                return <Icon size={16} strokeWidth={act ? 2.5 : 1.75} />;
              }}
            </NavLink>
          </Tip>
        );
      })}

      <Sep />

      {/* Theme toggle */}
      <Tip label={dark ? "Light Mode" : "Dark Mode"}>
        <button onClick={toggle} style={navBtnStyle(false)}>
          {dark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
        </button>
      </Tip>
    </aside>
  );
}
