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
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-[#E8C547]/8 blur-[80px] pointer-events-none animate-float" />
      <div className="absolute bottom-20 right-20 w-56 h-56 rounded-full bg-[#52B788]/8 blur-[80px] pointer-events-none animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[#E5E1D8]/20 dark:border-[#1F2128]/30 pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0D0D0D] dark:bg-[#E8C547] flex items-center justify-center mb-4 shadow-card-lg">
            <ShieldAlert size={24} className="text-[#E8C547] dark:text-[#0D0D0D]" />
          </div>
          <h1 className="text-2xl font-black text-[#0D0D0D] dark:text-[#E8E6E0] tracking-tight">AEGIS-FIN</h1>
          <p className="text-xs text-[#9CA3AF] mt-1">Risk Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-card-lg">
          <h2 className="text-lg font-bold text-[#0D0D0D] dark:text-[#E8E6E0] mb-1">Welcome back</h2>
          <p className="text-xs text-[#9CA3AF] mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/8 border border-red-500/15 rounded-xl text-xs text-red-500 animate-scale-in">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0D0D0D] dark:hover:text-white transition-colors"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#9CA3AF] mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-[#E8C547] hover:text-[#D4B23E] transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
