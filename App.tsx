import React, { useState, useEffect } from 'react';
import { User, AppState, LeaderboardEntry, GameSettings } from './types';
import { GEMINI_MODELS, THEME_COLORS } from './constants';
import Button from './components/Button';
import Input from './components/Input';
import LeaderboardDashboard from './components/LeaderboardDashboard';
import DragDropGame from './components/DragDropGame';
import { addLeaderboardEntry, subscribeToLeaderboard, resetLeaderboard } from './services/firebase';
import {
  Trophy,
  User as UserIcon,
  Play,
  LogOut,
  Maximize2,
  Minimize2,
  Trash2,
  Clock
} from 'lucide-react';

const TEACHER_PIN = '1234';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User>({ name: '', className: '' });
  const [settings, setSettings] = useState<GameSettings>({ apiKey: '', model: GEMINI_MODELS[0].id });

  // Game Data
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isTeacherMode, setIsTeacherMode] = useState(false);

  // --- Effects ---

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Initialize Leaderboard & Settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('healthylife_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    // Subscribe to Firebase
    setIsSyncing(true);
    const unsubscribe = subscribeToLeaderboard((entries) => {
      setLeaderboard(entries);
      localStorage.setItem('leaderboardHEALTHYQUEST', JSON.stringify(entries));
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, []);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === AppState.PLAYING) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            completeGame(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // --- Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.className.trim()) {
      setAppState(AppState.PLAYING);
      setTimeLeft(180);
      setFinalScore(0);
    }
  };

  const completeGame = async (score: number) => {
    setFinalScore(score);
    setAppState(AppState.RESULT);

    const entry: LeaderboardEntry = {
      name: user.name,
      className: user.className,
      score: score,
      timeSpent: 180 - timeLeft,
      timestamp: Date.now(),
      // Adding empty answers for compatibility with LeaderboardDashboard if needed
      answers: {}
    };

    try {
      await addLeaderboardEntry(entry);
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const logout = () => {
    setAppState(AppState.LOGIN);
    setUser({ name: '', className: '' });
    setIsTeacherMode(false);
  };

  const handleTeacherAccess = () => {
    if (pinInput === TEACHER_PIN) {
      setIsTeacherMode(true);
      setShowPinDialog(false);
      setAppState(AppState.LEADERBOARD);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // --- Rendering ---

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 font-['Poppins'] bg-[#0f172a]" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-6 right-6 flex gap-3">
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-white/5 bg-white/5 text-white/70"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
        <button
          onClick={() => setShowPinDialog(true)}
          className="p-3 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-white/5 bg-white/5 text-white/70"
          title="Teacher Mode"
        >
          <Trophy size={20} />
        </button>
      </div>

      <div className="w-full max-w-md space-y-8 p-10 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />

        <div className="text-center space-y-3 relative">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20 mb-2">
            <Trophy className="text-white w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">
            Healthy Life <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Quest</span>
          </h1>
          <p className="text-slate-400 font-medium">Drag, match, and learn the healthy way!</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="space-y-4">
            <Input
              label="Full Name"
              icon={<UserIcon size={18} />}
              placeholder="e.g. Ms Vo Thi Thu Ha"
              value={user.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUser({ ...user, name: e.target.value })}
              required
            />
            <Input
              label="Class Name"
              icon={<Trophy size={18} />}
              placeholder="e.g. 6A1"
              value={user.className}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUser({ ...user, className: e.target.value })}
              required
            />
          </div>

          <Button
            type="submit"
            icon={<Play size={20} fill="currentColor" />}
            className="w-full py-5 text-lg font-black tracking-widest uppercase shadow-xl shadow-emerald-500/25 active:scale-95 transition-transform"
          >
            Start Adventure
          </Button>
        </form>
      </div>

      {showPinDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-8 rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Teacher Access</h3>
              <p className="text-sm text-slate-400">Enter pin to view leaderboard</p>
            </div>
            <input
              autoFocus
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className={`w-full text-center text-3xl tracking-[1em] py-4 rounded-2xl bg-white/5 border ${pinError ? 'border-red-500 text-red-400' : 'border-white/10 text-white'} focus:outline-none transition-all`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinDialog(false); setPinInput(''); setPinError(false); }}
                className="flex-1 py-4 rounded-2xl font-bold bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTeacherAccess}
                className="flex-1 py-4 rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPlaying = () => (
    <div className="min-h-screen flex flex-col font-['Poppins'] text-white" style={{ background: 'var(--bg-primary)' }}>
      {/* HUD */}
      <div className="sticky top-0 z-[60] bg-[#020617]/80 backdrop-blur-lg border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest leading-none mb-1">Explorer</span>
            <span className="text-sm font-black text-white truncate max-w-[120px]">{user.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!isTeacherMode && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
              <Clock className="text-emerald-400" size={18} />
              <span className={`text-xl font-mono font-black ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <DragDropGame
          onComplete={(score) => completeGame(score)}
          onCorrect={() => { }}
          onIncorrect={() => { }}
        />
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="min-h-screen flex items-center justify-center p-6 font-['Poppins'] bg-[#0f172a]" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-xl space-y-8 p-12 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-blue-500/5 -z-10" />

        <div className="space-y-4">
          <div className="inline-flex p-6 rounded-full bg-emerald-500/10 mb-4 animate-bounce">
            <Trophy className="text-emerald-400 w-16 h-16" strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white">Quest Complete!</h2>
          <p className="text-emerald-400/60 font-bold uppercase tracking-[0.2em] text-sm">You did an amazing job, {user.name}!</p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-8">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
            <p className="text-4xl font-black text-white">{finalScore * 10}</p>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Time Remaining</p>
            <p className="text-4xl font-black text-white font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Button
            onClick={() => setAppState(AppState.LEADERBOARD)}
            className="w-full py-5 text-lg font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
          >
            See Leaderboard
          </Button>
          <button
            onClick={logout}
            className="w-full py-4 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <LeaderboardDashboard
      entries={leaderboard}
      onReset={resetLeaderboard}
      onExit={() => setAppState(AppState.LOGIN)}
      isSyncing={isSyncing}
      isTeacherMode={isTeacherMode}
      currentUserName={user.name}
    />
  );

  return (
    <div>
      {appState === AppState.LOGIN && renderLogin()}
      {appState === AppState.PLAYING && renderPlaying()}
      {appState === AppState.RESULT && renderResult()}
      {appState === AppState.LEADERBOARD && renderLeaderboard()}
    </div>
  );
};

export default App;
