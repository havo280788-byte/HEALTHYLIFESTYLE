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
        <div className="min-h-screen font-['Poppins']" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="sticky top-0 z-50" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                <div className="max-w-5xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg md:text-2xl font-black" style={{ color: 'var(--primary)' }}>📊 Teacher Dashboard</h1>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Class analytics & question insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Toggle */}
                        <div className="rounded-lg p-0.5 flex text-xs font-bold" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                            <button
                                onClick={() => setViewMode('student')}
                                className="px-3 py-1.5 rounded-md transition-all"
                                style={viewMode === 'student' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' } : { color: 'var(--text-muted)' }}
                            >STUDENT</button>
                            <button
                                onClick={() => setViewMode('teacher')}
                                className="px-3 py-1.5 rounded-md transition-all"
                                style={viewMode === 'teacher' ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' } : { color: 'var(--text-muted)' }}
                            >TEACHER</button>
                        </div>
                        <button onClick={onExit} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
                {!teacherStats ? (
                    <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                        <Users size={48} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium text-lg">No submissions yet</p>
                    </div>
                ) : (
                    <>
                        {/* CLASS SNAPSHOT */}
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <Zap size={14} /> Class Snapshot
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Teams Joined</div>
                                    <div className="text-2xl md:text-3xl font-black" style={{ color: '#818cf8' }}>{teacherStats.total}</div>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Completion</div>
                                    <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--success)' }}>100%</div>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Avg Accuracy</div>
                                    <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--primary)' }}>{teacherStats.avgAccuracy}%</div>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Fastest (≥80%)</div>
                                    <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--warning)' }}>
                                        {teacherStats.fastestTime !== null ? fmtTime(teacherStats.fastestTime) : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* QUESTION INSIGHTS */}
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <Target size={14} /> Question Insights
                            </h2>
                            <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <div className="space-y-2.5">
                                    {teacherStats.questionInsights.map((q) => (
                                        <div key={q.label} className="flex items-center gap-3">
                                            <span className="text-xs font-bold w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>{q.label}</span>
                                            <div className="flex-1 rounded-full h-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${q.rate >= 70 ? 'bg-green-500' : q.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.max(q.rate, 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold w-12 text-right" style={{ color: 'var(--text-secondary)' }}>{q.rate}%</span>
                                            <span className="text-[10px] w-10 text-right" style={{ color: 'var(--text-muted)' }}>{q.correctCount}/{q.total}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--error)' }}>
                                        Hardest: {teacherStats.hardest.join(', ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SKILLS BREAKDOWN */}
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <BookOpen size={14} /> AI Reading Skills
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {teacherStats.skills.map((skill) => (
                                    <div key={skill.label} className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                                                <span>{skill.icon}</span> {skill.label}
                                            </span>
                                            <span className="text-lg font-black" style={{ color: skill.color }}>{skill.rate}%</span>
                                        </div>
                                        <div className="rounded-full h-3 overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(skill.rate, 2)}%`, backgroundColor: skill.color }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{skill.correct}/{skill.possible} correct</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={onExit}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
                            >
                                BACK TO START
                            </button>
                            <button
                                onClick={onReset}
                                className="py-3 px-6 rounded-xl text-white font-bold text-sm transition-colors shadow-md"
                                style={{ background: 'var(--error)' }}
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
    // STUDENT VIEW — Dark Theme
    // ===========================
    const renderStudentView = () => (
        <div
            className="min-h-screen font-['Poppins'] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
            {/* Header */}
            <div
                className="shrink-0 z-50"
                style={{
                    background: 'rgba(15,12,41,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-base md:text-xl font-black text-white flex items-center gap-2">
                            <Trophy size={18} className="text-yellow-400" /> Leaderboard
                        </h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Top 10 Players</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                        </div>
                        <button
                            onClick={onExit}
                            className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-3 md:p-6 flex flex-col md:flex-row gap-4 overflow-hidden">

                {/* LEFT: Class stats + charts */}
                <div className="md:flex-[2] flex flex-col gap-4 overflow-y-auto">
                    <div
                        className="rounded-2xl p-4 md:p-5"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'rgba(165,180,252,0.7)' }}>
                            <Users size={12} /> Class Performance
                        </h2>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Players</div>
                                <div className="text-2xl font-black text-white">{studentStats?.totalPlayers || 0}</div>
                            </div>
                            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-1">Fastest</div>
                                <div className="text-2xl font-black text-white font-mono">{studentStats ? fmtTime(studentStats.fastestTime) : '--'}</div>
                            </div>
                            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.2)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1">Done</div>
                                <div className="text-2xl font-black text-white">100%</div>
                            </div>
                        </div>

                        {/* Bar chart */}
                        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Correct Answer Rate by Question</h3>
                        <div className="h-36">
                            {studentStats
                                ? <BarChart data={studentStats.questionRates} color="#818cf8" />
                                : <div className="h-full flex items-center justify-center text-slate-600 text-sm">No Data</div>
                            }
                        </div>
                        {studentStats && (
                            <div className="flex justify-between text-[10px] text-slate-600 mt-1 px-1">
                                {studentStats.questionRates.map(d => <span key={d.label}>{d.label}</span>)}
                            </div>
                        )}
                    </div>

                    {/* Donut / skills */}
                    <div
                        className="rounded-2xl p-4 md:p-5"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Skills Breakdown</h3>
                        <div className="flex items-center gap-6">
                            {studentStats ? (
                                <>
                                    <div className="w-28 h-28 shrink-0"><DonutChart data={studentStats.skillsData} /></div>
                                    <div className="space-y-2">
                                        {studentStats.skillsData.map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                                {d.label}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : <div className="text-slate-600 text-sm">No Data</div>}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Rankings list */}
                <div
                    className="md:flex-[3] flex flex-col rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    {/* Teacher toggle (if applicable) */}
                    {isTeacherMode && (
                        <div className="p-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button
                                    onClick={() => setViewMode('student')}
                                    className="flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all"
                                    style={viewMode === 'student'
                                        ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }
                                        : { color: 'rgba(255,255,255,0.4)' }}
                                >Student</button>
                                <button
                                    onClick={() => setViewMode('teacher')}
                                    className="flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all"
                                    style={viewMode === 'teacher'
                                        ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }
                                        : { color: 'rgba(255,255,255,0.4)' }}
                                >Teacher</button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                                <Users size={36} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">Waiting for players...</p>
                            </div>
                        ) : (
                            entries.slice(0, 10).map((entry, idx) => {
                                const isMe = !!(currentUserName && entry.name === currentUserName);
                                const rankColors: Record<number, { bg: string; text: string }> = {
                                    0: { bg: 'rgba(251,191,36,0.25)', text: '#fbbf24' },
                                    1: { bg: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
                                    2: { bg: 'rgba(251,146,60,0.2)', text: '#fb923c' },
                                };
                                const rank = rankColors[idx] || { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.3)' };

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 rounded-xl transition-all"
                                        style={isMe
                                            ? { background: 'rgba(102,126,234,0.2)', border: '2px solid rgba(102,126,234,0.6)', boxShadow: '0 0 12px rgba(102,126,234,0.2)' }
                                            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                                        }
                                    >
                                        {/* Rank badge */}
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                                            style={{ background: rank.bg, color: rank.text }}
                                        >
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate flex items-center gap-1.5" style={{ color: isMe ? '#a5b4fc' : 'rgba(255,255,255,0.9)' }}>
                                                {entry.name}
                                                {isMe && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(102,126,234,0.6)', color: '#e0e7ff' }}>YOU</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-500">{entry.className}</div>
                                        </div>

                                        {/* Score + Time */}
                                        <div className="text-right flex items-center gap-2 shrink-0">
                                            <div className="text-sm font-black" style={{ color: isMe ? '#a5b4fc' : 'rgba(255,255,255,0.8)' }}>{entry.score * 10} pts</div>
                                            <div
                                                className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                                            >{fmtTime(entry.timeSpent)}</div>
                                            {isMe && onViewMyAttempt && (
                                                <button
                                                    onClick={onViewMyAttempt}
                                                    className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all whitespace-nowrap"
                                                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}
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
    );

    // Render based on view mode
    if (viewMode === 'teacher' && isTeacherMode) {
        return renderTeacherView();
    }
    return renderStudentView();
};

export default LeaderboardDashboard;
