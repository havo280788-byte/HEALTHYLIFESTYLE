import React, { useMemo, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { BarChart, DonutChart } from './DashboardCharts';
import { Trophy, RefreshCw, X, Clock, Users, Target, Zap, BookOpen, Brain, Search, MessageSquare } from 'lucide-react';
import { FALLBACK_QUESTIONS } from '../constants';

interface LeaderboardDashboardProps {
    entries: LeaderboardEntry[];
    onReset: () => void;
    onExit: () => void;
    isSyncing?: boolean;
    isTeacherMode?: boolean;
    currentUserName?: string;
    onViewMyAttempt?: () => void;
}

const LeaderboardDashboard: React.FC<LeaderboardDashboardProps> = ({ entries, onReset, onExit, isSyncing = false, isTeacherMode = false, currentUserName = '', onViewMyAttempt }) => {
    const [viewMode, setViewMode] = useState<'student' | 'teacher'>(isTeacherMode ? 'teacher' : 'student');

    // Question IDs in order
    const questionIds = FALLBACK_QUESTIONS.slice(0, 10).map(q => q.id);

    // --- Teacher Analytics ---
    const teacherStats = useMemo(() => {
        if (entries.length === 0) return null;

        const total = entries.length;
        const totalQuestions = 10;

        // Avg Accuracy
        const avgAccuracy = Math.round(
            entries.reduce((sum, e) => {
                const correct = e.answers ? Object.values(e.answers).filter(Boolean).length : 0;
                return sum + (correct / totalQuestions) * 100;
            }, 0) / total
        );

        // Fastest time (among ≥80% accuracy)
        const highScorers = entries.filter(e => {
            const correct = e.answers ? Object.values(e.answers).filter(Boolean).length : 0;
            return (correct / totalQuestions) >= 0.8;
        });
        const fastestTime = highScorers.length > 0
            ? Math.min(...highScorers.map(e => e.timeSpent))
            : null;

        // Per-question accuracy
        const questionInsights = questionIds.map((qId, idx) => {
            const correctCount = entries.filter(e => e.answers?.[qId] === true).length;
            const rate = Math.round((correctCount / total) * 100);
            return { label: `Q${idx + 1}`, qId, correctCount, total, rate };
        });

        // Hardest questions (lowest rate)
        const minRate = Math.min(...questionInsights.map(q => q.rate));
        const hardest = questionInsights.filter(q => q.rate === minRate).map(q => q.label);

        // Skills breakdown
        // Fact Retrieval: mc1, mc2 (direct fact from text)
        // Reference (Pronouns/Context): mc3, mc4 (vocabulary/context)
        // Inference: tf1, tf2, tf3 (True/False/Doesn't Say = inference)
        // Detail/Scanning: mc5, tf4, tf5 (scanning for detail)
        const getSkillStats = (ids: string[]) => {
            let correct = 0;
            let possible = 0;
            entries.forEach(e => {
                ids.forEach(id => {
                    if (e.answers?.[id] !== undefined) {
                        possible++;
                        if (e.answers[id]) correct++;
                    }
                });
            });
            return { correct, possible, rate: possible > 0 ? Math.round((correct / possible) * 100) : 0 };
        };

        // Q1=tf1, Q2=mc1, Q3=tf2, Q4=mc3, Q5=tf3, Q6=mc2, Q7=mc4, Q8=tf4, Q9=tf5, Q10=mc5
        const skills = [
            { label: 'Scanning', icon: '🔍', ...getSkillStats(['tf1', 'mc1', 'tf2', 'mc3', 'mc2', 'mc4', 'tf4', 'mc5']), color: '#3b82f6' },
            { label: 'Recognizing / Classifying Supporting Details', icon: '🧩', ...getSkillStats(['tf3', 'tf5']), color: '#a855f7' },
        ];

        return { total, avgAccuracy, fastestTime, questionInsights, hardest, skills };
    }, [entries]);

    // --- Student Analytics (existing) ---
    const studentStats = useMemo(() => {
        if (entries.length === 0) return null;
        const totalPlayers = entries.length;
        const fastestTime = Math.min(...entries.map(e => e.timeSpent));

        const questionRates = questionIds.map((qId, idx) => {
            const correctCount = entries.filter(e => e.answers?.[qId]).length;
            const rate = (correctCount / totalPlayers) * 100;
            return { label: `Q${idx + 1}`, value: rate };
        });

        const getRate = (ids: string[]) => {
            let totalCorrect = 0;
            entries.forEach(e => {
                ids.forEach(id => { if (e.answers?.[id]) totalCorrect++; });
            });
            return totalCorrect;
        };

        const skillsData = [
            { label: 'Critical Thinking', value: getRate(['tf1', 'tf2', 'tf3', 'tf4', 'tf5']), color: '#f472b6' },
            { label: 'Fact Retrieval', value: getRate(['mc1', 'mc2', 'mc3']), color: '#22c55e' },
            { label: 'Reading Comp.', value: getRate(['mc4', 'mc5']), color: '#60a5fa' },
        ];

        return { totalPlayers, fastestTime, questionRates, skillsData };
    }, [entries]);

    const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // ===========================
    // TEACHER VIEW
    // ===========================
    const renderTeacherView = () => (
        <div className="min-h-screen bg-slate-50 font-['Poppins']">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-[#0F766E]">📊 Teacher Dashboard</h1>
                        <p className="text-xs text-slate-400">Class analytics & question insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Toggle */}
                        <div className="bg-slate-100 rounded-lg p-0.5 flex text-xs font-bold border border-slate-200">
                            <button
                                onClick={() => setViewMode('student')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'student' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >STUDENT</button>
                            <button
                                onClick={() => setViewMode('teacher')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'teacher' ? 'bg-[#0F766E] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >TEACHER</button>
                        </div>
                        <button onClick={onExit} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors border border-slate-200">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
                {!teacherStats ? (
                    <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                        <Users size={48} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium text-lg">No submissions yet</p>
                    </div>
                ) : (
                    <>
                        {/* CLASS SNAPSHOT */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Zap size={14} /> Class Snapshot
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Teams Joined</div>
                                    <div className="text-2xl md:text-3xl font-black text-indigo-600">{teacherStats.total}</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Completion</div>
                                    <div className="text-2xl md:text-3xl font-black text-green-600">100%</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Accuracy</div>
                                    <div className="text-2xl md:text-3xl font-black text-[#0F766E]">{teacherStats.avgAccuracy}%</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fastest (≥80%)</div>
                                    <div className="text-2xl md:text-3xl font-black text-amber-600">
                                        {teacherStats.fastestTime !== null ? fmtTime(teacherStats.fastestTime) : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* QUESTION INSIGHTS */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Target size={14} /> Question Insights
                            </h2>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="space-y-2.5">
                                    {teacherStats.questionInsights.map((q) => (
                                        <div key={q.label} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-500 w-8 shrink-0">{q.label}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${q.rate >= 70 ? 'bg-green-500' : q.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.max(q.rate, 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 w-12 text-right">{q.rate}%</span>
                                            <span className="text-[10px] text-slate-400 w-10 text-right">{q.correctCount}/{q.total}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                        Hardest: {teacherStats.hardest.join(', ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SKILLS BREAKDOWN */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <BookOpen size={14} /> AI Reading Skills
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {teacherStats.skills.map((skill) => (
                                    <div key={skill.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                <span>{skill.icon}</span> {skill.label}
                                            </span>
                                            <span className="text-lg font-black" style={{ color: skill.color }}>{skill.rate}%</span>
                                        </div>
                                        <div className="bg-slate-100 rounded-full h-3 overflow-hidden mb-1.5">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(skill.rate, 2)}%`, backgroundColor: skill.color }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">{skill.correct}/{skill.possible} correct</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={onExit}
                                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors border border-slate-200"
                            >
                                BACK TO START
                            </button>
                            <button
                                onClick={onReset}
                                className="py-3 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-md"
                            >
                                RESET DATA
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    // ===========================
    // STUDENT VIEW (existing layout)
    // ===========================
    const renderStudentView = () => (
        <div className="flex bg-gradient-to-br from-[#a5b4fc] to-[#c084fc] min-h-screen p-4 md:p-8 font-sans">
            <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto">

                {/* LEFT PANEL: Class Performance */}
                <div className="flex-[2] p-4 md:p-8 bg-slate-50 overflow-y-auto">
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-xl md:text-3xl font-black text-[#1e1b4b]">Class Performance</h1>
                        <p className="text-slate-500 text-sm">Real-time statistics from all players</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Bar Chart Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[#1e1b4b] font-bold mb-4 border-l-4 border-indigo-500 pl-3">Correct Answer Rate</h3>
                            <div className="h-40">
                                {studentStats ? <BarChart data={studentStats.questionRates} color="#6366f1" /> : <div className="h-full flex items-center justify-center text-slate-300">No Data</div>}
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
                                {studentStats?.questionRates.map(d => <span key={d.label}>{d.label}</span>)}
                            </div>
                        </div>

                        {/* Donut Chart Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[#1e1b4b] font-bold mb-4 border-l-4 border-purple-500 pl-3">Skills Breakdown</h3>
                            <div className="h-40 flex items-center justify-center gap-6">
                                {studentStats ? (
                                    <>
                                        <div className="w-32 h-32">
                                            <DonutChart data={studentStats.skillsData} />
                                        </div>
                                        <div className="space-y-2">
                                            {studentStats.skillsData.map((d, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                                    {d.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : <div className="text-slate-300">No Data</div>}
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-indigo-50 p-4 md:p-5 rounded-2xl">
                            <div className="text-xs font-bold text-indigo-400 uppercase mb-1">TOTAL PLAYERS</div>
                            <div className="text-2xl md:text-4xl font-black text-indigo-900">{studentStats?.totalPlayers || 0}</div>
                        </div>
                        <div className="bg-green-50 p-4 md:p-5 rounded-2xl">
                            <div className="text-xs font-bold text-green-500 uppercase mb-1">FASTEST TIME</div>
                            <div className="text-2xl md:text-4xl font-black text-green-900">{studentStats ? `${studentStats.fastestTime}s` : '--'}</div>
                        </div>
                        <div className="bg-orange-50 p-4 md:p-5 rounded-2xl">
                            <div className="text-xs font-bold text-orange-400 uppercase mb-1">COMPLETION RATE</div>
                            <div className="text-2xl md:text-4xl font-black text-orange-900">100%</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Leaderboard List */}
                <div className="flex-1 bg-indigo-600 flex flex-col text-white relative">
                    {/* Header */}
                    <div className="p-4 md:p-8 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h2 className="text-lg md:text-2xl font-black uppercase tracking-wide">LEADERBOARD</h2>
                                <p className="text-indigo-200 text-xs md:text-sm font-bold">TOP 10 PLAYERS</p>
                            </div>
                            <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {isTeacherMode && (
                            <div className="mt-4">
                                <div className="bg-indigo-500/50 rounded-lg p-0.5 flex text-xs font-bold">
                                    <button
                                        onClick={() => setViewMode('student')}
                                        className={`flex-1 px-3 py-1.5 rounded-md transition-all ${viewMode === 'student' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
                                    >STUDENT</button>
                                    <button
                                        onClick={() => setViewMode('teacher')}
                                        className={`flex-1 px-3 py-1.5 rounded-md transition-all ${viewMode === 'teacher' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
                                    >TEACHER</button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-green-300 uppercase tracking-wider">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                            LIVE SYNC ACTIVE
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 bg-white overflow-y-auto rounded-tl-3xl p-2 relative">
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-10" />

                        <div className="space-y-2 p-2 pt-4">
                            {entries.length === 0 ? (
                                <div className="text-center text-slate-400 py-10">Waiting for players...</div>
                            ) : (
                                entries.slice(0, 10).map((entry, idx) => {
                                    const isMe = currentUserName && entry.name === currentUserName;
                                    return (
                                        <div key={idx} className={`flex items-center p-3 rounded-xl shadow-sm transition-all ${isMe
                                                ? 'bg-indigo-50 border-2 border-indigo-400 shadow-indigo-100 shadow-md'
                                                : 'bg-white border border-slate-100 hover:shadow-md'
                                            }`}>
                                            <div className={`
                                                w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm mr-3
                                                ${idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                    idx === 1 ? 'bg-slate-200 text-slate-600' :
                                                        idx === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-50 text-slate-400'}
                                            `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate flex items-center gap-1.5 ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                    {entry.name}
                                                    {isMe && <span className="text-[10px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">YOU</span>}
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                <div className={`text-sm font-bold ${isMe ? 'text-indigo-600' : 'text-[#0F766E]'}`}>{entry.score * 10} pts</div>
                                                <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-mono font-bold">
                                                    {fmtTime(entry.timeSpent)}
                                                </div>
                                                {isMe && onViewMyAttempt && (
                                                    <button
                                                        onClick={onViewMyAttempt}
                                                        className="ml-1 text-[10px] font-bold bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                                                    >
                                                        View My Attempt
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );

    // Render based on view mode
    if (viewMode === 'teacher' && isTeacherMode) {
        return renderTeacherView();
    }
    return renderStudentView();
};

export default LeaderboardDashboard;
