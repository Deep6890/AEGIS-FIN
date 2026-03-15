import { MoreHorizontal } from 'lucide-react';
import BasicArea from '../libAssests/LineChart';

export default function GraphCard({ title = '', subtitle = '' }) {
    return (
        <div className='w-2/3 bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-sm'>

            {/* Header */}
            <div className='flex items-center justify-between'>
                <div className='flex flex-col'>
                    <span className='text-[15px] font-semibold text-gray-800'>{title}</span>
                    <span className='text-[12px] text-gray-400'>{subtitle}</span>
                </div>
                <MoreHorizontal size={18} className='text-gray-400 cursor-pointer' />
            </div>

            {/* Chart */}
            <BasicArea />

        </div>
    );
}
