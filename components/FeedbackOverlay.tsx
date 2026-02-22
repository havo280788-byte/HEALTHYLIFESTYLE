import React from 'react';
import { Check, X, Play } from 'lucide-react';

interface FeedbackOverlayProps {
    isCorrect: boolean;
    correctAnswer: string;
    onNext: () => void;
    stage: number;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ isCorrect, correctAnswer, onNext, stage }) => {
    const getSuccessMessage = (stageNum: number) => {
        const messages: { [key: number]: string } = {
            1: "🌱 Great start!",
            2: "🥗 Smart choice!",
            3: "💧 Well done!",
            4: "🏃 Stay active!",
            5: "💪 Strong work!",
            6: "🧠 Brilliant!",
            7: "🌙 Nice balance!",
            8: "🚴 Great progress!",
            9: "❤️ Fantastic!",
            10: "🏆 Outstanding!"
        };
        return messages[stageNum] || "Great job!";
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-3xl shadow-2xl animate-scale-in">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${isCorrect ? 'from-green-500/90 to-emerald-600/90' : 'from-blue-500/90 to-indigo-600/90'}`} />

                {/* Content */}
                <div className="relative p-8 flex flex-col items-center text-center text-white">
                    {/* Icon Circle */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${isCorrect ? 'bg-green-400 text-white' : 'bg-red-500 text-white'}`}>
                        {isCorrect ? <Check size={48} strokeWidth={4} /> : <X size={48} strokeWidth={4} />}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-black mb-2 drop-shadow-md">
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                    </h2>

                    {/* Subtitle / Answer */}
                    <div className="mb-8 text-white/90 font-medium text-base">
                        {isCorrect ? (
                            <p>{getSuccessMessage(stage)}</p>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <p className="bg-white/20 px-4 py-2 rounded-lg font-bold backdrop-blur-md">
                                    Incorrect. Please review the passage.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Button */}
                    <button
                        onClick={onNext}
                        className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-xl hover:bg-slate-50 transform transition-all active:scale-95 flex items-center justify-center gap-2 group"
                    >
                        Next Stage
                        <Play size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors fill-current" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackOverlay;
