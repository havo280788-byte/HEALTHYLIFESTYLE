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
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

const TEACHER_PIN = '1234';

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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Teacher Mode State
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [teacherSelectedAnswer, setTeacherSelectedAnswer] = useState<string | null>(null);

  // Review Mode State
  const [reviewStudent, setReviewStudent] = useState<LeaderboardEntry | null>(null);
  const [reviewQuestionIdx, setReviewQuestionIdx] = useState(0);

  // Track selected answer IDs (questionId -> optionId)
  const [selectedAnswerMap, setSelectedAnswerMap] = useState<Record<string, string>>({});

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

  const loadQuestions = () => {
    let gameQuestions = [...FALLBACK_QUESTIONS].slice(0, 10);
    while (gameQuestions.length < 10) {
      gameQuestions.push(gameQuestions[0]);
    }
    return gameQuestions;
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

  const startTeacherMode = () => {
    if (pinInput !== TEACHER_PIN) {
      setPinError(true);
      return;
    }
    setPinError(false);
    setShowPinDialog(false);
    setPinInput('');
    setIsTeacherMode(true);
    setQuestions(loadQuestions());
    setCurrentStage(0);
    setTeacherSelectedAnswer(null);
    setAppState(AppState.TEACHER_PLAYING);
  };

  const exitTeacherMode = () => {
    setIsTeacherMode(false);
    setTeacherSelectedAnswer(null);
    setAppState(AppState.LOGIN);
  };

  const handleAnswerSelect = (optionId: string) => {
    if (isAnswerConfirmed) return;
    setSelectedAnswer(optionId);
  };

  const handleTeacherAnswerSelect = (optionId: string) => {
    setTeacherSelectedAnswer(optionId === teacherSelectedAnswer ? null : optionId);
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;

    setIsAnswerConfirmed(true);
    const currentQ = questions[currentStage];
    const isCorrect = selectedAnswer === currentQ.correctAnswerId;

    // Record answer correctness
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: isCorrect
    }));

    // Record which option was selected
    setSelectedAnswerMap(prev => ({
      ...prev,
      [currentQ.id]: selectedAnswer!
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

  const teacherNextStage = () => {
    if (currentStage < 9) {
      setCurrentStage(prev => prev + 1);
      setTeacherSelectedAnswer(null);
    }
  };

  const teacherPrevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(prev => prev - 1);
      setTeacherSelectedAnswer(null);
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
      answers: userAnswers,
      selectedAnswers: selectedAnswerMap
    };

    // Save to Firebase
    addLeaderboardEntry(newEntry);

    // We rely on the subscription to update the local leaderboard state
    setAppState(AppState.RESULT);
  };

  // --- Renderers ---

  const renderPinDialog = () => (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-[#0F766E]/10 flex items-center justify-center mx-auto mb-3">
            <Lock size={28} className="text-[#0F766E]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Teacher Access</h3>
          <p className="text-sm text-slate-500 mt-1">Enter PIN to continue</p>
        </div>
        <input
          type="password"
          maxLength={4}
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && startTeacherMode()}
          className={`w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border-2 rounded-xl outline-none transition-colors ${pinError ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 focus:border-[#0F766E]'}`}
          placeholder="••••"
          autoFocus
        />
        {pinError && <p className="text-red-500 text-xs text-center mt-2 font-medium">Wrong PIN. Try again.</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setShowPinDialog(false); setPinInput(''); setPinError(false); }}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={startTeacherMode}
            className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white font-semibold hover:bg-[#0d9488] transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-['Poppins']"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
    >
      {/* Ambient glow blobs */}
      <div className="fixed top-[-80px] left-[-80px] w-64 h-64 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #667eea, transparent 70%)' }} />
      <div className="fixed bottom-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #764ba2, transparent 70%)' }} />

      <div
        className="max-w-md w-full mx-auto rounded-3xl p-8 animate-fade-in relative"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 0 36px rgba(102,126,234,0.55)'
            }}
          >
            <Activity size={38} className="text-white" />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest leading-tight mb-2">
            English 11<br />
            <span style={{ background: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Healthy Lifestyle</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">🥗 Ready to test your knowledge?</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(165,180,252,0.7)' }}>Full Name</label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <UserIcon size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter your name"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* Class field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(165,180,252,0.7)' }}>Class</label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <BookOpen size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="e.g. 11A1"
                value={user.className}
                onChange={(e) => setUser({ ...user, className: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            disabled={!user.name || !user.className}
            className="w-full py-4 rounded-2xl font-black text-white text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed mt-2"
            style={{
              background: (user.name && user.className)
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: (user.name && user.className) ? '0 4px 24px rgba(102,126,234,0.5)' : 'none'
            }}
            onMouseEnter={e => { if (user.name && user.className) e.currentTarget.style.boxShadow = '0 6px 32px rgba(102,126,234,0.7)'; }}
            onMouseLeave={e => { if (user.name && user.className) e.currentTarget.style.boxShadow = '0 4px 24px rgba(102,126,234,0.5)'; }}
          >
            <Play size={20} /> START CHALLENGE
          </button>
        </div>

        {/* Teacher button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowPinDialog(true)}
            className="hidden md:flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Lock size={12} /> Teacher Mode
          </button>
        </div>

        {/* Settings */}
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-slate-600 hover:text-slate-400 flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <Settings size={13} /> Settings
          </button>
          {showSettings && (
            <div className="mt-3 p-4 rounded-xl space-y-3 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(165,180,252,0.6)' }}>API Key (Optional)</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
                className="w-full bg-transparent text-white text-sm outline-none px-3 py-2 rounded-lg"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="sk-..."
              />
            </div>
          )}
        </div>
      </div>

      {/* PIN Dialog */}
      {showPinDialog && renderPinDialog()}
    </div>
  );


  const renderPlaying = () => {
    const currentQ = questions[currentStage];
    if (!currentQ) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isUrgent = timeLeft < 60;

    return (
      <div
        className="w-full flex flex-col font-['Poppins']"
        style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          minHeight: '100dvh',
          height: '100dvh',
          overflow: 'hidden'
        }}
      >
        {/* === HEADER === */}
        <div
          className="shrink-0 z-50"
          style={{
            background: 'rgba(15,12,41,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2.5 flex items-center justify-between gap-2">
            {/* Left: Title */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm md:text-base font-bold text-white flex items-center gap-1.5 truncate">
                <span>🥗</span>
                <span className="truncate">English 11 – Healthy Lifestyle</span>
              </h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Reading Challenge</span>
            </div>

            {/* Right: Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-base md:text-xl shrink-0 ${isUrgent ? 'animate-pulse' : ''}`}
              style={{
                background: isUrgent ? 'rgba(220,38,38,0.2)' : 'rgba(102,126,234,0.15)',
                border: isUrgent ? '1.5px solid rgba(220,38,38,0.5)' : '1.5px solid rgba(102,126,234,0.4)',
                color: isUrgent ? '#f87171' : '#a5b4fc'
              }}
            >
              <Clock size={16} />
              {timerString}
            </div>
          </div>

          {/* Stage progress bar */}
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((currentStage + 1) / 10) * 100}%`,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              }}
            />
          </div>

          {/* Stage dots */}
          <div className="overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between min-w-[360px]">
              {Array.from({ length: 10 }, (_, i) => {
                const isCompleted = i < currentStage;
                const isActive = i === currentStage;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isActive ? 'scale-125' : 'scale-100'}`}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : isCompleted
                            ? 'rgba(102,126,234,0.35)'
                            : 'rgba(255,255,255,0.08)',
                        border: isActive ? '2px solid rgba(165,180,252,0.6)' : '1.5px solid rgba(255,255,255,0.1)',
                        boxShadow: isActive ? '0 0 10px rgba(102,126,234,0.5)' : 'none',
                        color: isCompleted || isActive ? '#e0e7ff' : 'rgba(255,255,255,0.3)'
                      }}
                    >
                      {isCompleted ? '✓' : i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback Overlay */}
        {isAnswerConfirmed && (
          <FeedbackOverlay
            isCorrect={feedbackMessage === 'CORRECT!'}
            correctAnswer={currentQ.options.find(opt => opt.id === currentQ.correctAnswerId)?.text || ''}
            onNext={nextStage}
            stage={currentStage + 1}
          />
        )}

        {/* === MAIN CONTENT === */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-2.5 md:p-4 flex flex-col md:flex-row gap-2.5 md:gap-4 min-h-0 overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div
            className="review-passage-dark rounded-2xl overflow-y-auto md:flex-1 shrink-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '14px 16px',
              maxHeight: '38vh',
              minHeight: '120px'
            }}
          >
            <style>{`
              .review-passage-dark p { color: rgba(255,255,255,0.82) !important; }
              .review-passage-dark h2 { color: #a5b4fc !important; border-color: rgba(165,180,252,0.2) !important; }
              .review-passage-dark h3 { color: #7dd3fc !important; }
            `}</style>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <BookOpen size={11} /> Reading Passage
            </div>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question Card — no inner scroll */}
          <div className="md:flex-1 flex flex-col min-h-0 overflow-hidden">
            <div
              className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              {/* Question header */}
              <div
                className="shrink-0 p-3 md:p-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(102,126,234,0.2)', color: '#a5b4fc' }}
                  >
                    Question {currentStage + 1} / 10
                  </span>
                </div>
                <p className="text-white font-bold text-sm md:text-base leading-snug">{currentQ.content}</p>
              </div>

              {/* Options — shrink to fit, no scroll */}
              <div className="flex-1 flex flex-col justify-center p-3 md:p-4 gap-2 min-h-0">
                {currentQ.options.map(opt => {
                  const isSelected = selectedAnswer === opt.id;
                  const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                  const isWrongSelection = isSelected && !isCorrectAnswer && isAnswerConfirmed;
                  const isCorrectSelection = isSelected && isCorrectAnswer && isAnswerConfirmed;

                  let optStyle: React.CSSProperties = {};
                  let textClass = 'text-white/80';
                  let statusIcon = null;

                  if (!isAnswerConfirmed) {
                    if (isSelected) {
                      optStyle = {
                        background: 'rgba(102,126,234,0.3)',
                        border: '2px solid rgba(102,126,234,0.8)',
                        boxShadow: '0 0 12px rgba(102,126,234,0.3)'
                      };
                      textClass = 'text-white font-bold';
                    } else {
                      optStyle = {
                        background: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid rgba(255,255,255,0.12)'
                      };
                    }
                  } else {
                    if (isCorrectSelection) {
                      optStyle = { background: 'rgba(22,101,52,0.6)', border: '2px solid #16a34a', boxShadow: '0 0 12px rgba(22,163,74,0.3)' };
                      textClass = 'text-green-200 font-bold';
                      statusIcon = <CheckCircle2 size={18} className="text-green-400 shrink-0" />;
                    } else if (isWrongSelection) {
                      optStyle = { background: 'rgba(153,27,27,0.5)', border: '2px solid #dc2626', boxShadow: '0 0 12px rgba(220,38,38,0.25)' };
                      textClass = 'text-red-200 font-bold';
                      statusIcon = <XCircle size={18} className="text-red-400 shrink-0" />;
                    } else if (isCorrectAnswer) {
                      optStyle = { background: 'rgba(22,101,52,0.35)', border: '2px solid rgba(22,163,74,0.5)' };
                      textClass = 'text-green-300';
                      statusIcon = <CheckCircle2 size={18} className="text-green-500 shrink-0" />;
                    } else {
                      optStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 };
                      textClass = 'text-white/50';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswerSelect(opt.id)}
                      disabled={isAnswerConfirmed}
                      className={`w-full px-4 py-2.5 md:py-3 rounded-xl text-left flex justify-between items-center transition-all duration-200 ${!isAnswerConfirmed && !isSelected ? 'hover:brightness-125' : ''}`}
                      style={optStyle}
                    >
                      <span className={`text-sm md:text-base ${textClass}`}>{opt.text}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusIcon}
                        {!isAnswerConfirmed && isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#818cf8' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer: CHECK ANSWER */}
              <div
                className="shrink-0 p-3 md:p-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                {!isAnswerConfirmed ? (
                  <button
                    onClick={checkAnswer}
                    disabled={!selectedAnswer}
                    className="w-full py-3 rounded-xl font-black text-white text-sm md:text-base tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: selectedAnswer
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: selectedAnswer ? '0 4px 20px rgba(102,126,234,0.45)' : 'none'
                    }}
                  >
                    CHECK ANSWER
                  </button>
                ) : (
                  <div className="text-center text-white/50 text-xs font-medium py-1 animate-pulse">
                    Listening to feedback…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // TEACHER MODE PLAYING
  // =====================================================
  const renderTeacherPlaying = () => {
    const currentQ = questions[currentStage];
    if (!currentQ) return null;

    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50 md:h-screen md:overflow-hidden font-['Poppins']">
        {/* === TEACHER HEADER === */}
        <div className="bg-white border-b border-slate-100 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: Titles */}
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold text-[#0F766E] flex items-center gap-2 font-['Montserrat']">
                <span>🥗</span> English 11 – Healthy Lifestyle
              </h1>
              <span className="text-xs text-slate-400 font-medium tracking-wide">READING CHALLENGE</span>
            </div>

            {/* Right: Teacher Mode badge + buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0F766E] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                TEACHER MODE
              </div>
              <button
                onClick={() => setAppState(AppState.TEACHER_REVIEW)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                REVIEW
              </button>
              <button
                onClick={() => setAppState(AppState.LEADERBOARD)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                LEADERBOARD
              </button>
            </div>
          </div>
          <ProgressNavigation currentStage={currentStage} />
        </div>

        {/* Main Split Content */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-4 md:gap-5 md:overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div className="bg-[#F0FDF4] rounded-3xl shadow-inner border border-green-100 relative md:flex-1 reading-passage-container" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '20px' }}>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question (Teacher Mode) */}
          <div className="flex flex-col min-h-0 md:flex-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 relative flex flex-col flex-1 min-h-0">

              {/* Card Header */}
              <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center">
                <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Stage {currentStage + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Multiple Choice</span>
                </div>
              </div>

              {/* Question + options with letter labels */}
              <div className="p-4 md:p-5 flex-1 flex flex-col overflow-y-auto min-h-0">
                <h2 className="text-base md:text-xl font-bold text-slate-800 mb-4 leading-relaxed">
                  {currentQ.content}
                </h2>

                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                    const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                    const hasRevealed = teacherSelectedAnswer !== null;

                    let optClass = 'bg-white border-2 border-slate-200 hover:border-cyan-300 text-slate-700';
                    let letterClass = 'bg-slate-100 text-slate-500';

                    if (hasRevealed) {
                      if (isCorrectAnswer) {
                        optClass = 'bg-green-500 border-2 border-green-500 text-white';
                        letterClass = 'bg-white/30 text-white';
                      } else {
                        optClass = 'bg-white border-2 border-slate-100 text-slate-400';
                        letterClass = 'bg-slate-50 text-slate-300';
                      }
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`w-full p-3 md:p-3.5 rounded-xl transition-all duration-300 ${optClass} flex items-center gap-3`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${letterClass}`}>
                          {hasRevealed && isCorrectAnswer ? <CheckCircle2 size={18} /> : letter}
                        </span>
                        <span className="text-sm md:text-lg font-medium">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: REVEAL / ANSWER BAR + NEXT */}
              <div className="p-3 border-t border-slate-100 bg-slate-50">
                {!teacherSelectedAnswer ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTeacherSelectedAnswer(currentQ.correctAnswerId)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors shadow-md"
                    >
                      <span className="w-3 h-3 rounded-full bg-white/40"></span> REVEAL
                    </button>
                    <button
                      onClick={teacherNextStage}
                      disabled={currentStage === 9}
                      className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      NEXT →
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#0F766E] text-white text-sm font-bold">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span className="truncate">ANSWER: {currentQ.options.find(o => o.id === currentQ.correctAnswerId)?.text?.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={teacherNextStage}
                      disabled={currentStage === 9}
                      className="flex items-center justify-center gap-1 py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      NEXT →
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={teacherPrevStage}
                    disabled={currentStage === 0}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← PREV
                  </button>
                  <button
                    onClick={exitTeacherMode}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors flex items-center gap-1"
                  >
                    <LogOut size={12} /> EXIT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // TEACHER REVIEW — Per-student per-question review
  // =====================================================
  const renderTeacherReview = () => {
    const sortedEntries = [...leaderboard].sort((a, b) => a.name.localeCompare(b.name, 'vi-VN'));
    const gameQuestions = questions.length > 0 ? questions : FALLBACK_QUESTIONS.slice(0, 10);
    const totalQ = gameQuestions.length;
    const currentQ = gameQuestions[reviewQuestionIdx];

    const studentAnswerCorrect = reviewStudent?.answers?.[currentQ?.id];
    const studentSelectedId = reviewStudent?.selectedAnswers?.[currentQ?.id];
    const isCorrectAnswer = studentAnswerCorrect === true;

    const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
      <div className="min-h-screen md:h-screen bg-slate-50 font-['Poppins'] flex flex-col overflow-hidden">
        {/* REVIEW HEADER */}
        <div className="bg-white border-b border-slate-100 shadow-sm z-50 shrink-0">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0F766E] text-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold shadow-md">
                <Eye size={14} />
                <span className="hidden md:inline">REVIEW MODE</span><span className="md:hidden">REVIEW</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xs md:text-sm font-semibold text-slate-500">
                Question <span className="text-[#0F766E] font-bold">{reviewQuestionIdx + 1}</span> of {totalQ}
              </span>
              <button
                onClick={() => { setReviewStudent(null); setReviewQuestionIdx(0); setAppState(AppState.TEACHER_PLAYING); }}
                className="p-1.5 md:p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors border border-slate-200"
                title="Close"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* STUDENT DROPDOWN */}
        <div className="max-w-7xl mx-auto w-full px-3 md:px-4 pt-3 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Student:</label>
            <select
              value={reviewStudent ? `${reviewStudent.name}|${reviewStudent.timestamp}` : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) { setReviewStudent(null); return; }
                const [name, ts] = val.split('|');
                const student = sortedEntries.find(s => s.name === name && s.timestamp === Number(ts));
                setReviewStudent(student || null);
                setReviewQuestionIdx(0);
              }}
              className="w-full p-2 md:p-2.5 rounded-lg border-2 border-slate-200 focus:border-[#0F766E] focus:outline-none text-sm font-medium text-slate-700 bg-slate-50 transition-colors"
            >
              <option value="">— Select a student —</option>
              {sortedEntries.map((entry, idx) => {
                const correct = entry.answers ? Object.values(entry.answers).filter(Boolean).length : 0;
                const total = entry.answers ? Object.keys(entry.answers).length : 0;
                return (
                  <option key={idx} value={`${entry.name}|${entry.timestamp}`}>
                    {entry.name} ({entry.className}) — {correct}/{total} — {fmtTime(entry.timeSpent)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* MAIN CONTENT */}
        {!reviewStudent ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-slate-400">
              <UserIcon size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-lg">Select a student to review</p>
              <p className="text-sm mt-1">{sortedEntries.length} student(s) submitted</p>
            </div>
          </div>
        ) : currentQ ? (
          <div className="flex-1 max-w-7xl mx-auto w-full px-3 md:px-4 py-3 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0 overflow-hidden">
            {/* LEFT: Reading Passage */}
            <div className="md:w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0 max-h-[40vh] md:max-h-none">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
                <span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} /> READING PASSAGE
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ReadingPassage content={READING_PASSAGE} />
              </div>
            </div>

            {/* RIGHT: Question + Answers */}
            <div className="md:w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
              {/* Question header */}
              <div className="p-3 md:p-4 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shrink-0">
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Stage {reviewQuestionIdx + 1}
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Multiple Choice
                  </span>
                  {studentAnswerCorrect !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isCorrectAnswer ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'
                      }`}>
                      {isCorrectAnswer ? '✅ Correct' : '❌ Incorrect'}
                    </span>
                  )}
                </div>
                <h3 className="text-sm md:text-base font-bold leading-relaxed">{currentQ.content}</h3>
              </div>

              {/* Answer options */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
                {currentQ.options.map(opt => {
                  const isCorrect = opt.id === currentQ.correctAnswerId;
                  const isStudentPick = opt.id === studentSelectedId;
                  const hasData = studentAnswerCorrect !== undefined;

                  let bgClass = 'bg-slate-50 border-slate-200 text-slate-600';
                  if (hasData) {
                    if (isCorrect) bgClass = 'bg-green-50 border-green-400 text-green-800';
                    else if (isStudentPick && !isCorrect) bgClass = 'bg-red-50 border-red-400 text-red-700';
                    else bgClass = 'bg-slate-50 border-slate-100 text-slate-400';
                  }

                  return (
                    <div key={opt.id} className={`p-3 rounded-xl border-2 ${bgClass} flex items-center justify-between`}>
                      <span className="text-sm font-medium">{opt.text}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasData && isStudentPick && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">STUDENT</span>
                        )}
                        {hasData && isCorrect && <CheckCircle2 size={18} className="text-green-600" />}
                        {hasData && isStudentPick && !isCorrect && <XCircle size={18} className="text-red-500" />}
                      </div>
                    </div>
                  );
                })}
                {studentAnswerCorrect !== undefined && !studentSelectedId && (
                  <div className="text-xs text-slate-400 text-center mt-2 bg-slate-50 p-2 rounded-lg">
                    ℹ️ Detailed answer choice not available for older submissions
                  </div>
                )}
              </div>

              {/* PREV / NEXT */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReviewQuestionIdx(Math.max(0, reviewQuestionIdx - 1))}
                    disabled={reviewQuestionIdx === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} /> PREV
                  </button>
                  <button
                    onClick={() => setReviewQuestionIdx(Math.min(totalQ - 1, reviewQuestionIdx + 1))}
                    disabled={reviewQuestionIdx === totalQ - 1}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d9488] text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    NEXT <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderResult = () => {
    const totalQuestions = questions.length || 10;
    const correctCount = Object.values(userAnswers).filter(Boolean).length;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const timeSpent = 480 - timeLeft;
    const mins = Math.floor(timeSpent / 60);
    const secs = timeSpent % 60;
    const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Badge logic
    let badge = '';
    let badgeMsg = '';
    let badgeGrad = '';
    if (accuracy === 100) {
      badge = '👑 Challenge Champion';
      badgeMsg = "Outstanding! You've mastered the challenge.";
      badgeGrad = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
    } else if (accuracy >= 85) {
      badge = '🥇 Skillful Reader';
      badgeMsg = 'Excellent performance!';
      badgeGrad = 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)';
    } else if (accuracy >= 70) {
      badge = '🥈 Active Achiever';
      badgeMsg = "Well done! You're on the right track.";
      badgeGrad = 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)';
    } else if (accuracy >= 50) {
      badge = '🥉 Rising Learner';
      badgeMsg = 'Good effort! Keep improving.';
      badgeGrad = 'linear-gradient(135deg, #92400e 0%, #b45309 100%)';
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="max-w-md w-full mx-auto animate-fade-in">
          {/* Glowing header circle */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 0 40px rgba(102,126,234,0.6)' }}>
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-1 uppercase tracking-widest">Challenge Complete!</h2>
          <p className="text-center text-slate-400 text-sm mb-8">Your performance summary</p>

          {/* Stats card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</div>
                <div className="text-4xl font-black" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{correctCount}/{totalQuestions}</div>
                <div className="text-xs text-slate-400 mt-1">{accuracy}% accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time</div>
                <div className="text-4xl font-black font-mono" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{timeString}</div>
                <div className="text-xs text-slate-400 mt-1">minutes used</div>
              </div>
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <div
              className="rounded-xl p-3 mb-6 text-center"
              style={{ background: badgeGrad, boxShadow: '0 0 20px rgba(102,126,234,0.3)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-white/70">Badge Earned</div>
              <div className="text-lg font-black text-white">{badge}</div>
              <div className="text-xs text-white/80 mt-0.5 font-medium">{badgeMsg}</div>
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            {/* Primary: View Leaderboard */}
            <button
              onClick={() => setAppState(AppState.LEADERBOARD)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wide flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 24px rgba(102,126,234,0.5)'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 32px rgba(102,126,234,0.75)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(102,126,234,0.5)')}
            >
              <Trophy size={22} /> View Leaderboard
            </button>

            {/* Secondary: Review Answers */}
            <button
              onClick={() => {
                setReviewQuestionIdx(0);
                setAppState(AppState.STUDENT_REVIEW);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-slate-200 text-base flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 0 0 0 rgba(102,126,234,0)'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(102,126,234,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 rgba(102,126,234,0)')}
            >
              <Eye size={20} /> Review Answers
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // STUDENT REVIEW — Read-only
  // =====================================================
  const renderStudentReview = () => {
    const gameQuestions = questions.length > 0 ? questions : FALLBACK_QUESTIONS.slice(0, 10);
    const totalQ = gameQuestions.length;
    const currentQ = gameQuestions[reviewQuestionIdx];
    if (!currentQ) return null;

    const studentSelectedId = selectedAnswerMap[currentQ.id];
    const isAnsweredCorrectly = userAnswers[currentQ.id] === true;

    return (
      <div className="min-h-screen md:h-screen flex flex-col font-['Poppins']" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

        {/* HEADER */}
        <div className="shrink-0 z-50" style={{ background: 'rgba(15,12,41,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Eye size={14} className="text-white" />
                <span className="text-white">REVIEW MODE</span>
              </div>
              <span className="text-slate-400 text-sm hidden md:block">{user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm font-mono">
                Q<span className="text-white font-bold">{reviewQuestionIdx + 1}</span>/{totalQ}
              </span>
              <button
                onClick={() => { setReviewQuestionIdx(0); setAppState(AppState.RESULT); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <ChevronLeft size={16} /> Back to Results
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((reviewQuestionIdx + 1) / totalQ) * 100}%`,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              }}
            />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div
            className="md:flex-1 rounded-2xl overflow-y-auto review-passage-dark"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px',
              maxHeight: '45vh'
            }}
          >
            <style>{`
              .review-passage-dark p { color: rgba(255,255,255,0.85) !important; }
              .review-passage-dark h2 { color: #a5b4fc !important; border-color: rgba(165,180,252,0.2) !important; }
              .review-passage-dark h3 { color: #7dd3fc !important; }
            `}</style>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <BookOpen size={12} /> Reading Passage
            </div>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question + Answers (read-only) */}
          <div className="md:flex-1 flex flex-col min-h-0">
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>

              {/* Question header */}
              <div className="shrink-0 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(102,126,234,0.2)', color: '#a5b4fc' }}>
                    Question {reviewQuestionIdx + 1}
                  </span>
                  {userAnswers[currentQ.id] !== undefined && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isAnsweredCorrectly
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                      }`}>
                      {isAnsweredCorrectly ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold text-base md:text-lg leading-relaxed">{currentQ.content}</p>
              </div>

              {/* Answer options — read-only, no hover */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {currentQ.options.map(opt => {
                  const isCorrect = opt.id === currentQ.correctAnswerId;
                  const isStudentPick = opt.id === studentSelectedId;
                  const hasData = userAnswers[currentQ.id] !== undefined;

                  // Determine display style
                  let optStyle: React.CSSProperties = {};
                  let icon = null;

                  if (!hasData) {
                    // No answer recorded
                    optStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.7 };
                  } else if (isCorrect && isStudentPick) {
                    // Student picked the correct answer
                    optStyle = { background: 'rgba(22,101,52,0.6)', border: '2px solid #16a34a', boxShadow: '0 0 12px rgba(22,163,74,0.3)' };
                    icon = <CheckCircle2 size={20} className="text-green-400 shrink-0" />;
                  } else if (isCorrect && !isStudentPick) {
                    // This is the correct answer (student didn't pick it — show in dark green)
                    optStyle = { background: 'rgba(22,101,52,0.4)', border: '2px solid rgba(22,163,74,0.6)' };
                    icon = <CheckCircle2 size={20} className="text-green-500 shrink-0" />;
                  } else if (!isCorrect && isStudentPick) {
                    // Student's wrong pick
                    optStyle = { background: 'rgba(153,27,27,0.5)', border: '2px solid #dc2626', boxShadow: '0 0 12px rgba(220,38,38,0.25)' };
                    icon = <XCircle size={20} className="text-red-400 shrink-0" />;
                  } else {
                    // Other wrong options — dimmed
                    optStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.5 };
                  }

                  return (
                    <div
                      key={opt.id}
                      className="w-full p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-default"
                      style={optStyle}
                    >
                      <span className={`text-sm md:text-base font-semibold ${isCorrect ? 'text-green-200' :
                        isStudentPick && !isCorrect ? 'text-red-200' :
                          'text-slate-300'
                        }`}>{opt.text}</span>
                      {icon}
                    </div>
                  );
                })}
              </div>

              {/* PREV / NEXT */}
              <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewQuestionIdx(Math.max(0, reviewQuestionIdx - 1))}
                    disabled={reviewQuestionIdx === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                  >
                    <ChevronLeft size={18} /> PREV
                  </button>
                  <button
                    onClick={() => setReviewQuestionIdx(Math.min(totalQ - 1, reviewQuestionIdx + 1))}
                    disabled={reviewQuestionIdx === totalQ - 1}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: reviewQuestionIdx === totalQ - 1 ? 'none' : '0 2px 12px rgba(102,126,234,0.4)' }}
                  >
                    NEXT <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <LeaderboardDashboard
      entries={leaderboard}
      onReset={resetLeaderboard}
      onExit={() => isTeacherMode ? setAppState(AppState.TEACHER_PLAYING) : setAppState(AppState.RESULT)}
      isSyncing={isSyncing}
      isTeacherMode={isTeacherMode}
      currentUserName={isTeacherMode ? '' : user.name}
      onViewMyAttempt={isTeacherMode ? undefined : () => { setReviewQuestionIdx(0); setAppState(AppState.STUDENT_REVIEW); }}
    />
  );


  return (
    <div>
      {appState === AppState.LOADING && (
        <div
          className="min-h-screen flex items-center justify-center text-center font-['Poppins']"
          style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(165,180,252,0.3)', borderTopColor: '#667eea' }}
            />
            <p className="text-white/70 text-base font-semibold tracking-wide animate-pulse">{loadingText}</p>
          </div>
        </div>
      )}
      {appState === AppState.LOGIN && renderLogin()}
      {appState === AppState.PLAYING && renderPlaying()}
      {appState === AppState.RESULT && renderResult()}
      {appState === AppState.STUDENT_REVIEW && renderStudentReview()}
      {appState === AppState.LEADERBOARD && renderLeaderboard()}
      {appState === AppState.TEACHER_PLAYING && renderTeacherPlaying()}
      {appState === AppState.TEACHER_REVIEW && renderTeacherReview()}
    </div>
  );
};

export default App;
