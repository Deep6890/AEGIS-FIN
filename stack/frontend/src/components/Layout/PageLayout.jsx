import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function PageLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-[#f8f7f4] dark:bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex-1 min-w-0 ml-16 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
