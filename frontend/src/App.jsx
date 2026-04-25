import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }   from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";
import { supabase } from "./lib/supabase";

import Login           from "./pages/Login";
import Signup          from "./pages/Signup";
import Dashboard       from "./pages/Dashboard";
import Companies       from "./pages/Companies";
import CompanyDetail   from "./pages/CompanyDetail";
import Sectors         from "./pages/Sectors";
import Correlation     from "./pages/Correlation";
import RiskEngine      from "./pages/RiskEngine";
import MacroOverlay    from "./pages/MacroOverlay";
import BalanceSheet    from "./pages/BalanceSheet";
import Profile         from "./pages/Profile";
import UploadCSV       from "./pages/UploadCSV";
import PipelineMonitor from "./pages/PipelineMonitor";
import Diagnostics     from "./pages/Diagnostics";

/* ── Protected route — requires auth ─────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <AppDataProvider>{children}</AppDataProvider>;
}

/* ── Diagnostics-only route — requires auth (dev/admin access) ───────────── */
function DiagnosticsRoute({ children }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = React.useState(null); // null = checking

  React.useEffect(() => {
    if (!user) { setAllowed(false); return; }

    // Fast check: known dev domains or metadata role
    const allowedDomains = ["@aegisfin.in", "@admin.com"];
    const fastAllow =
      allowedDomains.some(d => user.email?.includes(d)) ||
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "developer";

    if (fastAllow) { setAllowed(true); return; }

    // Slow check: query user_profiles.is_admin from DB
    supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setAllowed(data?.is_admin === true);
      })
      .catch(() => setAllowed(false));
  }, [user]);

  if (loading || allowed === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/" replace />;
  return <AppDataProvider>{children}</AppDataProvider>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/"              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/companies"     element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
      <Route path="/sectors"       element={<ProtectedRoute><Sectors /></ProtectedRoute>} />
      <Route path="/correlation"   element={<ProtectedRoute><Correlation /></ProtectedRoute>} />
      <Route path="/risk-engine"   element={<ProtectedRoute><RiskEngine /></ProtectedRoute>} />
      <Route path="/macro"         element={<ProtectedRoute><MacroOverlay /></ProtectedRoute>} />
      <Route path="/balance"       element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
      <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/upload"        element={<ProtectedRoute><UploadCSV /></ProtectedRoute>} />
      <Route path="/pipeline"      element={<ProtectedRoute><PipelineMonitor /></ProtectedRoute>} />

      {/* Diagnostics — restricted to developers/admins only */}
      <Route path="/diagnostics"   element={<DiagnosticsRoute><Diagnostics /></DiagnosticsRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
