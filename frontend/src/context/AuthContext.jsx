import React, { createContext, useContext } from "react";

const AuthContext = createContext(null);

// No auth — app is fully public
export function AuthProvider({ children }) {
  const user    = { id: "public", email: "user@aegisfin.in" };
  const loading = false;
  const signIn  = () => Promise.resolve();
  const signUp  = () => Promise.resolve();
  const signOut = () => Promise.resolve();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
