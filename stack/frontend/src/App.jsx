import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }   from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";

import Login         from "./pages/Login";
import Signup        from "./pages/Signup";
import Dashboard     from "./pages/Dashboard";
import Companies     from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Sectors       from "./pages/Sectors";
import Correlation   from "./pages/Correlation";
import RiskEngine    from "./pages/RiskEngine";
import MacroOverlay  from "./pages/MacroOverlay";
import BalanceSheet  from "./pages/BalanceSheet";
import Profile       from "./pages/Profile";
import UploadCSV     from "./pages/UploadCSV";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import PipelineMonitor from "./pages/PipelineMonitor";
import Diagnostics     from "./pages/Diagnostics";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <LoadingSpinner text="Loading..." />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppDataProvider>{children}</AppDataProvider>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />}  />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"                  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}     />
      <Route path="/companies"         element={<ProtectedRoute><Companies /></ProtectedRoute>}     />
      <Route path="/companies/:id"     element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
      <Route path="/sectors"           element={<ProtectedRoute><Sectors /></ProtectedRoute>}       />
      <Route path="/correlation"       element={<ProtectedRoute><Correlation /></ProtectedRoute>}   />
      <Route path="/risk-engine"       element={<ProtectedRoute><RiskEngine /></ProtectedRoute>}    />
      <Route path="/macro"             element={<ProtectedRoute><MacroOverlay /></ProtectedRoute>}  />
      <Route path="/balance"           element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>}  />
      <Route path="/profile"           element={<ProtectedRoute><Profile /></ProtectedRoute>}       />
      <Route path="/upload"            element={<ProtectedRoute><UploadCSV /></ProtectedRoute>}     />
      <Route path="/pipeline"           element={<ProtectedRoute><PipelineMonitor /></ProtectedRoute>}  />
      <Route path="/diagnostics"        element={<ProtectedRoute><Diagnostics /></ProtectedRoute>}      />
      <Route path="*"                   element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
