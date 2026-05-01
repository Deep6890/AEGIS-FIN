import React from "react";
import { NavLink, useParams, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Globe,
  List,
  Building2,
  ShieldAlert,
  TrendingUp,
  Users,
  GitBranch,
  Activity,
  Zap,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const NAV_ITEMS = [
  { label: "Portfolio",       icon: LayoutDashboard, route: "/aegis/portfolio",                         companyScoped: false },
  { label: "Sectors",         icon: Globe,           route: "/aegis/sectors",                           companyScoped: false },
  { label: "Companies",       icon: List,            route: "/aegis/companies",                         companyScoped: false },
  { label: "Company Profile", icon: Building2,       route: (id) => `/aegis/company/${id}`,             companyScoped: true  },
  { label: "Solvency",        icon: ShieldAlert,     route: (id) => `/aegis/company/${id}/solvency`,    companyScoped: true  },
  { label: "Cashflow",        icon: TrendingUp,      route: (id) => `/aegis/company/${id}/cashflow`,    companyScoped: true  },
  { label: "Ownership",       icon: Users,           route: (id) => `/aegis/company/${id}/ownership`,   companyScoped: true  },
  { label: "Correlation",     icon: GitBranch,       route: (id) => `/aegis/company/${id}/correlation`, companyScoped: true  },
  { label: "Market",          icon: Activity,        route: (id) => `/aegis/company/${id}/market`,      companyScoped: true  },
  { label: "Stress Test",     icon: Zap,             route: (id) => `/aegis/company/${id}/stress`,      companyScoped: true  },
  { label: "NPA Report",      icon: FileText,        route: (id) => `/aegis/company/${id}/report`,      companyScoped: true  },
];

// Tooltip that appears to the right of the icon
function Tip({ label, children }) {
  return (
    <div className="relative group/tip" style={{ width: "100%" }}>
      {children}
      <div
        style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(17,17,17,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#F2F2F2",
          fontSize: 11,
          fontWeight: 500,
          padding: "5px 10px",
          borderRadius: 8,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 100,
          opacity: 0,
          transition: "opacity 0.15s, transform 0.15s",
        }}
        className="group-hover/tip:opacity-100"
      >
        {label}
        {/* Arrow */}
        <div style={{
          position: "absolute",
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: 4,
          borderStyle: "solid",
          borderColor: "transparent rgba(17,17,17,0.92) transparent transparent",
        }} />
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      width: "calc(100% - 12px)",
      background: "rgba(0,0,0,0.08)",
      margin: "3px 6px",
      flexShrink: 0,
    }} />
  );
}

export default function AegisSidebar() {
  const { id: routeCompanyId } = useParams();
  const location = useLocation();
  const { dark, toggle } = useTheme();

  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resolveHref = (item) => {
    if (!item.companyScoped) return item.route;
    if (!routeCompanyId) return null;
    return item.route(routeCompanyId);
  };

  const isItemActive = (item) => {
    const href = resolveHref(item);
    if (!href) return false;
    if (!item.companyScoped) return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  // ── Mobile bottom dock ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
          style={{
            background: dark ? "rgba(18,18,16,0.92)" : "rgba(255,255,255,0.88)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {NAV_ITEMS.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const href = resolveHref(item);
            const active = isItemActive(item);
            if (!href) {
              return (
                <span key={item.label} title={item.label}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 8px", opacity: 0.3, cursor: "not-allowed", color: "var(--text-3)" }}>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
              );
            }
            return (
              <NavLink key={item.label} to={href} title={item.label}
                style={({ isActive: navActive }) => {
                  const isAct = navActive || active;
                  return {
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "6px 8px", borderRadius: 10, textDecoration: "none",
                    background: isAct ? "var(--orange)" : "transparent",
                    color: isAct ? "#fff" : dark ? "#888" : "#ABABAB",
                    transition: "all 0.15s",
                  };
                }}
              >
                {({ isActive: navActive }) => {
                  const isAct = navActive || active;
                  return <Icon size={20} strokeWidth={isAct ? 2.5 : 1.75} />;
                }}
              </NavLink>
            );
          })}
          <button
            onClick={toggle}
            style={{
              flex: 1, padding: "10px 0",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              color: dark ? "#888" : "#ABABAB",
            }}
          >
            {dark ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
          </button>
        </nav>
        <div className="h-16" />
      </>
    );
  }

  // ── Desktop icon-only pill sidebar ────────────────────────────────────────
  return (
    <aside
      className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center py-3 px-1.5"
      style={{
        width: 52,
        background: dark ? "rgba(18,18,16,0.88)" : "rgba(255,255,255,0.82)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.9)",
        borderRadius: 26,
        boxShadow: dark
          ? "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 8px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        gap: 1,
      }}
    >
      {/* Logo mark */}
      <Tip label="AEGIS-FIN · Risk Intelligence">
        <div style={{
          width: 34, height: 34, borderRadius: 12,
          background: "var(--orange)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginBottom: 2,
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".95" />
            <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Tip>

      <Divider />

      {/* Overview items (Portfolio, Sectors, Companies) */}
      {NAV_ITEMS.slice(0, 3).map((item) => {
        const Icon = item.icon;
        const href = resolveHref(item);
        const active = isItemActive(item);
        return (
          <Tip key={item.label} label={item.label}>
            <NavLink
              to={href}
              style={({ isActive: navActive }) => {
                const isAct = navActive || active;
                return {
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textDecoration: "none", transition: "all 0.15s",
                  background: isAct ? "var(--orange)" : "transparent",
                  color: isAct ? "#fff" : dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                };
              }}
            >
              {({ isActive: navActive }) => {
                const isAct = navActive || active;
                return <Icon size={16} strokeWidth={isAct ? 2.5 : 1.75} />;
              }}
            </NavLink>
          </Tip>
        );
      })}

      <Divider />

      {/* Company-scoped items */}
      {NAV_ITEMS.slice(3).map((item) => {
        const Icon = item.icon;
        const href = resolveHref(item);
        const active = isItemActive(item);

        if (!href) {
          return (
            <Tip key={item.label} label={`${item.label} — select a company first`}>
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0.25, cursor: "not-allowed",
                color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
              }}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
            </Tip>
          );
        }

        return (
          <Tip key={item.label} label={item.label}>
            <NavLink
              to={href}
              end={item.label === "Company Profile"}
              style={({ isActive: navActive }) => {
                const isAct = navActive || active;
                return {
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textDecoration: "none", transition: "all 0.15s",
                  background: isAct ? "var(--orange)" : "transparent",
                  color: isAct ? "#fff" : dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                };
              }}
            >
              {({ isActive: navActive }) => {
                const isAct = navActive || active;
                return <Icon size={16} strokeWidth={isAct ? 2.5 : 1.75} />;
              }}
            </NavLink>
          </Tip>
        );
      })}

      <Divider />
      <Tip label={dark ? "Light Mode" : "Dark Mode"}>
        <button
          onClick={toggle}
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
            transition: "all 0.15s",
          }}
        >
          {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        </button>
      </Tip>
    </aside>
  );
}
