import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import AegisRouter from "./aegis/AegisRouter";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <Routes>
          <Route path="/aegis/*" element={<AegisRouter />} />
          <Route path="*" element={<Navigate to="/aegis/portfolio" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}
