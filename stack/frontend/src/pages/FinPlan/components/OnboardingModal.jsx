/**
 * OnboardingModal — Claude-style persona selection screen.
 * Shown before the dashboard on first visit.
 */
import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { usePersona, PERSONAS } from "../context/PersonaContext";

export default function OnboardingModal() {
  const { selectPersona, saving } = usePersona();
  const [hovered, setHovered]     = useState(null);
  const [selected, setSelected]   = useState(null);

  const handleContinue = () => {
    if (selected) selectPersona(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFBF7] dark:bg-[#0a0a0a]">
      {/* Decorative dots */}
      <span className="absolute top-10 left-10 w-3 h-3 rounded-full bg-[#FF8A00]" />
      <span className="absolute top-24 right-20 w-2 h-2 rounded-full bg-[#00B341]" />
      <span className="absolute bottom-20 left-1/4 w-2 h-2 rounded-full bg-[#FFC224]" />
      <span className="absolute bottom-10 right-10 w-3 h-3 rounded-full bg-[#FF8A00]" />

      <div className="w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B341]" />
            Lichelete Finance
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black dark:text-white leading-tight mb-4">
            How will you be using<br />
            <span className="relative inline-block">
              <span className="relative z-10">this platform?</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFC224] opacity-40 -z-0 rounded" />
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            We'll personalise your dashboard, charts, and insights based on your selection.
            You can change this anytime in settings.
          </p>
        </div>

        {/* Persona cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {Object.values(PERSONAS).map((p) => {
            const isSelected = selected === p.id;
            const isHovered  = hovered  === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  relative text-left p-5 rounded-2xl border-2 transition-all duration-200
                  ${isSelected
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-xl scale-[1.02]"
                    : "border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] hover:border-black dark:hover:border-white hover:shadow-lg"
                  }
                `}
              >
                {/* Check mark */}
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00B341] flex items-center justify-center">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </span>
                )}

                <span className="text-3xl mb-3 block">{p.icon}</span>
                <p className={`text-sm font-black mb-1 ${isSelected ? "text-white dark:text-black" : "text-black dark:text-white"}`}>
                  {p.label}
                </p>
                <p className={`text-xs leading-relaxed ${isSelected ? "text-gray-300 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}`}>
                  {p.description}
                </p>

                {/* Accent dot */}
                <span
                  className="absolute bottom-4 right-4 w-2 h-2 rounded-full transition-all"
                  style={{ backgroundColor: isSelected || isHovered ? p.accent : "transparent",
                           border: `2px solid ${p.accent}` }}
                />
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className={`
              flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-200
              ${selected
                ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105 shadow-lg"
                : "bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Get Started
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          No credit card required · Free to start
        </p>
      </div>
    </div>
  );
}
