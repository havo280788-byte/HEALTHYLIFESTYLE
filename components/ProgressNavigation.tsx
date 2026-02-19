import React from 'react';
import { GAME_STAGES, STAGE_ICONS } from '../constants';
import { Check } from 'lucide-react';

interface ProgressNavigationProps {
    currentStage: number;
}

const ProgressNavigation: React.FC<ProgressNavigationProps> = ({ currentStage }) => {
    return (
        <div className="w-full bg-white p-4 shadow-sm border-b border-slate-100 sticky top-0 z-50 overflow-x-auto">
            <div className="max-w-4xl mx-auto min-w-[600px]"> {/* Ensure min-width for mobile scrolling */}
                <div className="flex items-center justify-between relative px-2">

                    {/* Connecting Line */}
                    <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 rounded-full" />
                    <div
                        className="absolute left-0 top-1/2 h-1 bg-[#86EFAC] -z-10 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(currentStage / (GAME_STAGES.length - 1)) * 100}%` }}
                    />

                    {GAME_STAGES.map((_, index) => {
                        const isCompleted = index < currentStage;
                        const isActive = index === currentStage;

                        // Default Upcoming: Gray #D1D5DB
                        let bgColor = 'bg-[#D1D5DB]';
                        let textColor = 'text-white';
                        let borderColor = 'border-transparent';
                        let scale = 'scale-100';
                        let shadow = '';

                        if (isCompleted) {
                            bgColor = 'bg-[#86EFAC]'; // Completed #86EFAC (Light Green)
                            textColor = 'text-white';
                        } else if (isActive) {
                            bgColor = 'bg-[#22C55E]'; // Active #22C55E (Green)
                            textColor = 'text-white';
                            scale = 'scale-125';
                            borderColor = 'ring-4 ring-green-100';
                            shadow = 'shadow-lg';
                        }

                        return (
                            <div key={index} className="flex flex-col items-center group relative cursor-default">
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300
                    ${bgColor} ${textColor} ${scale} ${borderColor} ${shadow}
                  `}
                                >
                                    {/* Always show Icon, even if completed, or strictly follow "check" if user prefers? 
                      The user asked for "Display as: 🌱...". Usually seeing the icon is better than a checkmark for this style.
                      But if they strictly want "Completed -> Pale", let's keeps the icon to maintain the theme.
                   */}
                                    {STAGE_ICONS[index]}
                                </div>

                                {/* Tooltip for Stage Name */}
                                <div className={`
                    absolute top-12 text-[10px] font-bold text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                    ${isActive ? 'opacity-100 text-[#0F766E]' : ''}
                `}>
                                    {index + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProgressNavigation;
