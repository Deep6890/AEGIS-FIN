import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { key: "analyst",    label: "Financial Analyst",    desc: "I analyze company fundamentals and risk" },
  { key: "investor",   label: "Investor / Trader",    desc: "I make investment decisions based on data" },
  { key: "researcher", label: "Researcher",            desc: "I study market patterns and sector trends" },
  { key: "developer",  label: "Developer / Engineer",  desc: "I build on top of financial data" },
  { key: "other",      label: "Other",                 desc: "Something else" },
];

const INTERESTS = [
  { key: "sme",        label: "SME Companies" },
  { key: "sectors",    label: "Sector Analysis" },
  { key: "macro",      label: "Macro Overlay" },
  { key: "ml",         label: "ML Risk Scores" },
  { key: "balance",    label: "Balance Sheet" },
  { key: "correlation",label: "Correlation" },
];

export default function Signup() {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const [step, setStep]         = useState(1); // 1=account, 2=about, 3=interests
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [role, setRole]         = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const toggleInterest = (key) => {
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    const { error: err } = await signUp(email, password, { role, interests });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => navigate("/"), 2000);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-[var(--orange)] flex items-center justify-center mx-auto mb-4 shadow-orange">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="title-lg mb-2">Welcome to AEGIS-FIN</h2>
          <p className="text-sm text-[var(--text-3)]">Account created. Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-orange"
            style={{ background: "var(--orange)" }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6V10C3 13.87 6.13 17.5 10 18C13.87 17.5 17 13.87 17 10V6L10 2Z" fill="white" fillOpacity=".9"/>
              <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ letterSpacing: "-0.03em" }}>AEGIS-FIN</h1>
          <p className="text-xs text-[var(--text-3)] mt-1">NSE Risk Intelligence Platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step ? "bg-[var(--orange)] text-white" :
                s === step ? "bg-[var(--orange)] text-white" :
                "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-3)]"
              }`}>
                {s < step ? <Check size={12} /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${s < step ? "bg-[var(--orange)]" : "bg-neutral-200 dark:bg-neutral-700"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-7">

          {/* ── Step 1: Account ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="title-lg mb-1">Create your account</h2>
              <p className="text-sm text-[var(--text-3)] mb-6">Start monitoring NSE companies with AI-powered risk intelligence.</p>

              {error && (
                <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 border border-[var(--border)] rounded-xl text-xs text-[var(--text-2)]">{error}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label-caps mb-1.5 block">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="input-base" />
                </div>
                <div>
                  <label className="label-caps mb-1.5 block">Password</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters" required minLength={8} className="input-base pr-10" />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { if (email && password.length >= 8) setStep(2); else setError("Please fill in all fields (min 8 char password)"); }}
                  className="btn-active w-full py-2.5">
                  Continue <ChevronRight size={15} />
                </button>
              </div>

              <p className="text-center text-xs text-[var(--text-3)] mt-5">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[var(--orange)] hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 2: Role ─────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="title-lg mb-1">What's your role?</h2>
              <p className="text-sm text-[var(--text-3)] mb-6">Help us understand how you'll use AEGIS-FIN.</p>

              <div className="space-y-2 mb-6">
                {ROLES.map(r => (
                  <button key={r.key} onClick={() => setRole(r.key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 ${
                      role === r.key
                        ? "border-[var(--orange)]/40 bg-[var(--orange)]/5"
                        : "border-[var(--border)] hover:border-[var(--orange)]/20"
                    }`}
                    style={{ background: role === r.key ? undefined : "var(--surface)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{r.label}</p>
                        <p className="text-xs text-[var(--text-3)] mt-0.5">{r.desc}</p>
                      </div>
                      {role === r.key && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "var(--orange)" }}>
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1 py-2.5">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={() => { if (role) setStep(3); else setError("Please select a role"); }}
                  className="btn-active flex-1 py-2.5">
                  Continue <ChevronRight size={15} />
                </button>
              </div>
              {error && <p className="text-xs text-[var(--text-3)] mt-2 text-center">{error}</p>}
            </>
          )}

          {/* ── Step 3: Interests ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="title-lg mb-1">What interests you?</h2>
              <p className="text-sm text-[var(--text-3)] mb-6">Select all that apply. We'll personalize your dashboard.</p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {INTERESTS.map(i => (
                  <button key={i.key} onClick={() => toggleInterest(i.key)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                      interests.includes(i.key)
                        ? "border-[var(--orange)]/40 bg-[var(--orange)]/5"
                        : "border-[var(--border)] hover:border-[var(--orange)]/20"
                    }`}
                    style={{ background: interests.includes(i.key) ? undefined : "var(--surface)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--text)]">{i.label}</p>
                      {interests.includes(i.key) && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "var(--orange)" }}>
                          <Check size={9} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-ghost flex-1 py-2.5">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading} className="btn-active flex-1 py-2.5">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : <>Create Account <ArrowRight size={15} /></>
                  }
                </button>
              </div>
              {error && <p className="text-xs text-[var(--text-3)] mt-2 text-center">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
