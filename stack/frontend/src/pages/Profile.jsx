import React from "react";
import { User, Mail, Shield, LogOut } from "lucide-react";
import PageLayout from "../components/Layout/PageLayout";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <PageLayout title="Profile">
      <div className="max-w-lg mx-auto space-y-5 animate-slide-up">

        {/* Avatar card */}
        <div className="card p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#E8C547]/20 to-[#52B788]/10" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center mx-auto shadow-card-lg">
              <User size={32} className="text-[#E8C547] dark:text-[#0D0D0D]" />
            </div>
            <p className="title-xl mt-4">{user?.email?.split("@")[0] || "User"}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">{user?.email || "—"}</p>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8C547]/10 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-[#E8C547]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label mb-0.5">Email</p>
                <p className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0] truncate">{user?.email || "—"}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#52B788]/10 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-[#52B788]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label mb-0.5">Role</p>
                <p className="text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E6E0]">{user?.role || "authenticated"}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] dark:bg-[#22252E] flex items-center justify-center shrink-0">
                <User size={16} className="text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label mb-0.5">User ID</p>
                <p className="text-[10px] font-mono text-[#9CA3AF] truncate">{user?.id || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={signOut} className="w-full btn-ghost py-3 text-red-500 border-red-500/20 hover:bg-red-500/5 hover:border-red-500/40">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </PageLayout>
  );
}
