import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAegisData } from "../context/AegisDataContext";
import AegisSidebar from "./AegisSidebar";

/**
 * AegisLayout — shell for all AEGIS-FIN pages.
 *
 * Renders:
 *  - AegisSidebar (fixed left pill on desktop, bottom dock on mobile)
 *  - Breadcrumb header when on a company sub-route (id param present)
 *  - <Outlet /> for page content
 *
 * Padding: pl-[72px] on desktop to clear the 56px sidebar + 3px left offset + gap.
 */
export default function AegisLayout() {
  const { id } = useParams();
  const { dark } = useTheme();
  const { company } = useAegisData();

  // Show breadcrumb only when we're on a company sub-route
  const showBreadcrumb = Boolean(id);

  // Resolve display values — fall back to em dash while loading or if missing
  const companyName = company?.name || "—";
  const ticker = company?.ticker || "—";

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <AegisSidebar />

      {/* ── Main content area ────────────────────────────────────────────── */}
      {/*
        pl-[72px]: clears the 56px sidebar (left-3 = 12px offset + 56px width + ~4px gap)
        pb-20 on mobile: clears the bottom dock (h-16 spacer + extra breathing room)
      */}
      <main className="md:pl-[68px] pb-20 md:pb-0 min-h-screen">

        {/* ── Breadcrumb header (company sub-routes only) ──────────────── */}
        {showBreadcrumb && (
          <header
            className="sticky top-0 z-30 flex items-center gap-2 px-6 py-3"
            style={{
              background: dark
                ? "rgba(17,17,17,0.85)"
                : "rgba(236,238,242,0.85)",
              backdropFilter: "blur(16px) saturate(180%)",
              WebkitBackdropFilter: "blur(16px) saturate(180%)",
              borderBottom: `1px solid var(--border)`,
            }}
          >
            {/* Breadcrumb: AEGIS-FIN > Company Name (TICKER) */}
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 list-none m-0 p-0">
                <li>
                  <span
                    className="label-caps"
                    style={{ color: "var(--orange)", letterSpacing: "0.08em" }}
                  >
                    AEGIS-FIN
                  </span>
                </li>

                {/* Separator */}
                <li aria-hidden="true">
                  <span className="label-caps" style={{ color: "var(--text-3)" }}>
                    &rsaquo;
                  </span>
                </li>

                {/* Company name + ticker */}
                <li>
                  <span
                    className="title-sm"
                    style={{ color: "var(--text)" }}
                  >
                    {companyName}
                  </span>
                  {ticker !== "—" && (
                    <span
                      className="ml-1.5 badge badge-gray"
                      style={{ fontSize: 10 }}
                    >
                      {ticker}
                    </span>
                  )}
                </li>
              </ol>
            </nav>
          </header>
        )}

        {/* ── Page content ─────────────────────────────────────────────── */}
        <Outlet />
      </main>
    </div>
  );
}
