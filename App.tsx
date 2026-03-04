import React, { useState, useEffect } from 'react';
import { User, Question, AppState, LeaderboardEntry, GameSettings, QuestionType } from './types';
import { GEMINI_MODELS, FALLBACK_QUESTIONS, GAME_STAGES, STAGE_ICONS, THEME_COLORS, READING_PASSAGE, SOUND_EFFECTS } from './constants';
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
  Eye,
  Maximize2,
  Minimize2
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="rounded-2xl shadow-2xl p-6 w-full max-w-xs" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--primary-light)' }}>
            <Lock size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Teacher Access</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Enter PIN to continue</p>
        </div>
        <input
          type="password"
          maxLength={4}
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && startTeacherMode()}
          className={`w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border-2 rounded-xl outline-none transition-colors ${pinError ? 'border-red-500' : ''}`}
          style={{
            background: 'var(--bg-secondary)',
            borderColor: pinError ? '#f87171' : 'var(--card-border)',
            color: pinError ? '#f87171' : 'var(--text-primary)'
          }}
          placeholder="••••"
          autoFocus
        />
        {pinError && <p className="text-red-500 text-xs text-center mt-2 font-medium">Wrong PIN. Try again.</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setShowPinDialog(false); setPinInput(''); setPinError(false); }}
            className="flex-1 py-2.5 rounded-xl border-2 font-semibold transition-colors"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={startTeacherMode}
            className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-colors"
            style={{ background: 'var(--primary)' }}
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-['Poppins'] relative overflow-x-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Ambient soft blobs - make sure they don't cause horizontal overflow */}
      <div className="fixed top-[-80px] left-[-80px] w-64 h-64 rounded-full opacity-30 pointer-events-none blur-3xl" style={{ background: 'radial-gradient(circle, #20B486, transparent 70%)' }} />
      <div className="fixed bottom-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-20 pointer-events-none blur-3xl" style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />

      <div
        className="max-w-md w-full mx-auto rounded-3xl p-6 md:p-8 animate-fade-in relative z-10"
        style={{
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative"
            style={{
              background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)',
              boxShadow: '0 0 36px rgba(32,180,134,0.45)'
            }}
          >
            <Activity size={38} className="text-white" />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            English 11<br />
            <span style={{ background: 'linear-gradient(135deg, #20B486 0%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Healthy Lifestyle</span>
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>🥗 Ready to test your knowledge?</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--card-border)' }}
            >
              <UserIcon size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
              <input
                type="text"
                placeholder="Enter your name"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Class field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Class</label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--card-border)' }}
            >
              <BookOpen size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
              <input
                type="text"
                placeholder="e.g. 11A1"
                value={user.className}
                onChange={(e) => setUser({ ...user, className: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: 'var(--text-primary)' }}
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
                ? 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)'
                : 'var(--card-border)',
              boxShadow: (user.name && user.className) ? '0 4px 24px rgba(32,180,134,0.4)' : 'none'
            }}
            onMouseEnter={e => { if (user.name && user.className) e.currentTarget.style.boxShadow = '0 6px 32px rgba(32,180,134,0.6)'; }}
            onMouseLeave={e => { if (user.name && user.className) e.currentTarget.style.boxShadow = '0 4px 24px rgba(32,180,134,0.4)'; }}
          >
            <Play size={20} /> START CHALLENGE
          </button>
        </div>

        {/* Teacher button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowPinDialog(true)}
            className="hidden md:flex items-center gap-2 text-xs transition-colors px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
          >
            <Lock size={12} /> Teacher Mode
          </button>
        </div>

        {/* Settings */}
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings size={13} /> Settings
          </button>
          {showSettings && (
            <div className="mt-3 p-4 rounded-xl space-y-3 text-left" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>API Key (Optional)</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
                className="w-full text-sm outline-none px-3 py-2 rounded-lg"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
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
        className="w-full h-auto min-h-[100dvh] md:h-screen flex flex-col font-['Poppins'] relative overflow-hidden"
        style={{
          background: 'var(--bg-primary)'
        }}
      >
        {/* === HEADER === */}
        {/* === HEADER === */}
        <div
          className="shrink-0 z-50"
          style={{
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--card-border)',
            boxShadow: '0 1px 12px rgba(0,0,0,0.4)'
          }}
        >
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2.5 flex items-center justify-between gap-2">
            {/* Left: Title */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm md:text-base font-bold flex items-center gap-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
                <span>🥗</span>
                <span className="truncate">English 11 – Healthy Lifestyle</span>
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>Reading Challenge</span>
            </div>

            {/* Right: Fullscreen (desktop only) + Timer */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleFullscreen}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:brightness-110"
                style={{
                  background: 'var(--primary-light)',
                  border: '1.5px solid var(--primary)',
                  color: 'var(--primary)'
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-base md:text-xl shrink-0 ${isUrgent ? 'animate-pulse' : ''}`}
                style={{
                  background: isUrgent ? 'rgba(239,68,68,0.1)' : 'var(--primary-light)',
                  border: isUrgent ? '1.5px solid var(--error)' : '1.5px solid var(--primary)',
                  color: isUrgent ? 'var(--error)' : 'var(--primary)'
                }}
              >
                <Clock size={16} />
                {timerString}
              </div>
            </div>
          </div>

          {/* Stage progress bar */}
          <div style={{ height: '3px', background: 'var(--bg-secondary)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((currentStage + 1) / 10) * 100}%`,
                background: 'linear-gradient(90deg, #20B486 0%, #3B82F6 100%)'
              }}
            />
          </div>

          <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between min-w-[360px]">
              {Array.from({ length: 10 }, (_, i) => {
                const isCompleted = i < currentStage;
                const isActive = i === currentStage;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-125' : 'scale-100'}`}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, #20B486 0%, #178a68 100%)'
                          : isCompleted
                            ? 'rgba(32,180,134,0.3)'
                            : 'var(--bg-secondary)',
                        border: isActive ? '2px solid var(--primary)' : '1.5px solid var(--card-border)',
                        boxShadow: isActive ? '0 0 15px rgba(32,180,134,0.4)' : 'none',
                      }}
                    >
                      <span className="text-sm leading-none" style={{ filter: isCompleted ? 'grayscale(0.3)' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                        {isCompleted ? '✓' : STAGE_ICONS[i]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>



        {/* === MAIN CONTENT === */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-2.5 md:p-4 flex flex-col md:flex-row gap-2.5 md:gap-4 min-h-0">
          {/* LEFT: Reading Passage */}
          <div
            className="rounded-2xl md:overflow-y-auto md:flex-1 shrink-0"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              padding: '16px',
              maxHeight: 'none',
              minHeight: '150px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
              <BookOpen size={11} /> Reading Passage
            </div>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question Card — no inner scroll */}
          <div
            className="md:flex-1 flex flex-col min-h-0">
            <div
              className="flex flex-col flex-1 rounded-2xl md:overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* Question header */}
              <div
                className="shrink-0 p-3 md:p-4"
                style={{ borderBottom: '1px solid var(--card-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                    style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                  >
                    Question {currentStage + 1} / 10
                  </span>
                </div>
                <p className="font-bold text-sm md:text-2xl leading-snug" style={{ color: 'var(--text-primary)' }}>{currentQ.content}</p>
              </div>

              {/* Options — shrink to fit, no scroll */}
              <div className="flex-1 flex flex-col justify-center p-3 md:p-4 gap-2 min-h-0">
                {currentQ.options.map(opt => {
                  const isSelected = selectedAnswer === opt.id;
                  const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                  const isWrongSelection = isSelected && !isCorrectAnswer && isAnswerConfirmed;
                  const isCorrectSelection = isSelected && isCorrectAnswer && isAnswerConfirmed;

                  let optStyle: React.CSSProperties = {};
                  let textClass = '';
                  let statusIcon = null;

                  if (!isAnswerConfirmed) {
                    if (isSelected) {
                      optStyle = {
                        background: 'rgba(32,180,134,0.2)',
                        border: '2px solid var(--primary)',
                        boxShadow: '0 0 15px rgba(32,180,134,0.25)'
                      };
                      textClass = 'font-bold';
                    } else {
                      optStyle = {
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--card-border)'
                      };
                    }
                  } else {
                    if (isCorrectSelection) {
                      optStyle = { background: 'rgba(34,197,94,0.2)', border: '2px solid var(--success)', boxShadow: '0 0 15px rgba(34,197,94,0.3)' };
                      textClass = 'font-bold';
                      statusIcon = <CheckCircle2 size={18} className="text-green-400 shrink-0" />;
                    } else if (isWrongSelection) {
                      optStyle = { background: 'rgba(239,68,68,0.15)', border: '2px solid var(--error)', boxShadow: '0 0 15px rgba(239,68,68,0.2)' };
                      textClass = 'font-bold';
                      statusIcon = <XCircle size={18} className="text-red-400 shrink-0" />;
                    } else if (isCorrectAnswer) {
                      optStyle = { background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)' };
                      textClass = '';
                      statusIcon = <CheckCircle2 size={18} className="text-green-400 shrink-0" />;
                    } else {
                      optStyle = { background: 'var(--card-soft)', border: '1px solid var(--card-border)', opacity: 0.5 };
                      textClass = '';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswerSelect(opt.id)}
                      disabled={isAnswerConfirmed}
                      className={`w-full px-4 py-2.5 md:py-3 rounded-xl text-left flex justify-between items-center transition-all duration-200 ${!isAnswerConfirmed && !isSelected ? 'hover:brightness-95' : ''}`}
                      style={optStyle}
                    >
                      <span className={`text-sm md:text-[17px] ${textClass}`} style={{ color: isAnswerConfirmed ? undefined : (isSelected ? 'var(--primary-active)' : 'var(--text-secondary)') }}>{opt.text}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusIcon}
                        {!isAnswerConfirmed && isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer: CHECK ANSWER or inline feedback */}
              <div
                className="shrink-0 p-3 md:p-4"
                style={{ borderTop: '1px solid var(--card-border)' }}
              >
                {!isAnswerConfirmed ? (
                  <button
                    onClick={checkAnswer}
                    disabled={!selectedAnswer}
                    className="w-full py-3 rounded-xl font-black text-white text-sm md:text-[17px] tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: selectedAnswer
                        ? 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)'
                        : 'var(--card-border)',
                      boxShadow: selectedAnswer ? '0 4px 20px rgba(32,180,134,0.35)' : 'none'
                    }}
                  >
                    CHECK ANSWER
                  </button>
                ) : (() => {
                  const isCorrect = feedbackMessage === 'CORRECT!';
                  const successMessages: Record<number, string> = {
                    1: '🏃 Great start!', 2: '⏱ Smart choice!', 3: '🏠 Well done!',
                    4: '📱 Stay active!', 5: '🥗 Strong work!', 6: '⭐ Brilliant!',
                    7: '🪞 Nice balance!', 8: '💪 Great progress!', 9: '🌳 Fantastic!', 10: '🏆 Outstanding!'
                  };
                  return (
                    <div className="space-y-2 animate-fade-in">
                      {/* Feedback banner */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={isCorrect
                          ? { background: 'rgba(34,197,94,0.12)', border: '1.5px solid var(--success)' }
                          : { background: 'rgba(239,68,68,0.08)', border: '1.5px solid var(--error)' }
                        }
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={isCorrect ? { background: 'rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.15)' }}
                        >
                          {isCorrect
                            ? <CheckCircle2 size={18} className="text-green-500" />
                            : <XCircle size={18} className="text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm" style={isCorrect ? { color: 'var(--success)' } : { color: 'var(--error)' }}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {isCorrect
                              ? successMessages[currentStage + 1] || 'Well done!'
                              : 'Incorrect. Please review the passage.'
                            }
                          </div>
                        </div>
                      </div>
                      {/* Next Stage button */}
                      <button
                        onClick={nextStage}
                        className="w-full py-3 rounded-xl font-black text-white text-sm md:text-[17px] tracking-wide flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)', boxShadow: '0 4px 20px rgba(32,180,134,0.35)' }}
                      >
                        <Play size={16} className="fill-current" />
                        {currentStage < 9 ? 'NEXT STAGE' : 'SEE RESULTS'}
                      </button>
                    </div>
                  );
                })()}
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
      <div className="min-h-screen w-full flex flex-col md:h-screen md:overflow-hidden font-['Poppins']" style={{ background: 'var(--bg-primary)' }}>
        {/* === TEACHER HEADER === */}
        <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', boxShadow: '0 1px 8px rgba(32,180,134,0.08)' }} className="z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: Titles */}
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold flex items-center gap-2 font-['Montserrat']" style={{ color: 'var(--primary)' }}>
                <span>🥗</span> English 11 – Healthy Lifestyle
              </h1>
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>READING CHALLENGE</span>
            </div>

            {/* Right: Teacher Mode badge + buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md" style={{ background: 'var(--primary)' }}>
                <span className="w-2 h-2 rounded-full bg-green-200 animate-pulse"></span>
                TEACHER MODE
              </div>
              <button
                onClick={toggleFullscreen}
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors border"
                style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setAppState(AppState.TEACHER_REVIEW)}
                className="px-3 py-1.5 rounded-lg transition-colors border"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
              >
                REVIEW
              </button>
              <button
                onClick={() => setAppState(AppState.LEADERBOARD)}
                className="px-3 py-1.5 rounded-lg transition-colors border"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
              >
                LEADERBOARD
              </button>
            </div>
          </div>
          <ProgressNavigation currentStage={currentStage} />
        </div>

        {/* Main Split Content */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-2.5 md:p-4 flex flex-col md:flex-row gap-2.5 md:gap-4 min-h-0">

          {/* LEFT: Reading Passage */}
          <div className="rounded-2xl md:overflow-y-auto md:flex-1 shrink-0 reading-passage-container"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              padding: '16px',
              maxHeight: 'none',
              minHeight: '150px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question (Teacher Mode) */}
          <div className="flex flex-col min-h-0 md:flex-1">
            <div className="rounded-2xl md:overflow-hidden relative flex flex-col flex-1 min-h-0"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>

              {/* Card Header */}
              <div className="p-3 md:p-4 flex justify-between items-center"
                style={{ borderBottom: '1px solid var(--card-border)' }}>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                  Stage {currentStage + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Multiple Choice</span>
                </div>
              </div>

              {/* Question + options with letter labels */}
              <div className="p-4 md:p-5 flex-1 flex flex-col overflow-y-auto min-h-0">
                <h2 className="text-sm md:text-2xl font-bold mb-4 leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {currentQ.content
                  }</h2>

                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                    const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                    const hasRevealed = teacherSelectedAnswer !== null;

                    let optStyle: React.CSSProperties = {
                      background: 'var(--bg-secondary)',
                      border: '1.5px solid var(--card-border)',
                      color: 'var(--text-primary)'
                    };
                    let letterStyle: React.CSSProperties = {
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)'
                    };

                    if (hasRevealed) {
                      if (isCorrectAnswer) {
                        optStyle = {
                          background: 'var(--success)',
                          border: '1.5px solid var(--success)',
                          color: 'var(--text-inverse)'
                        };
                        letterStyle = {
                          background: 'rgba(255,255,255,0.25)',
                          color: 'var(--text-inverse)'
                        };
                      } else if (opt.id === teacherSelectedAnswer) {
                        optStyle = {
                          background: 'var(--error)',
                          border: '1.5px solid var(--error)',
                          color: 'var(--text-inverse)'
                        };
                        letterStyle = {
                          background: 'rgba(255,255,255,0.25)',
                          color: 'var(--text-inverse)'
                        };
                      } else {
                        optStyle = {
                          background: 'var(--bg-secondary)',
                          border: '1.5px solid var(--card-border)',
                          color: 'var(--text-muted)',
                          opacity: 0.6
                        };
                        letterStyle = {
                          background: 'rgba(255,255,255,0.03)',
                          color: 'var(--text-muted)'
                        };
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => !hasRevealed && setTeacherSelectedAnswer(opt.id)}
                        disabled={hasRevealed}
                        className="w-full text-left p-3 md:p-4 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                        style={optStyle}
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-base md:text-xl shrink-0 transition-colors"
                          style={letterStyle}>
                          {hasRevealed && isCorrectAnswer ? <CheckCircle2 size={18} /> : letter}
                        </div>
                        <span className="font-bold text-sm md:text-lg flex-1">{opt.text}</span>
                        {hasRevealed && isCorrectAnswer && (
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 md:px-6 md:py-4 flex items-center justify-between gap-4"
                style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
                <button
                  onClick={teacherPrevStage}
                  disabled={currentStage === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ← Prev
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setTeacherSelectedAnswer(currentQ.correctAnswerId)}
                    disabled={teacherSelectedAnswer !== null}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    REVEAL
                  </button>

                  <button
                    onClick={teacherNextStage}
                    disabled={currentStage === 9}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-30"
                    style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--card-border)' }}
                  >
                    NEXT →
                  </button>
                </div>

                <button
                  onClick={exitTeacherMode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 text-rose-400 hover:text-rose-300"
                >
                  Exit ➜
                </button>
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
      <div className="min-h-screen md:h-screen font-['Poppins'] flex flex-col md:overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {/* REVIEW HEADER */}
        <div className="z-50 shrink-0" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-md" style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}>
                <Eye size={14} />
                <span className="hidden md:inline">REVIEW MODE</span><span className="md:hidden">REVIEW</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xs md:text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Question <span className="font-bold" style={{ color: 'var(--primary)' }}>{reviewQuestionIdx + 1}</span> of {totalQ}
              </span>
              <button
                onClick={() => { setReviewStudent(null); setReviewQuestionIdx(0); setAppState(AppState.TEACHER_PLAYING); }}
                className="p-1.5 md:p-2 rounded-lg transition-colors border"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
                title="Close"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* STUDENT DROPDOWN */}
        <div className="max-w-7xl mx-auto w-full px-3 md:px-4 pt-3 shrink-0">
          <div className="rounded-xl p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Student:</label>
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
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--card-border)', color: 'var(--text-primary)' }}
              className="w-full p-2 md:p-2.5 rounded-lg focus:outline-none text-sm font-medium transition-colors"
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
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <UserIcon size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-lg">Select a student to review</p>
              <p className="text-sm mt-1">{sortedEntries.length} student(s) submitted</p>
            </div>
          </div>
        ) : currentQ ? (
          <div className="flex-1 max-w-7xl mx-auto w-full px-3 md:px-4 py-3 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0">
            {/* LEFT: Reading Passage */}
            <div className="rounded-2xl md:overflow-y-auto md:flex-1 shrink-0 reading-passage-container"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                padding: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
              <div className="p-2 mb-4 border-b border-[var(--card-border)]">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <BookOpen size={14} /> READING PASSAGE
                </span>
              </div>
              <ReadingPassage content={READING_PASSAGE} />
            </div>

            {/* RIGHT: Question + Answers */}
            <div className="md:flex-1 flex flex-col min-h-0 rounded-2xl md:overflow-hidden relative"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
              {/* Question header */}
              <div className="p-3 md:p-4 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                    Stage {reviewQuestionIdx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    Multiple Choice
                  </span>
                  {studentAnswerCorrect !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isCorrectAnswer ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                      {isCorrectAnswer ? '✅ Correct' : '❌ Incorrect'}
                    </span>
                  )}
                </div>
                <h3 className="text-sm md:text-base font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>{currentQ.content}</h3>
              </div>

              {/* Answer options */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {currentQ.options.map(opt => {
                  const isCorrect = opt.id === currentQ.correctAnswerId;
                  const isStudentPick = opt.id === studentSelectedId;
                  const hasData = studentAnswerCorrect !== undefined;

                  let optStyle: React.CSSProperties = {
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--card-border)',
                    color: 'var(--text-primary)'
                  };

                  if (hasData) {
                    if (isCorrect) {
                      optStyle = { background: 'var(--success)', border: '1.5px solid var(--success)', color: 'var(--text-inverse)' };
                    } else if (isStudentPick && !isCorrect) {
                      optStyle = { background: 'var(--error)', border: '1.5px solid var(--error)', color: 'var(--text-inverse)' };
                    } else {
                      optStyle = { background: 'var(--bg-secondary)', border: '1.5px solid var(--card-border)', color: 'var(--text-muted)', opacity: 0.6 };
                    }
                  }

                  return (
                    <div key={opt.id} className="p-3 md:p-4 rounded-xl border-1.5 flex items-center justify-between" style={optStyle}>
                      <span className="text-sm md:text-base font-bold">{opt.content}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasData && isStudentPick && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white">STUDENT</span>
                        )}
                        {hasData && isCorrect && <CheckCircle2 size={18} className="text-white" />}
                        {hasData && isStudentPick && !isCorrect && <XCircle size={18} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PREV / NEXT */}
              <div className="p-3 bg-stone-900/10 shrink-0" style={{ borderTop: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReviewQuestionIdx(Math.max(0, reviewQuestionIdx - 1))}
                    disabled={reviewQuestionIdx === 0}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft size={18} /> PREV
                  </button>
                  <button
                    onClick={() => setReviewQuestionIdx(Math.min(totalQ - 1, reviewQuestionIdx + 1))}
                    disabled={reviewQuestionIdx === totalQ - 1}
                    style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-30"
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
      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full mx-auto animate-fade-in">
          {/* Header circle */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)', boxShadow: '0 0 40px rgba(32,180,134,0.5)' }}>
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)' }} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-black text-center mb-1 uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Challenge Complete!</h2>
          <p className="text-center text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Your performance summary</p>

          {/* Stats card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 4px 20px rgba(32,180,134,0.1)' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Score</div>
                <div className="text-4xl font-black" style={{ background: 'linear-gradient(135deg, #20B486 0%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{correctCount}/{totalQuestions}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{accuracy}% accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Time</div>
                <div className="text-4xl font-black font-mono" style={{ background: 'linear-gradient(135deg, #20B486 0%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{timeString}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>minutes used</div>
              </div>
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <div
              className="rounded-xl p-3 mb-6 text-center"
              style={{ background: badgeGrad, boxShadow: '0 0 20px rgba(32,180,134,0.25)' }}
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
                background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)',
                boxShadow: '0 4px 24px rgba(32,180,134,0.4)'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 32px rgba(32,180,134,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(32,180,134,0.4)')}
            >
              <Trophy size={22} /> View Leaderboard
            </button>

            {/* Secondary: Review Answers */}
            <button
              onClick={() => {
                setReviewQuestionIdx(0);
                setAppState(AppState.STUDENT_REVIEW);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'var(--card-bg)',
                border: '1.5px solid var(--card-border)',
                color: 'var(--text-secondary)'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(32,180,134,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
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
      <div className="min-h-screen md:h-screen flex flex-col font-['Poppins']" style={{ background: 'var(--bg-primary)' }}>

        {/* HEADER */}
        <div className="shrink-0 z-50" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', boxShadow: '0 1px 8px rgba(32,180,134,0.08)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #20B486 0%, #3B82F6 100%)' }}>
                <Eye size={14} />
                <span>REVIEW MODE</span>
              </div>
              <span className="text-sm hidden md:block" style={{ color: 'var(--text-muted)' }}>{user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                Q<span className="font-bold" style={{ color: 'var(--text-primary)' }}>{reviewQuestionIdx + 1}</span>/{totalQ}
              </span>
              <button
                onClick={() => { setReviewQuestionIdx(0); setAppState(AppState.RESULT); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} /> Back to Results
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((reviewQuestionIdx + 1) / totalQ) * 100}%`,
                background: 'linear-gradient(90deg, #20B486 0%, #3B82F6 100%)'
              }}
            />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div
            className="md:flex-1 rounded-2xl overflow-y-auto"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              padding: '20px',
              maxHeight: '45vh',
              boxShadow: '0 2px 8px rgba(32,180,134,0.06)'
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <BookOpen size={12} /> Reading Passage
            </div>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question + Answers (read-only) */}
          <div className="md:flex-1 flex flex-col min-h-0">
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 2px 12px rgba(32,180,134,0.08)' }}>

              {/* Question header */}
              <div className="shrink-0 p-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                    Question {reviewQuestionIdx + 1}
                  </span>
                  {userAnswers[currentQ.id] !== undefined && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isAnsweredCorrectly
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                      }`}>
                      {isAnsweredCorrectly ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-primary)' }}>{currentQ.content}</p>
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
                    optStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', opacity: 0.8 };
                  } else if (isCorrect && isStudentPick) {
                    optStyle = { background: 'rgba(34,197,94,0.15)', border: '2px solid var(--success)', boxShadow: '0 0 12px rgba(34,197,94,0.2)' };
                    icon = <CheckCircle2 size={20} className="text-green-500 shrink-0" />;
                  } else if (isCorrect && !isStudentPick) {
                    optStyle = { background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.5)' };
                    icon = <CheckCircle2 size={20} className="text-green-400 shrink-0" />;
                  } else if (!isCorrect && isStudentPick) {
                    optStyle = { background: 'rgba(239,68,68,0.1)', border: '2px solid var(--error)', boxShadow: '0 0 12px rgba(239,68,68,0.15)' };
                    icon = <XCircle size={20} className="text-red-500 shrink-0" />;
                  } else {
                    optStyle = { background: 'var(--card-soft)', border: '1px solid var(--card-border)', opacity: 0.5 };
                  }

                  return (
                    <div
                      key={opt.id}
                      className="w-full p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-default"
                      style={optStyle}
                    >
                      <span className={`text-sm md:text-base font-semibold`} style={{ color: isCorrect ? 'var(--primary-active)' : (isStudentPick && !isCorrect ? 'var(--error)' : 'var(--text-secondary)') }}>{opt.text}</span>
                      {icon}
                    </div>
                  );
                })}
              </div>

              {/* PREV / NEXT */}
              <div className="shrink-0 p-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewQuestionIdx(Math.max(0, reviewQuestionIdx - 1))}
                    disabled={reviewQuestionIdx === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    <ChevronLeft size={18} /> PREV
                  </button>
                  <button
                    onClick={() => setReviewQuestionIdx(Math.min(totalQ - 1, reviewQuestionIdx + 1))}
                    disabled={reviewQuestionIdx === totalQ - 1}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #20B486 0%, #1AA376 100%)', boxShadow: reviewQuestionIdx === totalQ - 1 ? 'none' : '0 2px 12px rgba(32,180,134,0.35)' }}
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
          style={{ background: 'var(--bg-primary)' }}
        >
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(32,180,134,0.25)', borderTopColor: 'var(--primary)' }}
            />
            <p className="text-base font-semibold tracking-wide animate-pulse" style={{ color: 'var(--text-muted)' }}>{loadingText}</p>
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
