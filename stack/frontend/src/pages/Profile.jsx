import React from "react";
import { User, Mail, Shield, LogOut, Key } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <PageLayout title="Profile">
      <div className="max-w-lg mx-auto space-y-4 animate-slide-up">

        {/* Avatar card */}
        <div className="card p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-brand-orange/5 to-transparent" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center mx-auto shadow-card-md mb-4">
              <span className="text-2xl font-black text-white">{initials}</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">{user?.email || "—"}</p>
          </div>
        </div>

        {/* Info */}
        <div className="card divide-y divide-neutral-100 dark:divide-neutral-800">
          {[
            { icon: Mail,   label: "Email",   value: user?.email || "—" },
            { icon: Shield, label: "Role",    value: user?.role || "authenticated" },
            { icon: Key,    label: "User ID", value: user?.id || "—", mono: true },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-caps mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-900/50 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </PageLayout>
  );
}
