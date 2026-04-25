/**
 * FinPlan — Financial Planning, Forecast & Analysis Software
 * Entry point: shows Landing → Onboarding → Dashboard in sequence.
 */
import React, { useState } from "react";
import { PersonaProvider, usePersona } from "./context/PersonaContext";
import LandingPage    from "./components/LandingPage";
import OnboardingModal from "./components/OnboardingModal";
import MobileDashboard from "./components/MobileDashboard";
import { Sun, Moon, ArrowLeft } from "lucide-react";

// ── Theme toggle (local to FinPlan, independent of AEGIS theme) ───────────────
function ThemeToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(!dark)}
      className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all"
    >
      {dark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-gray-700" />}
    </button>
  );
}

// ── Back to AEGIS button ──────────────────────────────────────────────────────
function BackButton() {
  return (
    <a
      href="/"
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/10 dark:bg-white/10 backdrop-blur-sm text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/20 dark:hover:bg-white/20 transition-all"
    >
      <ArrowLeft size={13} />
      AEGIS
    </a>
  );
}

// ── Inner app (has access to PersonaContext) ──────────────────────────────────
function FinPlanInner({ dark, setDark }) {
  const { persona, onboardingDone } = usePersona();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [view, setView] = useState("landing"); // "landing" | "onboarding" | "dashboard"

  const handleGetStarted = () => {
    if (onboardingDone && persona) {
      setView("dashboard");
    } else {
      setView("onboarding");
    }
  };

  // After persona selected, go to dashboard
  React.useEffect(() => {
    if (onboardingDone && persona && view === "onboarding") {
      setView("dashboard");
    }
  }, [onboardingDone, persona]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0a0a0a] transition-colors duration-300">
        <BackButton />
        <ThemeToggle dark={dark} setDark={setDark} />

        {view === "landing" && (
          <LandingPage onGetStarted={handleGetStarted} />
        )}

        {view === "onboarding" && (
          <OnboardingModal />
        )}

        {view === "dashboard" && (
          <div>
            {/* Persona banner */}
            <div className="flex items-center justify-between px-6 py-3 bg-black dark:bg-[#111] text-white text-xs">
              <div className="flex items-center gap-2">
                <span>{persona?.icon}</span>
                <span className="font-semibold">{persona?.label} Dashboard</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: persona?.accent + "30", color: persona?.accent }}>
                  Active
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("onboarding")}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Switch persona
                </button>
                <button
                  onClick={() => setView("landing")}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Landing page
                </button>
              </div>
            </div>

            {/* Persona-specific dashboard note */}
            <div className="max-w-sm mx-auto pt-4 px-4">
              <div className="text-center mb-2">
                <p className="text-xs text-gray-400">
                  {persona?.dashboardConfig?.showNPA && "📊 NPA modeling enabled · "}
                  {persona?.dashboardConfig?.showPortfolio && "📈 Portfolio tracking enabled · "}
                  {persona?.dashboardConfig?.showExpenses && "💳 Expense tracking enabled · "}
                  Showing {persona?.dashboardConfig?.chartFocus} focus
                </p>
              </div>
            </div>

            <MobileDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function FinPlan() {
  const [dark, setDark] = useState(false);

  return (
    <PersonaProvider>
      <FinPlanInner dark={dark} setDark={setDark} />
    </PersonaProvider>
  );
}
