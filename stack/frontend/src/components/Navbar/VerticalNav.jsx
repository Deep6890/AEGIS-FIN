import {
    LayoutGrid, MessageSquare, BarChart3,
    CalendarDays, Users, FileText,
    Settings, HelpCircle, LogOut
} from "lucide-react";

const topItems = [
    { icon: LayoutGrid },
    { icon: MessageSquare },
    { icon: BarChart3 },
    { icon: CalendarDays },
    { icon: Users },
    { icon: FileText },
];

const bottomItems = [
    { icon: Settings },
    { icon: HelpCircle },
];

export default function VerticalNav() {
    return (
        <div className="h-full w-[72px] flex flex-col items-center bg-[#EAE9E3] py-4 shrink-0">

            {/* Pill container */}
            <div className="flex flex-col justify-between bg-[#F2F1EB] border border-[#C8C7BF] rounded-full py-5 w-[48px] flex-1">

                {/* Top Icons */}
                <div className="flex flex-col items-center gap-4">
                    {topItems.map(({ icon: Icon }, i) => (
                        <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-[#6a6a62] hover:text-[#1a1a1a] hover:bg-[#DDDDD6] transition">
                            <Icon size={17} />
                        </button>
                    ))}
                </div>

                {/* Bottom Icons */}
                <div className="flex flex-col items-center gap-4">
                    {bottomItems.map(({ icon: Icon }, i) => (
                        <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-[#6a6a62] hover:text-[#1a1a1a] hover:bg-[#DDDDD6] transition">
                            <Icon size={17} />
                        </button>
                    ))}
                </div>

            </div>

            {/* Avatar + Logout */}
            <div className="flex flex-col items-center gap-3 pt-4">
                <div className="w-9 h-9 rounded-full border border-[#8B8B7A] bg-[#DDDDD6] flex items-center justify-center text-[#3a3a32] text-xs font-bold">D</div>
                <button className="text-[#9a9a92] hover:text-red-500 transition">
                    <LogOut size={16} />
                </button>
            </div>

        </div>
    );
}