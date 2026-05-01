import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }  from "./context/ThemeContext";
import { AuthProvider }   from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";

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

function AppRoutes() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/companies"     element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/sectors"       element={<Sectors />} />
        <Route path="/correlation"   element={<Correlation />} />
        <Route path="/risk-engine"   element={<RiskEngine />} />
        <Route path="/macro"         element={<MacroOverlay />} />
        <Route path="/balance"       element={<BalanceSheet />} />
        <Route path="/profile"       element={<Profile />} />
        <Route path="/upload"        element={<UploadCSV />} />
        <Route path="/pipeline"      element={<PipelineMonitor />} />
        <Route path="/diagnostics"   element={<Diagnostics />} />
        {/* Legacy redirects */}
        <Route path="/login"                 element={<Navigate to="/" replace />} />
        <Route path="/signup"                element={<Navigate to="/" replace />} />
        <Route path="/enhanced-balance"      element={<Navigate to="/balance" replace />} />
        <Route path="/enhanced-holdings"     element={<Navigate to="/companies" replace />} />
        <Route path="/filtering"             element={<Navigate to="/risk-engine" replace />} />
        <Route path="/market-intelligence"   element={<Navigate to="/" replace />} />
        <Route path="/sector-intelligence"   element={<Navigate to="/sectors" replace />} />
        <Route path="/correlation-explorer"  element={<Navigate to="/correlation" replace />} />
        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
    </AppDataProvider>
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
