import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function PageLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
