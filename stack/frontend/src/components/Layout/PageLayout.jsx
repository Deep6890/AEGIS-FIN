import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function PageLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex-1 min-w-0 ml-[60px] flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-5 lg:p-6 min-w-0 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
