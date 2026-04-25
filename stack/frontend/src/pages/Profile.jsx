import React from "react";
import { User, Mail, Shield, LogOut, Moon, Sun } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { dark, toggle }  = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const joined   = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <PageLayout title="Profile">
      <div className="max-w-lg space-y-4">

        {/* Avatar card */}
        <div className="bento-black flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#FFC224]/20 text-[#FFC224] text-2xl font-black flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-black text-white">{user?.email}</p>
            <p className="text-xs text-white/50 mt-0.5">Member since {joined}</p>
            <span className="badge-amber mt-2 inline-flex">Analyst</span>
          </div>
        </div>

        {/* Info */}
        <div className="card p-5 space-y-4">
          <p className="section-title">Account Details</p>
          {[
            { icon: Mail,   label: "Email",   value: user?.email },
            { icon: Shield, label: "Role",    value: "Analyst"   },
            { icon: User,   label: "User ID", value: user?.id?.slice(0, 16) + "..." },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFC224]/10 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-[#b38a00] dark:text-[#FFC224]" />
              </div>
              <div>
                <p className="stat-label">{label}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-bold mt-0.5">{value || "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Preferences */}
        <div className="card p-5">
          <p className="section-title mb-4">Preferences</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFC224]/10 flex items-center justify-center shrink-0">
                {dark ? <Moon size={15} className="text-[#b38a00] dark:text-[#FFC224]" /> : <Sun size={15} className="text-[#b38a00] dark:text-[#FFC224]" />}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200">Theme</p>
                <p className="text-xs text-gray-400">{dark ? "Dark mode" : "Light mode"}</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${dark ? "bg-[#FFC224]" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-black rounded-2xl border border-red-200 dark:border-red-800 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </PageLayout>
  );
}
