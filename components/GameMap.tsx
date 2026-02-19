import React from 'react';
import { GAME_STAGES, THEME_COLORS } from '../constants';
import { CheckCircle2, User, Trophy, Lock } from 'lucide-react';

interface GameMapProps {
    currentStage: number;
}

const GameMap: React.FC<GameMapProps> = ({ currentStage }) => {
    return (
        <div className="w-full max-w-4xl mx-auto mb-8 animate-fade-in">
            {/* Scrollable container for mobile if needed, but we'll try to fit it */}
            <div className="relative">
                {/* Connecting Line - simplified as a background spine */}
                <div
                    className="absolute left-1/2 top-4 bottom-4 w-2 -ml-1 rounded-full hidden md:block"
                    style={{ backgroundColor: '#e2e8f0' }}
                />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-y-8 relative">
                    {GAME_STAGES.map((stageName, index) => {
                        const isCompleted = index < currentStage;
                        const isCurrent = index === currentStage;
                        const isLocked = index > currentStage;

                        // Determine colors based on state
                        let bgColor = 'bg-slate-100';
                        let borderColor = 'border-slate-300';
                        let textColor = 'text-slate-400';
                        let Icon = Lock;

                        if (isCompleted) {
                            bgColor = 'bg-green-100';
                            borderColor = 'border-green-500';
                            textColor = 'text-green-700';
                            Icon = CheckCircle2;
                        } else if (isCurrent) {
                            // Use the teal theme
                            bgColor = 'bg-[#0F766E]/10'; // Deep Teal with opacity
                            borderColor = 'border-[#0F766E]';
                            textColor = 'text-[#0F766E]';
                            Icon = User;
                        }

                        return (
                            <div
                                key={index}
                                className={`
                  relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all duration-300
                  ${bgColor} ${borderColor}
                  ${isCurrent ? 'transform scale-105 shadow-lg z-10 ring-4 ring-[#5EEAD4]/50' : 'scale-100'}
                  ${isLocked ? 'opacity-70 grayscale' : 'opacity-100'}
                `}
                            >
                                {/* Stage Badge */}
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-sm
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-[#0F766E] text-white animate-bounce' : ''}
                    ${isLocked ? 'bg-slate-300 text-slate-500' : ''}
                  `}
                                >
                                    {isCurrent ? <User size={20} /> : <Icon size={20} />}
                                </div>

                                {/* Stage Name */}
                                <span className={`text-xs font-bold leading-tight ${textColor}`}>
                                    {index + 1}. {stageName}
                                </span>

                                {/* Connector line for mobile flow usually handles via grid automatically, 
                     but we can add little pseudo elements if we want to be fancy. 
                     For now, simple grid is good. */}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GameMap;
