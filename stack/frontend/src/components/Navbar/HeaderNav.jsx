import Logo from '../../assets/logo.svg?react';
import { Search, Bell, Mail } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function HeaderNav() {
  const { currentUser } = useAppData();
  const initials = currentUser?.initials ?? '?';
  const name = currentUser?.name?.split(' ')[0] ?? '';
  const email = currentUser?.email ?? '';
  return (
    <header className="w-full h-16 bg-white px-6 flex items-center justify-between shrink-0 border-b border-[#e4ebe4]">

      {/*Logo of the smartflare*/}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#1a3c2e] flex items-center justify-center">
          <Logo className="w-5 h-5 brightness-0 invert" />
        </div>
        <span className="text-[15px] font-bold text-[#1a2e1a] tracking-tight">RiskLens</span>
      </div>

      {/*Search section need to modify when the activity section need to modify the things*/}
      <div className="hidden md:flex items-center gap-2 border border-[#e4ebe4] rounded-xl px-3 h-9 w-100 bg-[#f7f9f7]">
        <Search size={13} className="text-[#7a9a7a] shrink-0" />
        <input
          type="text"
          placeholder="Search companies, sectors..."
          className="bg-transparent text-[13px] text-[#1a2e1a] placeholder-[#9ab09a] outline-none w-full"
        />
        <span className="text-[10px] text-[#b0c8b0] border border-[#e4ebe4] rounded px-1.5 py-0.5 font-mono shrink-0">⌘F</span>
      </div>

      {/*email mail and notifications*/}
      <div className="flex items-center gap-2">
        <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl border border-[#e4ebe4] bg-white text-[#7a9a7a] hover:bg-[#f0f5f0] transition">
          <Mail size={15} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e4ebe4] bg-white text-[#7a9a7a] hover:bg-[#f0f5f0] transition">
          <Bell size={15} />
        </button>
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#e4ebe4] ml-1">
          <div className="w-8 h-8 rounded-full bg-[#1a3c2e] flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-[#1a2e1a]">{name}</span>
            <span className="text-[10px] text-[#7a9a7a]">{email}</span>
          </div>
        </div>
      </div>

    </header>
  );
}
