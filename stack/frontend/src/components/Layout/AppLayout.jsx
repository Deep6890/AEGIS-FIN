import React from "react";
import TopBar from "./TopBar";
import BottomDock from "./BottomDock";

export default function AppLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-surface-page dark:bg-surface-dark">
      <TopBar title={title} />
      {/* pt-14 clears fixed TopBar, pb-28 clears fixed BottomDock */}
      <main className="pt-14 pb-28 px-6 min-w-0 animate-fade-in">
        <div className="max-w-screen-xl mx-auto py-6">
          {children}
        </div>
      </main>
      <BottomDock />
    </div>
  );
}
