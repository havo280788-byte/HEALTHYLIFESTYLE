import React from 'react';
import { Question, Option } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface QuizCardProps {
    question: Question;
    selectedAnswer: string | null;
    isAnswerConfirmed?: boolean;
    isTeacherMode?: boolean;
    onSelect: (optionId: string) => void;
    feedbackMessage?: string | null;
    currentStage: number;
}

const QuizCard: React.FC<QuizCardProps> = ({
    question,
    selectedAnswer,
    isAnswerConfirmed = false,
    isTeacherMode = false,
    onSelect,
    feedbackMessage,
    currentStage
}) => {
    const successMessages: Record<number, string> = {
        1: '🏃 Great start!', 2: '⏱ Smart choice!', 3: '🏠 Well done!',
        4: '📱 Stay active!', 5: '🥗 Strong work!', 6: '⭐ Brilliant!',
        7: '🪞 Nice balance!', 8: '💪 Great progress!', 9: '🌳 Fantastic!', 10: '🏆 Outstanding!'
    };

    return (
        <div className="flex flex-col flex-1 rounded-2xl md:overflow-hidden"
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>

            {/* Card Header */}
            <div className="shrink-0 p-3 md:p-4 flex justify-between items-center"
                style={{ borderBottom: '1px solid var(--card-border)' }}>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                    {isTeacherMode ? `Stage ${currentStage + 1}` : `Question ${currentStage + 1} / 10`}
                </span>
                {isTeacherMode && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Multiple Choice</span>
                    </div>
                )}
            </div>

            {/* Question Content */}
            <div className="shrink-0 p-3 md:p-5">
                <h2 className="font-bold text-sm md:text-2xl leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {question.content}
                </h2>
            </div>

            {/* Options */}
            <div className="flex-1 flex flex-col justify-center p-3 md:p-5 gap-2.5 min-h-0 overflow-y-auto">
                {question.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                    const isSelected = selectedAnswer === opt.id;
                    const isCorrectAnswer = opt.id === question.correctAnswerId;
                    const showResult = isTeacherMode ? selectedAnswer !== null : isAnswerConfirmed;

                    let optStyle: React.CSSProperties = {};
                    let textClass = '';
                    let statusIcon = null;
                    let letterStyle: React.CSSProperties = {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)'
                    };

                    if (!showResult) {
                        if (isSelected) {
                            optStyle = {
                                background: isTeacherMode ? 'var(--primary-light)' : 'rgba(32,180,134,0.2)',
                                border: `2px solid var(--primary)`,
                                boxShadow: isTeacherMode ? 'none' : '0 0 15px rgba(32,180,134,0.25)'
                            };
                            textClass = 'font-bold';
                        } else {
                            optStyle = {
                                background: 'var(--bg-secondary)',
                                border: '1.5px solid var(--card-border)'
                            };
                        }
                    } else {
                        // After confirmed/revealed
                        if (isCorrectAnswer) {
                            optStyle = {
                                background: isTeacherMode ? 'var(--success)' : 'rgba(34,197,94,0.2)',
                                border: `2px solid var(--success)`,
                                boxShadow: isTeacherMode ? 'none' : '0 0 15px rgba(34,197,94,0.3)',
                                color: isTeacherMode ? 'var(--text-inverse)' : 'inherit'
                            };
                            textClass = 'font-bold';
                            statusIcon = <CheckCircle2 size={18} className={isTeacherMode ? 'text-white' : 'text-green-400'} />;
                            letterStyle = isTeacherMode ? { background: 'rgba(255,255,255,0.25)', color: 'var(--text-inverse)' } : letterStyle;
                        } else if (isSelected && !isCorrectAnswer) {
                            optStyle = {
                                background: isTeacherMode ? 'var(--error)' : 'rgba(239,68,68,0.15)',
                                border: `2px solid var(--error)`,
                                boxShadow: isTeacherMode ? 'none' : '0 0 15px rgba(239,68,68,0.2)',
                                color: isTeacherMode ? 'var(--text-inverse)' : 'inherit'
                            };
                            textClass = 'font-bold';
                            statusIcon = <XCircle size={18} className={isTeacherMode ? 'text-white' : 'text-red-400'} />;
                            letterStyle = isTeacherMode ? { background: 'rgba(255,255,255,0.25)', color: 'var(--text-inverse)' } : letterStyle;
                        } else {
                            optStyle = {
                                background: isTeacherMode ? 'var(--bg-secondary)' : 'var(--card-soft)',
                                border: '1px solid var(--card-border)',
                                opacity: 0.5,
                                color: isTeacherMode ? 'var(--text-muted)' : 'inherit'
                            };
                            letterStyle = isTeacherMode ? { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' } : letterStyle;
                        }
                    }

                    return (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id)}
                            disabled={showResult}
                            className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-4 transition-all duration-200 ${!showResult && !isSelected ? 'hover:brightness-95' : ''}`}
                            style={optStyle}
                        >
                            {isTeacherMode && (
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-base md:text-xl shrink-0 transition-colors"
                                    style={letterStyle}>
                                    {showResult && isCorrectAnswer ? <CheckCircle2 size={18} /> : letter}
                                </div>
                            )}

                            <span className={`text-sm md:text-lg flex-1 ${textClass}`} style={{ color: !showResult && !isTeacherMode ? (isSelected ? 'var(--primary-active)' : 'var(--text-secondary)') : 'inherit' }}>
                                {opt.text}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {statusIcon}
                                {!showResult && isSelected && !isTeacherMode && (
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                                )}
                                {isTeacherMode && showResult && isCorrectAnswer && (
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                                        ✓
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizCard;
