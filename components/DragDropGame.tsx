import React, { useState, useEffect, useRef } from 'react';
import { GameItem, GAME_CONTENT, SOUND_EFFECTS } from '../constants';
import { Sparkles, Brain, Activity, FolderHeart, GraduationCap } from 'lucide-react';

interface DragDropGameProps {
    onComplete: (score: number) => void;
    onCorrect: () => void;
    onIncorrect: () => void;
}

const DragDropGame: React.FC<DragDropGameProps> = ({ onComplete, onCorrect, onIncorrect }) => {
    const [activities, setActivities] = useState<GameItem[]>([]);
    const [reasons, setReasons] = useState<GameItem[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<GameItem | null>(null);
    const [selectedReason, setSelectedReason] = useState<GameItem | null>(null);
    const [matches, setMatches] = useState<string[]>([]); // Array of activity IDs that are matched
    const [isAnimating, setIsAnimating] = useState<string | null>(null);

    // Audio refs
    const audioCorrect = useRef<HTMLAudioElement | null>(null);
    const audioIncorrect = useRef<HTMLAudioElement | null>(null);
    const audioClick = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        audioCorrect.current = new Audio(SOUND_EFFECTS.correct);
        audioIncorrect.current = new Audio(SOUND_EFFECTS.incorrect);
        audioClick.current = new Audio(SOUND_EFFECTS.click);

        // Shuffle items
        setActivities([...GAME_CONTENT.activities].sort(() => Math.random() - 0.5));
        setReasons([...GAME_CONTENT.reasons].sort(() => Math.random() - 0.5));
    }, []);

    const playSound = (type: 'correct' | 'incorrect' | 'click') => {
        const audio = type === 'correct' ? audioCorrect.current : type === 'incorrect' ? audioIncorrect.current : audioClick.current;
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { }); // Ignore autoplay errors
        }
    };

    const handleSelectActivity = (item: GameItem) => {
        if (matches.includes(item.id)) return;
        playSound('click');
        setSelectedActivity(item.id === selectedActivity?.id ? null : item);
    };

    const handleSelectReason = (item: GameItem) => {
        if (matches.includes(item.id.replace('r', 'a'))) return;
        playSound('click');
        setSelectedReason(item.id === selectedReason?.id ? null : item);
    };

    const handleDrop = (targetType: 'mind' | 'body') => {
        if (!selectedActivity || !selectedReason) return;

        const activityId = selectedActivity.id;
        const activityIndex = activityId.replace('a', '');
        const reasonIndex = selectedReason.id.replace('r', '');

        // Check if activity matches reason AND both match the folder
        const isCorrectMatch = activityIndex === reasonIndex;
        const isCorrectTarget = selectedActivity.target === targetType;

        if (isCorrectMatch && isCorrectTarget) {
            playSound('correct');
            setMatches([...matches, activityId]);
            onCorrect();
            setSelectedActivity(null);
            setSelectedReason(null);

            if (matches.length + 1 === GAME_CONTENT.activities.length) {
                onComplete(6);
            }
        } else {
            playSound('incorrect');
            onIncorrect();
            setIsAnimating('shake');
            setTimeout(() => setIsAnimating(null), 500);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Column 1: Evidence (Activity) */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#20B486] flex items-center gap-2 mb-2">
                        <Activity size={16} /> Evidence (Activity)
                    </h3>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {activities.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectActivity(item)}
                                disabled={matches.includes(item.id)}
                                className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform border-2 ${matches.includes(item.id)
                                    ? 'opacity-30 scale-95 border-transparent bg-gray-100'
                                    : selectedActivity?.id === item.id
                                        ? 'border-[#20B486] bg-[#20B486]/10 shadow-[0_0_15px_rgba(32,180,134,0.3)] scale-102'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <p className="text-sm font-medium text-white">{item.text}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column 2: Reason */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#3B82F6] flex items-center gap-2 mb-2">
                        <GraduationCap size={16} /> Reason
                    </h3>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {reasons.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectReason(item)}
                                disabled={matches.includes(item.id.replace('r', 'a'))}
                                className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform border-2 ${matches.includes(item.id.replace('r', 'a'))
                                    ? 'opacity-30 scale-95 border-transparent bg-gray-100'
                                    : selectedReason?.id === item.id
                                        ? 'border-[#3B82F6] bg-[#3B82F6]/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-102'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <p className="text-sm font-medium text-white">{item.text}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column 3: Target Folders */}
                <div className="flex flex-col gap-6 justify-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#F59E0B] flex items-center gap-2 mb-2">
                        <FolderHeart size={16} /> Classification
                    </h3>

                    <button
                        onClick={() => handleDrop('mind')}
                        className={`group relative p-8 rounded-3xl border-3 flex flex-col items-center gap-4 transition-all duration-500 overflow-hidden ${selectedActivity && selectedReason
                            ? 'border-[#20B486] bg-[#20B486]/5 cursor-pointer hover:bg-[#20B486]/10 hover:scale-105'
                            : 'border-white/5 bg-white/2 opacity-60'
                            }`}
                    >
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#20B486]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Brain size={48} className="text-[#20B486]" />
                        </div>
                        <span className="relative z-10 font-black text-white text-lg tracking-wide uppercase">A Healthy Mind</span>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#20B486]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => handleDrop('body')}
                        className={`group relative p-8 rounded-3xl border-3 flex flex-col items-center gap-4 transition-all duration-500 overflow-hidden ${selectedActivity && selectedReason
                            ? 'border-[#3B82F6] bg-[#3B82F6]/5 cursor-pointer hover:bg-[#3B82F6]/10 hover:scale-105'
                            : 'border-white/5 bg-white/2 opacity-60'
                            }`}
                    >
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Activity size={48} className="text-[#3B82F6]" />
                        </div>
                        <span className="relative z-10 font-black text-white text-lg tracking-wide uppercase">A Healthy Body</span>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-[#20B486] uppercase tracking-wider">Matched Pairs</span>
                    <span className="text-lg font-black text-white">{matches.length}/6</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-[#20B486] to-[#3B82F6] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(32,180,134,0.5)]"
                        style={{ width: `${(matches.length / 6) * 100}%` }}
                    />
                </div>
            </div>

            <style jsx>{`
        .scale-102 { transform: scale(1.02); }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
};

export default DragDropGame;
