import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--orange)] flex items-center justify-center mb-4 shadow-orange">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".9"/>
              <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ letterSpacing: "-0.03em" }}>AEGIS-FIN</h1>
          <p className="text-xs text-[var(--text-3)] mt-1">Risk Intelligence Platform</p>
        </div>

        <div className="card p-7">
          <h2 className="title-lg mb-1">Sign in</h2>
          <p className="text-sm text-[var(--text-3)] mb-6">Welcome back to your dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] rounded-xl text-xs text-[var(--text-2)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-caps mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-base" />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-base pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-active w-full py-2.5 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : <>Sign In <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-3)] mt-5">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-[var(--orange)] hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
