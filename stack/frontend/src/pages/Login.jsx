import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative dots */}
      <div className="absolute top-20 left-20 w-3 h-3 rounded-full bg-[#FFC224] opacity-60" />
      <div className="absolute top-40 right-32 w-2 h-2 rounded-full bg-[#00B341] opacity-50" />
      <div className="absolute bottom-32 left-40 w-2.5 h-2.5 rounded-full bg-[#FF8A00] opacity-50" />
      <div className="absolute bottom-20 right-20 w-3 h-3 rounded-full bg-[#FFC224] opacity-40" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-xl mb-4">
            <ShieldAlert size={26} className="text-[#FFC224]" />
          </div>
          <h1 className="text-3xl font-black text-black dark:text-white">AEGIS-FIN</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Risk Intelligence Platform</p>
        </div>

        <div className="bg-white dark:bg-[#111] rounded-3xl border-2 border-gray-100 dark:border-[#1f1f1f] p-8 shadow-xl">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl mb-4">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="stat-label block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm input-base"
                />
              </div>
            </div>
            <div>
              <label className="stat-label block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm input-base"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 btn-primary disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-5">
            No account?{" "}
            <Link to="/signup" className="text-[#FF8A00] font-bold hover:text-[#e67a00] transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
