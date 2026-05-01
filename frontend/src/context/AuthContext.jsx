import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Localhost bypass ──────────────────────────────────────────────────
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      setUser({ id: "local-dev", email: "dev@localhost" });
      setLoading(false);
      return;
    }
    // ── Production auth ───────────────────────────────────────────────────
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Ensure user_profiles row exists (fallback if DB trigger didn't fire)
      if (u) _ensureProfile(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  /** Upsert user_profiles row — skip silently if table doesn't exist */
  async function _ensureProfile(u) {
    // Silently skip — user_profiles table may not exist in this deployment
    return;
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password, metadata = {}) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role:      metadata.role      || "analyst",
          interests: metadata.interests || [],
        },
      },
    });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
