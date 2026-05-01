import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }   from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";

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

const IS_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

/* ── Protected route ─────────────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <AppDataProvider>{children}</AppDataProvider>;
}

/* ── Diagnostics route — always allowed on localhost ─────────────────────── */
function DiagnosticsRoute({ children }) {
  const { user, loading } = useAuth();
  if (IS_LOCAL) return <AppDataProvider>{children}</AppDataProvider>;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
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
      {/* Legacy redirects — merged pages */}
      <Route path="/enhanced-balance"      element={<Navigate to="/balance" replace />} />
      <Route path="/enhanced-holdings"     element={<Navigate to="/companies" replace />} />
      <Route path="/filtering"             element={<Navigate to="/risk-engine" replace />} />
      <Route path="/market-intelligence"   element={<Navigate to="/" replace />} />
      <Route path="/sector-intelligence"   element={<Navigate to="/sectors" replace />} />
      <Route path="/correlation-explorer"  element={<Navigate to="/correlation" replace />} />
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
