import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
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

  /** Upsert user_profiles row — only if table exists, silently skip if not */
  async function _ensureProfile(u) {
    try {
      const { error } = await supabase.from("user_profiles").upsert({
        id:        u.id,
        email:     u.email,
        role:      u.user_metadata?.role      || "analyst",
        interests: u.user_metadata?.interests || [],
      }, { onConflict: "id", ignoreDuplicates: true });
      // Silently ignore 404 (table doesn't exist) and RLS errors
      if (error && error.code !== "PGRST205" && error.code !== "42501") {
        // Only log unexpected errors
      }
    } catch (_) {
      // Non-critical
    }
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
