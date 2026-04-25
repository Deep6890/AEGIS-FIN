import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AnimatedBackground from "../ui/AnimatedBackground";

export default function PageLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] relative">
      <AnimatedBackground />
      <Sidebar />
      <div className="flex-1 min-w-0 ml-[76px] flex flex-col min-h-screen relative z-10">
        <TopBar title={title} />
        <main className="flex-1 p-5 lg:p-7 min-w-0 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
