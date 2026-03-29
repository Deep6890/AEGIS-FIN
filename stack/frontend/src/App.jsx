import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext";
import Dashboard     from "./pages/Dashboard";
import Companies     from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Sectors       from "./pages/Sectors";
import Correlation   from "./pages/Correlation";
import RiskEngine    from "./pages/RiskEngine";
import MacroOverlay  from "./pages/MacroOverlay";
import BalanceSheet  from "./pages/BalanceSheet";

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Routes>
          <Route path="/"                  element={<Dashboard />}     />
          <Route path="/companies"         element={<Companies />}     />
          <Route path="/companies/:id"     element={<CompanyDetail />} />
          <Route path="/sectors"           element={<Sectors />}       />
          <Route path="/correlation"       element={<Correlation />}   />
          <Route path="/risk-engine"       element={<RiskEngine />}    />
          <Route path="/macro"             element={<MacroOverlay />}  />
          <Route path="/balance"           element={<BalanceSheet />}  />
        </Routes>
      </AppDataProvider>
    </BrowserRouter>
  );
}
