import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Building2, ShieldAlert,
  TrendingUp, MoreHorizontal
} from "lucide-react";

const DOCK = [
  { to: "/",            icon: LayoutDashboard, title: "Dashboard"   },
  { to: "/companies",   icon: Building2,       title: "Companies"   },
  { to: "/risk-engine", icon: ShieldAlert,     title: "Risk Engine" },
  { to: "/sectors",     icon: TrendingUp,      title: "Sectors"     },
  { to: "/macro",       icon: MoreHorizontal,  title: "More"        },
];

export default function BottomDock() {
  return (
    <nav
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        bg-neutral-900 dark:bg-neutral-950
        shadow-dock rounded-dock
        px-3 py-2 flex items-center gap-1
      "
      aria-label="Main navigation"
    >
      {DOCK.map(({ to, icon: Icon, title }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          title={title}
          className={({ isActive }) => `
            p-2.5 rounded-xl transition-all duration-100
            ${isActive
              ? "bg-yellow-400 text-neutral-900"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }
          `}
        >
          <Icon size={20} />
        </NavLink>
      ))}
    </nav>
  );
}
