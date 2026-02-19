import React from 'react';
import { GAME_STAGES } from '../constants';
import { Check } from 'lucide-react';

interface ProgressNavigationProps {
    currentStage: number;
}

const ProgressNavigation: React.FC<ProgressNavigationProps> = ({ currentStage }) => {
    return (
        <div className="w-full bg-white p-4 shadow-sm border-b border-slate-100 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between relative">

                    {/* Connecting Line */}
                    <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 rounded-full" />
                    <div
                        className="absolute left-0 top-1/2 h-1 bg-green-200 -z-10 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(currentStage / (GAME_STAGES.length - 1)) * 100}%` }}
                    />

                    {GAME_STAGES.map((_, index) => {
                        const isCompleted = index < currentStage;
                        const isActive = index === currentStage;
                        const isUpcoming = index > currentStage;

                        let bgColor = 'bg-gray-200'; // Upcoming #E5E7EB
                        let textColor = 'text-gray-500';
                        let borderColor = 'border-transparent';
                        let scale = 'scale-100';

                        if (isCompleted) {
                            bgColor = 'bg-[#86EFAC]'; // Completed #86EFAC (Light Green)
                            textColor = 'text-green-800';
                        } else if (isActive) {
                            bgColor = 'bg-[#22C55E]'; // Active #22C55E (Green)
                            textColor = 'text-white';
                            scale = 'scale-110';
                            borderColor = 'ring-4 ring-green-100';
                        }

                        return (
                            <div key={index} className="flex flex-col items-center">
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300
                    ${bgColor} ${textColor} ${scale} ${borderColor}
                  `}
                                >
                                    {isCompleted ? <Check size={18} /> : index + 1}
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
