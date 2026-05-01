import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const IS_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(IS_LOCAL ? { id: "local-dev", email: "dev@localhost" } : null);
  const [loading, setLoading] = useState(!IS_LOCAL);

  useEffect(() => {
    if (IS_LOCAL) return; // skip Supabase auth on localhost

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signUp  = (email, password, metadata = {}) =>
    supabase.auth.signUp({ email, password, options: { data: { role: metadata.role || "analyst" } } });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
