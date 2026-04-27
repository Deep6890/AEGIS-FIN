import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AnimatedBackground from "../ui/AnimatedBackground";

export default function PageLayout({ title, children }) {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] relative">
      <AnimatedBackground />
      <Sidebar />
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen relative z-10 ${
        isMobile ? "ml-0" : "ml-[76px]"
      }`}>
        <TopBar title={title} />
        <main className={`flex-1 p-4 md:p-5 lg:p-7 min-w-0 animate-fade-in ${
          isMobile ? "pb-20" : ""
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
