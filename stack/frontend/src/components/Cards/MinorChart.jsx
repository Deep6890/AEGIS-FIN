import { MoreHorizontal } from 'lucide-react';
import BasicPie from '../libAssests/PieChart';

const legend = [
    { label: 'Unstable Sector',  color: '#7c3aed', value: '35%' },
    { label: 'Unstable Company', color: '#d4a853', value: '40%' },
    { label: 'Environment Risk', color: '#10b981', value: '25%' },
];

export default function MinorChart({ title = '', subtitle = '' }) {
    return (
        <div className='w-80 shrink-0 bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm border border-gray-100'>

            {/* Header */}
            <div className='flex items-center justify-between'>
                <div className='flex flex-col'>
                    <span className='text-[14px] font-semibold text-gray-900'>{title}</span>
                    <span className='text-[11px] text-gray-400'>{subtitle}</span>
                </div>
                <MoreHorizontal size={16} className='text-gray-400 cursor-pointer' />
            </div>

            {/* Pie */}
            <BasicPie />

            {/* Legend */}
            <div className='flex flex-col gap-2'>
                {legend.map(({ label, color, value }) => (
                    <div key={label} className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: color }} />
                            <span className='text-[11px] text-gray-500'>{label}</span>
                        </div>
                        <span className='text-[11px] font-semibold text-gray-700'>{value}</span>
                    </div>
                ))}
            </div>

        </div>
    );
}
