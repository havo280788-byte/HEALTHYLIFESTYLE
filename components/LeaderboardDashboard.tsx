import React, { useMemo } from 'react';
import { LeaderboardEntry } from '../types';
import { BarChart, DonutChart } from './DashboardCharts';
import { Trophy, RefreshCw, X, Circle, Clock } from 'lucide-react';
import Button from './Button';

interface LeaderboardDashboardProps {
    entries: LeaderboardEntry[];
    onReset: () => void;
    onExit: () => void;
    isSyncing?: boolean;
}

const LeaderboardDashboard: React.FC<LeaderboardDashboardProps> = ({ entries, onReset, onExit, isSyncing = false }) => {

    // --- Analytics ---
    const stats = useMemo(() => {
        if (entries.length === 0) return null;

        const totalPlayers = entries.length;
        const fastestTime = Math.min(...entries.map(e => e.timeSpent));

        // Correct Answer Rate per Question (Q1-Q8... wait, we have 10, design says Q1-Q8)
        // We will show Q1-Q8 to match design, or Q1-Q10 if we want to be accurate.
        // Let's loop 1-8 for design fidelity initially, or map actual question IDs.
        // Our Q IDs are 'mc1'...'mc5' and 'tf1'...'tf5'. 
        // Let's just map index 0-7 (Q1-Q8).

        const questionRates = Array.from({ length: 10 }).map((_, idx) => {
            // Find how many got this Q index correct
            // We need to know which Q ID maps to which index in our game.
            // Assuming 'mc1' is index 0...
            // Since we don't have the question configuration here, we rely on the `answers` map in entry.
            // But `answers` keys are IDs. 
            // Let's assume standard IDs: mc1...mc5, tf1...tf5.
            // Q1=mc1, Q2=mc2... Q5=mc5, Q6=tf1...

            const qId = idx < 5 ? `mc${idx + 1}` : `tf${idx - 4}`; // Q6 is tf1
            const correctCount = entries.filter(e => e.answers?.[qId]).length;
            const rate = (correctCount / totalPlayers) * 100;
            return { label: `Q${idx + 1}`, value: rate };
        });

        // Skills Breakdown
        // Fact Retrieval (Q1-Q3), Reading Comp (Q4-Q5), Critical Thinking (Q6-Q10)
        // Q1-Q3: mc1, mc2, mc3
        // Q4-Q5: mc4, mc5
        // Q6-Q8+: tf1...

        const getRate = (ids: string[]) => {
            let totalCorrect = 0;
            let totalPossible = 0;
            entries.forEach(e => {
                ids.forEach(id => {
                    if (e.answers?.[id]) totalCorrect++;
                    totalPossible++;
                });
            });
            return totalPossible === 0 ? 0 : totalCorrect; // Just raw count for donut proportion?
            // Donut usually shows distribution. 
            // If strict design: "Skills Breakdown" likely means "Where points came from" or "Performance relative".
            // Let's just use total correct answers in that category.
        };

        const skillsData = [
            { label: 'Critical Thinking', value: getRate(['tf1', 'tf2', 'tf3', 'tf4', 'tf5']), color: '#f472b6' }, // Pink
            { label: 'Fact Retrieval', value: getRate(['mc1', 'mc2', 'mc3']), color: '#22c55e' }, // Green
            { label: 'Reading Comp.', value: getRate(['mc4', 'mc5']), color: '#60a5fa' }, // Blue
        ];

        return { totalPlayers, fastestTime, questionRates, skillsData };
    }, [entries]);

    return (
        <div className="flex bg-gradient-to-br from-[#a5b4fc] to-[#c084fc] min-h-screen p-4 md:p-8 font-sans">
            <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto">

                {/* LEFT PANEL: Class Performance */}
                <div className="flex-[2] p-8 bg-slate-50 overflow-y-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-[#1e1b4b]">Class Performance</h1>
                        <p className="text-slate-500">Real-time statistics from all players</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Bar Chart Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[#1e1b4b] font-bold mb-4 border-l-4 border-indigo-500 pl-3">Correct Answer Rate</h3>
                            <div className="h-40">
                                {stats ? <BarChart data={stats.questionRates} color="#6366f1" /> : <div className="h-full flex items-center justify-center text-slate-300">No Data</div>}
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
                                {stats?.questionRates.map(d => <span key={d.label}>{d.label}</span>)}
                            </div>
                        </div>

                        {/* Donut Chart Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[#1e1b4b] font-bold mb-4 border-l-4 border-purple-500 pl-3">Skills Breakdown</h3>
                            <div className="h-40 flex items-center justify-center gap-6">
                                {stats ? (
                                    <>
                                        <div className="w-32 h-32">
                                            <DonutChart data={stats.skillsData} />
                                        </div>
                                        <div className="space-y-2">
                                            {stats.skillsData.map((d, i) => (
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
                        <div className="bg-indigo-50 p-5 rounded-2xl">
                            <div className="text-xs font-bold text-indigo-400 uppercase mb-1">TOTAL PLAYERS</div>
                            <div className="text-4xl font-black text-indigo-900">{stats?.totalPlayers || 0}</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-2xl">
                            <div className="text-xs font-bold text-green-500 uppercase mb-1">FASTEST TIME</div>
                            <div className="text-4xl font-black text-green-900">{stats ? `${stats.fastestTime}s` : '--'}</div>
                        </div>
                        <div className="bg-orange-50 p-5 rounded-2xl">
                            <div className="text-xs font-bold text-orange-400 uppercase mb-1">COMPLETION RATE</div>
                            <div className="text-4xl font-black text-orange-900">100%</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Leaderboard List */}
                <div className="flex-1 bg-indigo-600 flex flex-col text-white relative">
                    {/* Header */}
                    <div className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-wide">LEADERBOARD</h2>
                                <p className="text-indigo-200 text-sm font-bold">TOP 10 PLAYERS</p>
                            </div>
                            <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                            <button
                                onClick={onReset}
                                className="bg-indigo-500 hover:bg-indigo-400 text-xs font-bold py-1.5 px-3 rounded-lg border border-indigo-400/50 shadow-sm transition-colors"
                            >
                                Reset Data
                            </button>
                        </div>

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
                                entries.slice(0, 10).map((entry, idx) => (
                                    <div key={idx} className="flex items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm mr-3
                            ${idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                idx === 1 ? 'bg-slate-200 text-slate-600' :
                                                    idx === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-50 text-slate-400'}
                         `}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{entry.name}</div>
                                            {/* <div className="text-[10px] text-slate-400">Class {entry.className}</div> */}
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <div className="text-sm font-bold text-[#0F766E]">{entry.score * 8} pts</div> {/* Score logic: 10 * 8? User said max 80 */}
                                            <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-mono font-bold">
                                                {entry.timeSpent}s
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeaderboardDashboard;
