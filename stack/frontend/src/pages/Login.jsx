import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await signIn(email, password);
    if (err) { setError(err.message); setLoading(false); }
    else navigate("/");
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-[#E8C547]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-[#52B788]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center mb-4 shadow-card-md">
            <ShieldAlert size={22} className="text-[#E8C547] dark:text-[#0D0D0D]" />
          </div>
          <h1 className="text-2xl font-black text-[#0D0D0D] dark:text-[#E8E6E0]">AEGIS-FIN</h1>
          <p className="text-xs text-[#6B7280] mt-1">Risk Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-card-md">
          <h2 className="text-lg font-bold text-[#0D0D0D] dark:text-[#E8E6E0] mb-1">Welcome back</h2>
          <p className="text-xs text-[#6B7280] mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0D0D0D] dark:hover:text-white"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280] mt-5">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-[#E8A020] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
