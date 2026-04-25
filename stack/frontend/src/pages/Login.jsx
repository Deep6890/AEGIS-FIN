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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange flex items-center justify-center mb-4 shadow-card-md">
            <ShieldAlert size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">AEGIS-FIN</h1>
          <p className="text-xs text-neutral-500 mt-1">Risk Intelligence Platform</p>
        </div>

        <div className="card p-6 shadow-card-md">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">Sign in</h2>
          <p className="text-xs text-neutral-500 mb-6">Welcome back to your dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-caps mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-base w-full" />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-base w-full pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Sign In <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-5">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-brand-orange hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
