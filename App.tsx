import React, { useState, useEffect } from 'react';
import { User, Question, AppState, LeaderboardEntry, GameSettings, QuestionType } from './types';
import { GEMINI_MODELS, FALLBACK_QUESTIONS, GAME_STAGES, THEME_COLORS, READING_PASSAGE, SOUND_EFFECTS } from './constants';
import { generateQuestions } from './services/geminiService';
import Button from './components/Button';
import Input from './components/Input';
import ProgressNavigation from './components/ProgressNavigation';
import ReadingPassage from './components/ReadingPassage';
import LeaderboardDashboard from './components/LeaderboardDashboard';
import FeedbackOverlay from './components/FeedbackOverlay';
import { addLeaderboardEntry, subscribeToLeaderboard, resetLeaderboard } from './services/firebase';
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
  Award,
  Clock
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User>({ name: '', className: '' });
  const [settings, setSettings] = useState<GameSettings>({ apiKey: '', model: GEMINI_MODELS[0].id });

  // Game Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStage, setCurrentStage] = useState(0); // 0 to 9
  const [timeLeft, setTimeLeft] = useState<number>(480); // 8 minutes = 480 seconds
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // "Correct!" or "Incorrect"

  // --- Effects ---

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

  // Timer: Countdown from 480
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === AppState.PLAYING) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            completeGame(true); // Timeout finish
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // --- Actions ---

  const saveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem('healthylife_settings', JSON.stringify(newSettings));
  };

  const playSound = (type: 'correct' | 'incorrect' | 'click') => {
    const audio = new Audio(SOUND_EFFECTS[type]);
    audio.play().catch(e => console.error("Error playing sound:", e));
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

    // Ensure we have 10 questions and use FIXED order for fallback
    if (!settings.apiKey) {
      gameQuestions = [...FALLBACK_QUESTIONS].slice(0, 10);
    }

    // Double check we have enough
    while (gameQuestions.length < 10) {
      gameQuestions.push(gameQuestions[0]);
    }

    // Clear persistent highlights from previous session
    localStorage.removeItem('healthylife_reading_highlights');

    setQuestions(gameQuestions);
    setTimeLeft(480); // Reset to 8 minutes
    setCurrentStage(0);
    setSelectedAnswer(null);
    setIsAnswerConfirmed(false);
    setFeedbackMessage(null);
    setUserAnswers({});

    setAppState(AppState.PLAYING);
  };

  const handleAnswerSelect = (optionId: string) => {
    if (isAnswerConfirmed) return;
    setSelectedAnswer(optionId);
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;

    setIsAnswerConfirmed(true);
    const currentQ = questions[currentStage];
    const isCorrect = selectedAnswer === currentQ.correctAnswerId;

    // Record answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: isCorrect
    }));

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
      completeGame(false);
    }
  };

  const completeGame = (isTimeout = false) => {
    // Score based on correct answers (1 point each, displayed as *10 later)
    const finalScore = Object.values(userAnswers).filter(Boolean).length;
    const timeSpent = 480 - timeLeft;

    // Save to Leaderboard
    const newEntry: LeaderboardEntry = {
      name: user.name,
      className: user.className,
      score: finalScore,
      timeSpent: timeSpent,
      timestamp: Date.now(),
      answers: userAnswers
    };

    // Save to Firebase
    addLeaderboardEntry(newEntry);

    // We rely on the subscription to update the local leaderboard state
    setAppState(AppState.RESULT);
  };

  // --- Renderers ---

  const renderLogin = () => (
    <div className="flex bg-gradient-to-br from-[#0F766E] to-[#14B8A6] min-h-screen items-center justify-center p-4">
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
    </div>
  );

  const renderPlaying = () => {
    const currentQ = questions[currentStage];
    if (!currentQ) return null;

    // Formatting Reading Passage (Simple markdown-like replacement for basic bolding/titles)
    // In a real app we might use a markdown renderer, but here we keep it zero-dep-consistent
    const formattedReading = READING_PASSAGE.split('\n').map((line, idx) => {
      if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold text-[#0F766E] mt-6 mb-3 border-b border-green-200 pb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('**')) {
        const content = line.replace(/\*\*/g, '');
        return <h3 key={idx} className="text-lg font-bold text-[#0d9488] mt-4 mb-2">{content}</h3>;
      }
      if (line.trim() === '') return <div key={idx} className="h-4" />;
      return <p key={idx} className="mb-2 text-slate-700 leading-relaxed text-lg">{line}</p>;
    });

    // Format Timer mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isUrgent = timeLeft < 60; // Red color if under 1 minute

    return (
      <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
        {/* === HEADER SECTION === */}
        <div className="bg-white border-b border-slate-100 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: Titles */}
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold text-[#0F766E] flex items-center gap-2">
                <span>🥗</span> English 11 – Healthy Lifestyle
              </h1>
              <h2 className="text-xs md:text-sm font-semibold text-slate-500 pl-7 flex items-center gap-2">
                <span>🧠</span> Reading Challenge
              </h2>
            </div>

            {/* Right: Countdown Timer */}
            <div className={`
                 flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 font-mono font-bold text-lg md:text-2xl shadow-inner
                 ${isUrgent ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-green-50 text-[#0F766E] border-green-100'}
              `}>
              <Clock size={20} className="md:w-6 md:h-6" />
              {timerString}
            </div>
          </div>

          {/* Progress Navigation inside Header now? Or just below? User said "Header ... Icon Bar" */}
          <ProgressNavigation currentStage={currentStage} />
        </div>

        {/* Feedback Overlay */}
        {isAnswerConfirmed && (
          <FeedbackOverlay
            isCorrect={feedbackMessage === 'CORRECT!'}
            correctAnswer={currentQ.options.find(opt => opt.id === currentQ.correctAnswerId)?.text || ''}
            onNext={nextStage}
          />
        )}

        {/* 2. Main Split Content */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div className="bg-[#F0FDF4] rounded-2xl shadow-inner border border-green-100 p-6 overflow-hidden relative">
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question Card */}
          <div className="flex flex-col overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex-shrink-0">
              {/* Card Header with Timer */}
              <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex justify-between items-center">
                <span className="font-bold text-[#0F766E] uppercase tracking-wider text-sm">
                  Question {currentStage + 1} / 10
                </span>
                {/* Timer moved to top header, so we can remove it from here or keep small one? Removed for cleaner UI as per req */}
              </div>

              <div className="p-4 md:p-8">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6 leading-snug">
                  {currentQ.content}
                </h2>

                <div className="space-y-3">
                  {currentQ.options.map(opt => {
                    let btnClass = "border-2 border-slate-100 hover:border-[#5EEAD4] hover:bg-slate-50";

                    if (isAnswerConfirmed) {
                      if (opt.id === currentQ.correctAnswerId) btnClass = "bg-green-100 border-green-500 text-green-800 shadow-sm";
                      else if (opt.id === selectedAnswer) btnClass = "bg-red-100 border-red-500 text-red-800 shadow-sm";
                      else btnClass = "opacity-40 grayscale";
                    } else if (selectedAnswer === opt.id) {
                      btnClass = "border-[#14B8A6] bg-[#14B8A6]/10 ring-2 ring-[#5EEAD4] shadow-md";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerSelect(opt.id)}
                        disabled={isAnswerConfirmed}
                        className={`w-full p-3 md:p-4 rounded-xl text-left font-medium transition-all duration-200 ${btnClass} flex justify-between items-center group`}
                      >
                        <span className="text-base md:text-lg">{opt.text}</span>
                        {isAnswerConfirmed && opt.id === currentQ.correctAnswerId && <CheckCircle2 size={24} className="text-green-600" />}
                        {isAnswerConfirmed && opt.id === selectedAnswer && opt.id !== currentQ.correctAnswerId && <XCircle size={24} className="text-red-600" />}
                        {!isAnswerConfirmed && selectedAnswer === opt.id && <div className="w-4 h-4 rounded-full bg-[#14B8A6]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions - CHECK YOUR ANSWER BUTTON RESTORED */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                {!isAnswerConfirmed && (
                  <Button
                    onClick={checkAnswer}
                    disabled={!selectedAnswer}
                    fullWidth
                    className="bg-[#0F766E] hover:bg-[#115e59] text-white py-3 md:py-4 text-base md:text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    CHECK YOUR ANSWER
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => (
    <div className="flex bg-gradient-to-br from-[#0F766E] to-[#14B8A6] min-h-screen items-center justify-center p-4">
      <div className="max-w-lg w-full mx-auto bg-white p-8 rounded-3xl shadow-2xl text-center animate-fade-in relative overflow-hidden">
        {/* Fireworks decoration */}
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
          <Button variant="outline" onClick={() => {
            playSound('click');
            setAppState(AppState.LEADERBOARD);
          }}>
            LEADERBOARD
          </Button>
          <Button onClick={() => setAppState(AppState.LOGIN)} className="bg-[#0F766E] text-white hover:bg-[#0d9488]">
            PLAY AGAIN
          </Button>
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
    />
  );

  return (
    <div>
      {appState === AppState.LOADING && (
        <div className="min-h-screen bg-[#0F766E] flex items-center justify-center text-center text-white animate-pulse">
          <div>
            <div className="w-16 h-16 border-4 border-[#5EEAD4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold">{loadingText}</h2>
          </div>
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
