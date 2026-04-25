import React from "react";
import { User, Mail, Shield, LogOut, Key, Sun, Moon } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { dark, toggle }  = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/login"); };
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const joined   = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <PageLayout title="Profile">
      <div className="max-w-md mx-auto space-y-4 pb-10 animate-slide-up">

        {/* Avatar */}
        <div className="card p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[var(--orange)]/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[var(--orange)] flex items-center justify-center mx-auto shadow-orange mb-4">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <p className="title-lg">{user?.email?.split("@")[0] || "User"}</p>
            <p className="text-xs text-[var(--text-3)] mt-1">{user?.email || "—"}</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Member since {joined}</p>
          </div>
        </div>

        {/* Info */}
        <div className="card divide-y divide-[var(--border)]">
          {[
            { icon: Mail,   label: "Email",   value: user?.email || "—" },
            { icon: Shield, label: "Role",    value: "Analyst" },
            { icon: Key,    label: "User ID", value: user?.id?.slice(0, 20) + "…" || "—", mono: true },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center shrink-0">
                <Icon size={15} className="text-[var(--text-3)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-caps mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-[var(--text)] truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Theme toggle */}
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] flex items-center justify-center">
              {dark ? <Moon size={15} className="text-[var(--text-3)]" /> : <Sun size={15} className="text-[var(--text-3)]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Theme</p>
              <p className="text-xs text-[var(--text-3)]">{dark ? "Dark mode" : "Light mode"}</p>
            </div>
          </div>
          <button onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${dark ? "bg-[var(--orange)]" : "bg-neutral-200 dark:bg-neutral-700"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${dark ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[var(--border)] text-[var(--text-2)] text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-[var(--text)] transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </PageLayout>
  );
}
