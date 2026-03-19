import HeaderNav from '../Navbar/HeaderNav';
import VerticalNav from '../Navbar/VerticalNav';

export default function PageLayout({ children }) {
  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />
        <main className="flex-1 px-8 py-6 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
