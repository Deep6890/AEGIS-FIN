import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import RiskAnalysis from "./pages/RiskAnalysis";
import NotFound from "./pages/NotFound";
import MainNavBar from "./components/Navbar/MainNavBar";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000000] text-white">

      {/* HEADER */}
      <header className="">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Logo */}
          <h1
            className="text-xl sm:text-2xl font-semibold tracking-wide cursor-pointer"
            onClick={() => navigate('/')}
          >
            Smart<span className="text-emerald-400">Flare</span>
          </h1>

          {/* Navbar */}
          <div className="hidden md:flex flex-1 justify-center">
            <MainNavBar />
          </div>

        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="max-w-full mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/risk-analysis" element={<RiskAnalysis />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

    </div>
  );
}

export default App;
