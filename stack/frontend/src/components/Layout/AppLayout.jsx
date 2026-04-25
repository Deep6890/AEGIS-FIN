import React from 'react';
import BottomDock from './BottomDock';
import TopBar from './TopBar';

export default function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen">
      <TopBar />
      <main className="px-6 pt-[80px] pb-28 max-w-7xl mx-auto">
        {children}
      </main>
      <BottomDock />
    </div>
  );
}
