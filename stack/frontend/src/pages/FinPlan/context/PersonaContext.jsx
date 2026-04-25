/**
 * PersonaContext — global state for user persona selection.
 * Stub: replace savePersonaToDB with your real API call.
 */
import React, { createContext, useContext, useState, useCallback } from "react";

const PersonaContext = createContext(null);

export const PERSONAS = {
  institutional: {
    id:          "institutional",
    label:       "Institutional Banking",
    description: "NPA modeling, large-scale forecasting, risk analytics",
    icon:        "🏦",
    accent:      "#FF8A00",
    dashboardConfig: {
      showNPA:        true,
      showForecasting: true,
      showPortfolio:  false,
      showExpenses:   false,
      chartFocus:     "revenue",
    },
  },
  retail: {
    id:          "retail",
    label:       "Retail Stock Trader",
    description: "Market intelligence, portfolio tracking, live signals",
    icon:        "📈",
    accent:      "#00B341",
    dashboardConfig: {
      showNPA:        false,
      showForecasting: false,
      showPortfolio:  true,
      showExpenses:   false,
      chartFocus:     "grossMargin",
    },
  },
  personal: {
    id:          "personal",
    label:       "Personal Finance",
    description: "Expense tracking, savings goals, budget planning",
    icon:        "💰",
    accent:      "#FFC224",
    dashboardConfig: {
      showNPA:        false,
      showForecasting: false,
      showPortfolio:  false,
      showExpenses:   true,
      chartFocus:     "cogs",
    },
  },
};

// ── Stub: replace with your real API call ─────────────────────────────────────
async function savePersonaToDB(personaId) {
  // TODO: await supabase.from("user_profiles").upsert({ persona: personaId });
  console.log("[PersonaContext] savePersonaToDB stub called with:", personaId);
  return { success: true };
}

export function PersonaProvider({ children }) {
  const [persona, setPersonaState]       = useState(null); // null = not chosen yet
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [saving, setSaving]              = useState(false);

  const selectPersona = useCallback(async (personaId) => {
    setSaving(true);
    try {
      await savePersonaToDB(personaId);
      setPersonaState(PERSONAS[personaId] || null);
      setOnboardingDone(true);
    } catch (err) {
      console.error("Failed to save persona:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  const resetPersona = useCallback(() => {
    setPersonaState(null);
    setOnboardingDone(false);
  }, []);

  return (
    <PersonaContext.Provider value={{ persona, onboardingDone, saving, selectPersona, resetPersona }}>
      {children}
    </PersonaContext.Provider>
  );
}

export const usePersona = () => useContext(PersonaContext);
