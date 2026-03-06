import React, { useMemo, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, X, Clock, Users, Zap } from 'lucide-react';

interface LeaderboardDashboardProps {
    entries: LeaderboardEntry[];
    onReset: () => void;
    onExit: () => void;
    isSyncing?: boolean;
    isTeacherMode?: boolean;
    currentUserName?: string;
    onViewMyAttempt?: () => void;
}

const LeaderboardDashboard: React.FC<LeaderboardDashboardProps> = ({
    entries,
    onReset,
    onExit,
    isSyncing = false,
    isTeacherMode = false,
    currentUserName = '',
    onViewMyAttempt
}) => {
    const [viewMode, setViewMode] = useState<'student' | 'teacher'>(isTeacherMode ? 'teacher' : 'student');

    // Simplified analytics for the drag-and-drop game
    const stats = useMemo(() => {
        if (entries.length === 0) return null;

        const total = entries.length;
        const avgScore = Math.round(entries.reduce((sum, e) => sum + (e.score * 10), 0) / total);
        const fastestTime = Math.min(...entries.map(e => e.timeSpent));

        return { total, avgScore, fastestTime };
    }, [entries]);

    const fmtTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderTeacherView = () => (
        <div className="min-h-screen font-['Poppins'] bg-[#0f172a]" style={{ background: 'var(--bg-primary)' }}>
            <div className="sticky top-0 z-50 bg-[#1e293b] border-b border-white/10 shadow-xl backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-emerald-400">📊 Teacher Dashboard</h1>
                        <p className="text-xs text-slate-400">Class performance & records</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl p-1 flex bg-white/5 border border-white/10 text-[10px] font-bold">
                            <button
                                onClick={() => setViewMode('student')}
                                className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'student' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                            >STUDENT</button>
                            <button
                                onClick={() => setViewMode('teacher')}
                                className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'teacher' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                            >TEACHER</button>
                        </div>
                        <button onClick={onExit} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {!stats ? (
                    <div className="rounded-[2rem] p-16 text-center bg-white/5 border border-white/10 text-slate-400">
                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">No records found yet</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="rounded-3xl p-6 bg-white/5 border border-white/10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Total Participants</p>
                                <p className="text-3xl font-black text-emerald-400">{stats.total}</p>
                            </div>
                            <div className="rounded-3xl p-6 bg-white/5 border border-white/10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Average Score</p>
                                <p className="text-3xl font-black text-blue-400">{stats.avgScore} pts</p>
                            </div>
                            <div className="rounded-3xl p-6 bg-white/5 border border-white/10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Fastest Record</p>
                                <p className="text-3xl font-black text-amber-400">{fmtTime(stats.fastestTime)}</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={onExit}
                                className="flex-1 py-4 rounded-2xl font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                            >
                                BACK TO START
                            </button>
                            <button
                                onClick={onReset}
                                className="px-8 py-4 rounded-2xl font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                RESET ALL DATA
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderStudentView = () => (
        <div className="min-h-screen font-['Poppins'] flex flex-col bg-[#0f172a]">
            {/* Header */}
            <div className="shrink-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <Trophy size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white">Leaderboard</h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Top Performing Explorers</p>
                        </div>
                    </div>
                    <button
                        onClick={onExit}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col gap-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-3xl p-5 bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Players</p>
                        <p className="text-2xl font-black text-white">{stats?.total || 0}</p>
                    </div>
                    <div className="rounded-3xl p-5 bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fastest</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono">{stats ? fmtTime(stats.fastestTime) : '--:--'}</p>
                    </div>
                    <div className="rounded-3xl p-5 bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Score</p>
                        <p className="text-2xl font-black text-blue-400">{stats?.avgScore || 0}</p>
                    </div>
                </div>

                {/* Ranking List */}
                <div className="flex-1 rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 flex flex-col">
                    <div className="p-4 space-y-3 overflow-y-auto">
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Users size={48} className="mb-4 opacity-10" />
                                <p className="font-medium">Waiting for first completion...</p>
                            </div>
                        ) : (
                            entries.slice(0, 10).map((entry, idx) => {
                                const isMe = currentUserName && entry.name === currentUserName;
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${isMe ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                                                {entry.name} {isMe && <span className="ml-2 py-0.5 px-2 rounded-full bg-emerald-500 text-[10px] text-white">YOU</span>}
                                            </p>
                                            <p className="text-xs text-slate-500">{entry.className}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-white">{entry.score * 10} pts</p>
                                            <p className="text-[10px] font-mono text-slate-500">{fmtTime(entry.timeSpent)}</p>
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

    if (viewMode === 'teacher' && isTeacherMode) return renderTeacherView();
    return renderStudentView();
};

export default LeaderboardDashboard;
