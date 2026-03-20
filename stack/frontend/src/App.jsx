import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import CompanyBrowser from "./pages/CompanyBrowser";
import CompanyDetail from "./pages/CompanyDetail";
import BalanceSheetHub from "./pages/BalanceSheetHub";
import SectorIntelligence from "./pages/SectorIntelligence";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NewsMonitor from "./pages/NewsMonitor";
import DataManager from "./pages/DataManager";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/companies" element={<CompanyBrowser />} />
        <Route path="/company/:id" element={<CompanyDetail />} />
        <Route path="/balance-sheet" element={<BalanceSheetHub />} />
        <Route path="/sectors" element={<SectorIntelligence />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/news" element={<NewsMonitor />} />
        <Route path="/data" element={<DataManager />} />
      </Routes>
    </Router>
  );
}

export default App;
