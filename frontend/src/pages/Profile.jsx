import React, { useState } from "react";
import {
  User, Mail, Shield, LogOut, Key, Sun, Moon,
  Building2, TrendingUp, ShieldAlert, Activity,
  Database, Globe, Brain, BarChart2, Clock,
  ChevronRight, Copy, Check, AlertTriangle, HeartPulse,
  Layers, Zap, Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import PageLayout from "../components/Layout/PageLayout";
import SignalBadge from "../components/ui/SignalBadge";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAppData } from "../context/AppDataContext";
import { useNavigate } from "react-router-dom";

/* ── Small helpers ─────────────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-[var(--text-3)] hover:text-[var(--orange)] transition-colors ml-2">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function StatTile({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`p-4 rounded-2xl border border-[var(--border)] ${accent ? "bg-[var(--orange)] border-transparent" : "bg-neutral-50 dark:bg-neutral-900/60"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? "text-white/80" : "text-[var(--orange)]"} />
        <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-white/70" : "text-[var(--text-3)]"}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-white" : "text-[var(--text)]"}`}>{value ?? "—"}</p>
      {sub && <p className={`text-[10px] mt-1 ${accent ? "text-white/60" : "text-[var(--text-3)]"}`}>{sub}</p>}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, signOut }    = useAuth();
  const { dark, toggle }     = useTheme();
  const { companies, sectors, latestSectorHealth, latestMl, portfolioStats, macro } = useAppData();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const username = user?.email?.split("@")[0] || "User";
  const joined   = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  // Portfolio breakdown
  const topPick = [...latestMl]
    .filter(r => r.survival_score != null)
    .sort((a, b) => b.survival_score - a.survival_score)[0];
  const topPickCompany = companies.find(c => c.id === topPick?.company_id);

  const atRisk = [...latestMl]
    .filter(r => r.survival_score != null)
    .sort((a, b) => a.survival_score - b.survival_score)[0];
  const atRiskCompany = companies.find(c => c.id === atRisk?.company_id);

  // Sector summary
  const strongSectors = latestSectorHealth.filter(h => h.signal === "STRONG").length;
  const weakSectors   = latestSectorHealth.filter(h => h.signal === "WEAK").length;

  // System info
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "—";
  const supabaseProject = supabaseUrl.includes("supabase.co")
    ? supabaseUrl.split("//")[1]?.split(".")[0]
    : "—";

  return (
    <PageLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-5 pb-10 animate-fade-in">

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div className="glass-card p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[var(--orange)]/8 blur-[60px] pointer-events-none" />
          <div className="relative flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-orange"
              style={{ background: "var(--orange)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="title-lg truncate">{username}</p>
              <p className="text-sm text-[var(--text-2)] mt-0.5 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-orange">Analyst</span>
                <span className="text-[10px] text-[var(--text-3)]">Member since {joined}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Portfolio overview ────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="title-md">Portfolio Overview</p>
            <Link to="/risk-engine" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
              Full details <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatTile icon={Building2}   label="Companies"  value={portfolioStats.total}    sub="tracked" accent />
            <StatTile icon={HeartPulse}  label="Healthy"    value={portfolioStats.healthy}  sub="score ≥ 70" />
            <StatTile icon={AlertTriangle} label="Watch"    value={portfolioStats.watch}    sub="score 40–70" />
            <StatTile icon={ShieldAlert} label="Distress"   value={portfolioStats.distress} sub="score < 40" />
          </div>

          {/* Health bar */}
          {portfolioStats.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-[var(--text-3)]">Portfolio health distribution</p>
                <p className="text-xs font-bold text-[var(--orange)]">Avg {portfolioStats.avgSurvival} / 100</p>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="bg-[var(--orange)] rounded-l-full transition-all duration-1000"
                  style={{ width: `${(portfolioStats.healthy / portfolioStats.total) * 100}%` }} />
                <div className="bg-[var(--orange)]/40 transition-all duration-1000"
                  style={{ width: `${(portfolioStats.watch / portfolioStats.total) * 100}%` }} />
                <div className="bg-neutral-200 dark:bg-neutral-700 rounded-r-full transition-all duration-1000"
                  style={{ width: `${(portfolioStats.distress / portfolioStats.total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Top pick + At risk ────────────────────────────────────────── */}
        {(topPickCompany || atRiskCompany) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topPickCompany && (
              <Link to={`/companies/${topPick.company_id}`} className="card p-5 hover-lift group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center">
                    <Zap size={13} className="text-[var(--orange)]" />
                  </div>
                  <p className="label-caps">Top Pick</p>
                </div>
                <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors truncate">{topPickCompany.name}</p>
                <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{topPickCompany.ticker}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${Math.min(100, topPick.survival_score || 0)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-[var(--orange)] tabular-nums">{topPick.survival_score?.toFixed(0)}</span>
                </div>
              </Link>
            )}
            {atRiskCompany && (
              <Link to={`/companies/${atRisk.company_id}`} className="card p-5 hover-lift group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <AlertTriangle size={13} className="text-[var(--text-3)]" />
                  </div>
                  <p className="label-caps">Needs Review</p>
                </div>
                <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors truncate">{atRiskCompany.name}</p>
                <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">{atRiskCompany.ticker}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-neutral-300 dark:bg-neutral-600" style={{ width: `${Math.min(100, atRisk.survival_score || 0)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-3)] tabular-nums">{atRisk.survival_score?.toFixed(0)}</span>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Sector + Macro summary ────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="title-md">Market Summary</p>
            <Link to="/sectors" className="text-xs font-semibold text-[var(--orange)] flex items-center gap-1 hover:underline">
              View sectors <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatTile icon={TrendingUp} label="Sectors"  value={sectors.filter(s => s.sector_type === "sector").length} sub="NSE indices" />
            <StatTile icon={Globe}      label="Macro"    value={sectors.filter(s => s.sector_type === "macro").length}  sub="assets tracked" />
            <StatTile icon={HeartPulse} label="Strong"   value={strongSectors} sub="sectors" />
            <StatTile icon={ShieldAlert} label="Weak"    value={weakSectors}   sub="sectors" />
          </div>
          {macro && (
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl">
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${
                macro.macro_regime === "RISK_ON"  ? "bg-[var(--orange)] text-white" :
                macro.macro_regime === "RISK_OFF" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" :
                "bg-neutral-200 dark:bg-neutral-800 text-[var(--text-2)]"
              }`}>
                {macro.macro_regime?.replace("_", " ")}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[var(--text)]">Macro Score: <span className="text-[var(--orange)]">{macro.macro_score?.toFixed(2)}</span></p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">VIX {macro.vix_z?.toFixed(2)} · USD {macro.usd_z?.toFixed(2)} · Gold {macro.gold_z?.toFixed(2)}</p>
              </div>
              <Link to="/macro" className="text-xs font-semibold text-[var(--orange)] hover:underline">Details</Link>
            </div>
          )}
        </div>

        {/* ── Quick navigation ──────────────────────────────────────────── */}
        <div className="card p-5">
          <p className="title-md mb-4">Quick Navigation</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Companies",     path: "/companies",   icon: Building2,  desc: `${portfolioStats.total} tracked` },
              { label: "Risk Engine",   path: "/risk-engine", icon: Brain,      desc: `${latestMl.length} scored` },
              { label: "Sectors",       path: "/sectors",     icon: TrendingUp, desc: `${latestSectorHealth.length} active` },
              { label: "Correlation",   path: "/correlation", icon: BarChart2,  desc: "JSONB analysis" },
              { label: "Balance Sheet", path: "/balance",     icon: Layers,     desc: "20 ratios" },
              { label: "Macro Overlay", path: "/macro",       icon: Globe,      desc: "VIX · USD · Gold" },
              { label: "Pipeline",      path: "/pipeline",    icon: Activity,   desc: "9-layer engine" },
              { label: "Diagnostics",   path: "/diagnostics", icon: Database,   desc: "DB health check" },
            ].map(({ label, path, icon: Icon, desc }) => (
              <Link key={path} to={path}
                className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-[var(--border)] hover:border-[var(--orange)]/30 hover:bg-[var(--orange)]/4 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:bg-[var(--orange)] group-hover:border-transparent transition-all">
                  <Icon size={14} className="text-[var(--text-3)] group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">{label}</p>
                  <p className="text-[10px] text-[var(--text-3)] truncate">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Account details ───────────────────────────────────────────── */}
        <div className="card divide-y divide-[var(--border)]">
          <div className="px-5 py-4">
            <p className="title-md">Account Details</p>
          </div>
          {[
            { icon: Mail,   label: "Email Address", value: user?.email || "—", copy: user?.email },
            { icon: Shield, label: "Role",          value: "Analyst — Read access to all modules" },
            { icon: Clock,  label: "Member Since",  value: joined },
            { icon: Clock,  label: "Last Sign In",  value: lastSignIn },
            { icon: Key,    label: "User ID",       value: user?.id || "—", mono: true, copy: user?.id },
          ].map(({ icon: Icon, label, value, mono, copy }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center shrink-0">
                <Icon size={14} className="text-[var(--text-3)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-caps mb-0.5">{label}</p>
                <div className="flex items-center gap-1">
                  <p className={`text-sm font-semibold text-[var(--text)] truncate ${mono ? "font-mono text-xs" : ""}`}>
                    {mono && value !== "—" ? value.slice(0, 24) + "…" : value}
                  </p>
                  {copy && <CopyButton text={copy} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── System info ───────────────────────────────────────────────── */}
        <div className="card divide-y divide-[var(--border)]">
          <div className="px-5 py-4">
            <p className="title-md">System Information</p>
          </div>
          {[
            { icon: Database, label: "Supabase Project", value: supabaseProject, mono: true },
            { icon: Layers,   label: "Schema Version",   value: "v2 — JSONB classifier + correlation" },
            { icon: Building2,label: "Companies in DB",  value: `${portfolioStats.total} active companies` },
            { icon: TrendingUp,label: "Sectors in DB",   value: `${sectors.length} total (${sectors.filter(s=>s.sector_type==="sector").length} NSE + ${sectors.filter(s=>s.sector_type==="macro").length} macro)` },
            { icon: Brain,    label: "ML Engine",        value: "CatBoost Classifier — composite_score 0–100" },
            { icon: Activity, label: "Pipeline",         value: "9-layer daily pipeline · runs after NSE close" },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center shrink-0">
                <Icon size={14} className="text-[var(--orange)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-caps mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-[var(--text)] truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Preferences ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <p className="title-md mb-4">Preferences</p>
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                {dark ? <Moon size={14} className="text-[var(--text-3)]" /> : <Sun size={14} className="text-[var(--text-3)]" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Appearance</p>
                <p className="text-xs text-[var(--text-3)]">{dark ? "Dark mode active" : "Light mode active"}</p>
              </div>
            </div>
            <button onClick={toggle}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${dark ? "bg-[var(--orange)]" : "bg-neutral-200 dark:bg-neutral-700"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${dark ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Sign out ──────────────────────────────────────────────────── */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[var(--border)] text-[var(--text-2)] text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-[var(--text)] transition-colors">
          <LogOut size={16} /> Sign Out of AEGIS-FIN
        </button>

      </div>
    </PageLayout>
  );
}
