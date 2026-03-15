import Logo from '../../assets/logo.svg?react';
import { Search, Bell, MessageSquare, User } from 'lucide-react';

export default function HeaderNav() {
    return (
        <header className="w-full h-16 bg-[#EAE9E3]  px-4 sm:px-6 flex items-center justify-between shrink-0">

            {/* LEFT — Logo + Greeting */}
            <div className="flex items-center gap-8 ml-0">
                <Logo className="w-8 h-8 shrink-0" />
                <div className="hidden sm:flex flex-col leading-tight">
                    <span className="text-[#1a1a1a] font-semibold text-sm">Hi, Deep!</span>
                    <span className="text-[#7a7a72] text-xs">Explore Risk & Analysis</span>
                </div>
            </div>

            {/* RIGHT — Search + Icons */}
            <div className="flex items-center gap-2">

                {/* Search with icon inside left of border */}
                <div className="hidden md:flex items-center gap-2 border border-[#B0AFA8] rounded-full px-3 h-9 w-60 bg-[#F2F1EB]">
                    <Search size={13} className="text-[#7a7a72] shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent text-sm text-[#1a1a1a] placeholder-[#9a9a92] outline-none w-full"
                    />
                </div>

                {/* Message */}
                <button className="w-9 h-9 flex items-center justify-center rounded-full border border-[#B0AFA8] bg-[#F2F1EB] text-[#5a5a52] hover:text-[#1a1a1a] hover:bg-[#DDDDD6] transition">
                    <MessageSquare size={16} />
                </button>

                {/* Notification */}
                <button className="w-9 h-9 flex items-center justify-center rounded-full border border-[#B0AFA8] bg-[#F2F1EB] text-[#5a5a52] hover:text-[#1a1a1a] hover:bg-[#DDDDD6] transition">
                    <Bell size={16} />
                </button>

                {/* Avatar */}
                <button className="w-9 h-9 flex items-center justify-center rounded-full border border-[#8B8B7A] bg-[#DDDDD6] text-[#3a3a32] hover:bg-[#C8C7BF] transition font-semibold text-xs">
                    D
                </button>

            </div>
        </header>
    );
}