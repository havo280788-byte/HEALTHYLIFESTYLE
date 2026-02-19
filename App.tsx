import React, { useState, useEffect } from 'react';
import { User, Question, AppState, LeaderboardEntry, GameSettings, QuestionType } from './types';
import { GEMINI_MODELS, FALLBACK_QUESTIONS, GAME_STAGES, THEME_COLORS } from './constants';
import { generateQuestions } from './services/geminiService';
import Button from './components/Button';
import Input from './components/Input';
import GameMap from './components/GameMap';
import {
  Trophy,
  User as UserIcon,
  BookOpen,
  Settings,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  LogOut,
  Sparkles,
  Leaf,
  Heart,
  Activity,
  Award
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User>({ name: '', className: '' });
  const [settings, setSettings] = useState<GameSettings>({ apiKey: '', model: GEMINI_MODELS[0].id });

  // Game Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStage, setCurrentStage] = useState(0); // 0 to 9
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // "Correct!" or "Incorrect"

  // --- Effects ---

  // Initialize Leaderboard & Settings
  useEffect(() => {
    const savedLb = localStorage.getItem('leaderboardHEALTHYQUEST');
    if (savedLb) setLeaderboard(JSON.parse(savedLb));

    const savedSettings = localStorage.getItem('healthylife_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Timer (Updates display only - logic uses Date.now())
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === AppState.PLAYING) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [appState, startTime]);

  // --- Actions ---

  const saveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem('healthylife_settings', JSON.stringify(newSettings));
  };

  const startGame = async () => {
    if (!user.name || !user.className) {
      alert("Please enter both Name and Class!");
      return;
    }

    setAppState(AppState.LOADING);
    setLoadingText('Preparing your journey...');

    // Fetch or use fallback questions
    let gameQuestions = FALLBACK_QUESTIONS;
    if (settings.apiKey) {
      setLoadingText('Consulting the Health Guru...');
      try {
        const aiQuestions = await generateQuestions(settings.apiKey, settings.model);
        if (aiQuestions.length >= 10) {
          gameQuestions = aiQuestions.slice(0, 10);
        } else {
          console.warn("AI returned too few questions, using fallback.");
        }
      } catch (e) {
        console.error("Failed to fetch AI questions", e);
      }
    }

    // Ensure we have 10 questions and shuffle if using fallback
    if (!settings.apiKey) {
      gameQuestions = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    }

    // Double check we have enough (duplicate if needed for safety, though fallback has 10)
    while (gameQuestions.length < 10) {
      gameQuestions.push(gameQuestions[0]);
    }

    setQuestions(gameQuestions);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setCurrentStage(0);
    setSelectedAnswer(null);
    setIsAnswerConfirmed(false);
    setFeedbackMessage(null);

    setAppState(AppState.PLAYING);
  };

  const handleAnswerSelect = (optionId: string) => {
    if (isAnswerConfirmed) return;
    setSelectedAnswer(optionId);
  };

  const confirmAnswer = () => {
    if (!selectedAnswer) return;

    setIsAnswerConfirmed(true);
    const currentQ = questions[currentStage];
    const isCorrect = selectedAnswer === currentQ.correctAnswerId;

    if (isCorrect) {
      setFeedbackMessage("CORRECT!");
    } else {
      setFeedbackMessage("INCORRECT");
    }
  };

  const nextStage = () => {
    if (currentStage < 9) {
      setCurrentStage(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerConfirmed(false);
      setFeedbackMessage(null);
    } else {
      completeGame();
    }
  };

  const completeGame = () => {
    const finalTime = Math.round((Date.now() - startTime) / 1000);

    // Save to Leaderboard
    const newEntry: LeaderboardEntry = {
      name: user.name,
      className: user.className,
      score: 10, // Assuming completion is the goal, or we could track actual correct answers
      timeSpent: finalTime,
      timestamp: Date.now()
    };

    // logic: Add, Sort by Time Ascending, Slice 999
    const updatedLb = [...leaderboard, newEntry]
      .sort((a, b) => a.timeSpent - b.timeSpent)
      .slice(0, 999);

    setLeaderboard(updatedLb);
    localStorage.setItem('leaderboardHEALTHYQUEST', JSON.stringify(updatedLb));
    setAppState(AppState.RESULT);
  };

  // --- Renderers ---

  const renderLogin = () => (
    <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur shadow-2xl rounded-3xl p-8 border-4 border-[#14B8A6] animate-fade-in relative overflow-hidden">
      {/* Decorative Icons */}
      <Leaf className="absolute -top-4 -right-4 text-[#5EEAD4]/30 w-24 h-24 rotate-12" />
      <Heart className="absolute bottom-4 -left-4 text-[#5EEAD4]/30 w-16 h-16 -rotate-12" />

      <div className="text-center mb-8 relative z-10">
        <div className="w-20 h-20 rounded-full bg-[#0F766E] flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
          <Activity size={40} />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0F766E] mb-2 uppercase tracking-wide">English 11<br />Healthy Lifestyle</h1>
        <p className="text-[#14B8A6] font-medium">Ready to test your knowledge?</p>
      </div>

      <div className="space-y-5 relative z-10">
        <Input
          label="FULL NAME"
          placeholder="Enter your name"
          value={user.name}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
          icon={<UserIcon size={18} />}
        />
        <Input
          label="CLASS"
          placeholder="e.g. 11A1"
          value={user.className}
          onChange={(e) => setUser({ ...user, className: e.target.value })}
          icon={<BookOpen size={18} />}
        />

        <Button
          fullWidth
          onClick={startGame}
          disabled={!user.name || !user.className}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          START CHALLENGE <Play size={20} className="ml-2" />
        </Button>
      </div>

      {/* Settings Toggle */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-slate-400 hover:text-[#0F766E] flex items-center justify-center gap-1 mx-auto"
        >
          <Settings size={14} /> Settings
        </button>
        {showSettings && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3 text-left border border-slate-200">
            <Input
              label="API Key (Optional)"
              type="password"
              value={settings.apiKey}
              onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderPlaying = () => {
    const currentQ = questions[currentStage];
    if (!currentQ) return null;

    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center">
        {/* Header / Stats */}
        <div className="w-full flex justify-between items-center bg-white/90 backdrop-blur p-4 rounded-xl shadow-md mb-6 border-l-4 border-[#0F766E]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase">Player</span>
            <span className="font-bold text-[#0F766E]">{user.name}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-400 uppercase">Time</span>
            <span className="font-mono font-bold text-2xl text-[#0F766E]">
              {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
              {(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* 2D Map */}
        <GameMap currentStage={currentStage} />

        {/* Question Area */}
        <div className="w-full max-w-2xl mt-4 relative">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#14B8A6]/30">
            <div className="bg-[#0F766E] text-white p-4 text-center">
              <h3 className="text-sm font-bold opacity-80 mb-1">STAGE {currentStage + 1}: {GAME_STAGES[currentStage]}</h3>
              <h2 className="text-xl md:text-2xl font-bold leading-tight px-4">{currentQ.content}</h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.options.map(opt => {
                let btnClass = "border-2 border-slate-100 hover:border-[#5EEAD4] hover:bg-slate-50";

                if (isAnswerConfirmed) {
                  if (opt.id === currentQ.correctAnswerId) btnClass = "bg-green-100 border-green-500 text-green-800";
                  else if (opt.id === selectedAnswer) btnClass = "bg-red-100 border-red-500 text-red-800";
                  else btnClass = "opacity-50 grayscale";
                } else if (selectedAnswer === opt.id) {
                  btnClass = "border-[#14B8A6] bg-[#14B8A6]/10 ring-2 ring-[#5EEAD4]";
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswerSelect(opt.id)}
                    disabled={isAnswerConfirmed}
                    className={`p-4 rounded-xl text-left font-medium transition-all ${btnClass} flex justify-between items-center`}
                  >
                    <span>{opt.text}</span>
                    {isAnswerConfirmed && opt.id === currentQ.correctAnswerId && <CheckCircle2 size={20} className="text-green-600" />}
                    {isAnswerConfirmed && opt.id === selectedAnswer && opt.id !== currentQ.correctAnswerId && <XCircle size={20} className="text-red-600" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback / Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
              {!isAnswerConfirmed ? (
                <Button
                  onClick={confirmAnswer}
                  disabled={!selectedAnswer}
                  className="bg-[#0F766E] hover:bg-[#115e59] text-white px-8 py-3 text-lg shadow-lg"
                >
                  Confirm Answer
                </Button>
              ) : (
                <div className="w-full text-center">
                  <div className={`text-xl font-black mb-3 ${feedbackMessage === 'CORRECT!' ? 'text-green-600' : 'text-red-500'}`}>
                    {feedbackMessage}
                  </div>
                  <Button
                    onClick={nextStage}
                    className="bg-[#14B8A6] hover:bg-[#0d9488] text-white w-full max-w-xs mx-auto shadow-md"
                  >
                    CONTINUE <Play size={16} className="ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    // Calculate minutes used
    const finalMinutes = (leaderboard[leaderboard.length - 1]?.timeSpent / 60).toFixed(2); // Approximate from latest entry

    return (
      <div className="max-w-lg w-full mx-auto bg-white p-8 rounded-3xl shadow-2xl text-center animate-fade-in relative overflow-hidden">
        {/* Fireworks decoration (CSS simplified) */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10 bg-[url('https://media.giphy.com/media/26tOZ42MgWX5LmOht/giphy.gif')] bg-cover" />

        <div className="w-24 h-24 bg-yellow-100/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-yellow-200">
          <Award className="w-12 h-12 text-yellow-600" />
        </div>

        <h2 className="text-3xl font-black text-[#0F766E] mb-2">🎉 Challenge Complete!</h2>
        <p className="text-[#14B8A6] font-medium mb-6">You did a fantastic job!</p>

        <div className="bg-[#f0fdfa] rounded-xl p-6 mb-8 border border-[#ccfbf1]">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">COMPLETION TIME</div>
          <div className="text-4xl font-black text-[#0F766E]">
            {Math.floor(leaderboard[leaderboard.length - 1]?.timeSpent / 60)}m {leaderboard[leaderboard.length - 1]?.timeSpent % 60}s
          </div>
          <div className="mt-2 text-sm font-bold text-yellow-600 flex items-center justify-center gap-1">
            <Trophy size={14} /> BRAVE TROPHY
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => setAppState(AppState.LEADERBOARD)}>
            LEADERBOARD
          </Button>
          <Button onClick={() => setAppState(AppState.LOGIN)} className="bg-[#0F766E] text-white hover:bg-[#0d9488]">
            PLAY AGAIN
          </Button>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="max-w-xl w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in flex flex-col h-[85vh]">
      <div className="p-6 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-lg z-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setAppState(AppState.RESULT)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <RotateCcw size={20} />
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wider">
            <Trophy className="text-yellow-300" /> Top 10 Fastest
          </h2>
          <div className="w-9" />
        </div>
        <p className="text-center text-[#5EEAD4] text-xs font-medium">
          {leaderboard.length >= 999 ? 'FULL LEADERBOARD (999 people)' : `${leaderboard.length} brave challengers`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {leaderboard.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            No champions yet. Be the first!
          </div>
        ) : (
          leaderboard.slice(0, 10).map((entry, idx) => (
            <div key={idx} className="flex items-center bg-white p-4 rounded-xl border-b-4 border-slate-100 shadow-sm transform hover:scale-[1.01] transition-all">
              <div className={`
                 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg mr-4 border-2
                 ${idx === 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                  idx === 1 ? 'bg-slate-100 text-slate-600 border-slate-300' :
                    idx === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-400 border-transparent'}
               `}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold text-[#0F766E] text-lg">{entry.name}</div>
                <div className="text-xs text-slate-500 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded-md">Class {entry.className}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-[#0F766E] text-lg">
                  {Math.floor(entry.timeSpent / 60)}' {entry.timeSpent % 60}s
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <Button fullWidth onClick={() => setAppState(AppState.LOGIN)} className="bg-slate-800 text-white hover:bg-slate-900">
          <LogOut size={16} className="mr-2" /> EXIT GAME
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F766E] to-[#14B8A6] flex items-center justify-center p-4 font-sans text-slate-800">
      {appState === AppState.LOADING && (
        <div className="text-center text-white animate-pulse">
          <div className="w-16 h-16 border-4 border-[#5EEAD4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold">{loadingText}</h2>
        </div>
      )}
      {appState === AppState.LOGIN && renderLogin()}
      {appState === AppState.PLAYING && renderPlaying()}
      {appState === AppState.RESULT && renderResult()}
      {appState === AppState.LEADERBOARD && renderLeaderboard()}
    </div>
  );
};

export default App;
