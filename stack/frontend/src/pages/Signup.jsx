import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900 mb-3">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AEGIS-FIN</h1>
          <p className="text-xs text-gray-400 mt-1">Risk Intelligence Platform</p>
        </div>

        <div className="card p-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-emerald-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Check your email</p>
              <p className="text-xs text-gray-400 text-center">We sent a confirmation link to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span></p>
              <Link to="/login" className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-2">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Create your account</h2>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="stat-label block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" className="w-full pl-9 pr-4 py-2.5 text-sm input-base" />
                  </div>
                </div>
                <div>
                  <label className="stat-label block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters" className="w-full pl-9 pr-10 py-2.5 text-sm input-base" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </form>
              <p className="text-xs text-center text-gray-400 mt-4">
                Already have an account?{" "}
                <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
