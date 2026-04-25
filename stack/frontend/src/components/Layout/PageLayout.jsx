import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function PageLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-[#F5F4F0] dark:bg-[#0C0C0B]">
      <Sidebar />
      <div className="flex-1 min-w-0 ml-[68px] flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-5 lg:p-7 min-w-0 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
