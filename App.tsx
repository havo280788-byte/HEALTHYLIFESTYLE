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
      answers: userAnswers
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

        {/* Teacher Button — Desktop only */}
        <div className="mt-6 hidden md:flex justify-center">
          <button
            onClick={() => setShowPinDialog(true)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#0F766E] transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
          >
            <Lock size={14} /> Teacher
          </button>
        </div>

        {/* Settings Toggle */}
        <div className="mt-4 text-center">
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

      {/* PIN Dialog */}
      {showPinDialog && renderPinDialog()}
    </div>
  );

  const renderPlaying = () => {
    const currentQ = questions[currentStage];
    if (!currentQ) return null;

    // Format Timer mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isUrgent = timeLeft < 60; // Red color if under 1 minute

    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50 md:h-screen md:overflow-hidden font-['Poppins']">
        {/* === HEADER SECTION === */}
        <div className="bg-white border-b border-slate-100 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: Titles */}
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold text-[#0F766E] flex items-center gap-2 font-['Montserrat']">
                <span>🥗</span> English 11 – Healthy Lifestyle
              </h1>
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
          <ProgressNavigation currentStage={currentStage} />
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

        {/* 2. Main Split Content */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-4 md:gap-5 md:overflow-hidden">

          {/* LEFT: Reading Passage */}
          <div className="bg-[#F0FDF4] rounded-3xl shadow-inner border border-green-100 relative md:flex-1 reading-passage-container" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '20px' }}>
            <ReadingPassage content={READING_PASSAGE} />
          </div>

          {/* RIGHT: Question Interface (Compact Green Card) */}
          <div className="flex flex-col min-h-0 md:flex-1">
            <div className="bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#22C55E] rounded-3xl shadow-2xl overflow-hidden border border-green-600 relative flex flex-col flex-1 min-h-0">

              {/* Decorative Overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="bg-black/10 p-3 md:p-4 border-b border-white/10 flex justify-between items-center backdrop-blur-sm relative z-10">
                <span className="font-bold text-green-50 uppercase tracking-wider text-sm">
                  Question {currentStage + 1} / 10
                </span>
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
                  STAGE {currentStage + 1}
                </div>
              </div>

              <div className="p-4 md:p-5 relative z-10 flex-1 flex flex-col overflow-y-auto min-h-0">
                <h2 className="text-base md:text-xl font-bold text-white mb-3 leading-relaxed drop-shadow-sm" style={{ fontWeight: 700 }}>
                  {currentQ.content}
                </h2>

                <div className="space-y-2">
                  {currentQ.options.map(opt => {
                    const isSelected = selectedAnswer === opt.id;
                    const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                    const isWrongSelection = isSelected && !isCorrectAnswer && isAnswerConfirmed;
                    const isCorrectSelection = isSelected && isCorrectAnswer && isAnswerConfirmed;

                    let btnClass = "bg-white text-slate-700 hover:bg-green-50 border-2 border-transparent shadow-sm";
                    let statusIcon = null;

                    if (isSelected) {
                      btnClass = "bg-green-100 text-green-800 border-2 border-green-500 shadow-md transform scale-[1.01]";
                    }

                    if (isAnswerConfirmed) {
                      if (isCorrectSelection) {
                        btnClass = "bg-[#dcfce7] border-2 border-[#15803D] text-[#14532D]";
                        statusIcon = <CheckCircle2 size={20} className="text-[#15803D]" />;
                      } else if (isWrongSelection) {
                        btnClass = "bg-red-50 border-2 border-[#DC2626] text-[#991B1B]";
                        statusIcon = <XCircle size={20} className="text-[#DC2626]" />;
                      } else {
                        btnClass = "bg-white/90 text-slate-400 opacity-75";
                      }
                    } else if (isSelected) {
                      btnClass = "bg-white border-2 border-[#22C55E] text-[#15803D] shadow-md ring-2 ring-green-400/30";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerSelect(opt.id)}
                        disabled={isAnswerConfirmed}
                        className={`w-full p-3 rounded-xl text-left font-semibold transition-all duration-200 ${btnClass} flex justify-between items-center group`}
                      >
                        <span className="text-sm md:text-lg" style={{ fontWeight: 500 }}>{opt.text}</span>
                        {statusIcon}
                        {!isAnswerConfirmed && selectedAnswer === opt.id && <div className="w-3 h-3 rounded-full bg-[#22C55E]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-black/10 border-t border-white/10 text-center backdrop-blur-sm relative z-10">
                {!isAnswerConfirmed && (
                  <Button
                    onClick={checkAnswer}
                    disabled={!selectedAnswer}
                    fullWidth
                    className="bg-orange-500 text-white hover:bg-orange-600 font-bold py-3 md:py-4 text-base shadow-lg hover:shadow-xl transition-all"
                  >
                    CHECK ANSWER
                  </Button>
                )}
                {isAnswerConfirmed && (
                  <div className="text-white/80 text-sm font-medium py-2 animate-pulse">
                    Listen to the feedback...
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
            <div className="bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#22C55E] rounded-3xl shadow-2xl overflow-hidden border border-green-600 relative flex flex-col flex-1 min-h-0">

              {/* Decorative */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="bg-black/10 p-3 md:p-4 border-b border-white/10 flex justify-between items-center backdrop-blur-sm relative z-10">
                <span className="font-bold text-green-50 uppercase tracking-wider text-sm">
                  Question {currentStage + 1} / 10
                </span>
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
                  STAGE {currentStage + 1}
                </div>
              </div>

              {/* Question + instant-reveal options */}
              <div className="p-4 md:p-5 relative z-10 flex-1 flex flex-col overflow-y-auto min-h-0">
                <h2 className="text-base md:text-xl font-bold text-white mb-3 leading-relaxed drop-shadow-sm" style={{ fontWeight: 700 }}>
                  {currentQ.content}
                </h2>

                <div className="space-y-2">
                  {currentQ.options.map(opt => {
                    const isCorrectAnswer = opt.id === currentQ.correctAnswerId;
                    const isSelected = teacherSelectedAnswer === opt.id;
                    const hasRevealed = teacherSelectedAnswer !== null;

                    let btnClass = "bg-white text-slate-700 hover:bg-green-50 border-2 border-transparent shadow-sm cursor-pointer";

                    if (hasRevealed) {
                      if (isCorrectAnswer) {
                        // Always show the correct answer in green
                        btnClass = "bg-[#dcfce7] border-2 border-[#15803D] text-[#14532D]";
                      } else if (isSelected && !isCorrectAnswer) {
                        // Wrong selection
                        btnClass = "bg-red-50 border-2 border-[#DC2626] text-[#991B1B]";
                      } else {
                        btnClass = "bg-white/90 text-slate-400 opacity-75";
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleTeacherAnswerSelect(opt.id)}
                        className={`w-full p-3 rounded-xl text-left font-semibold transition-all duration-200 ${btnClass} flex justify-between items-center`}
                      >
                        <span className="text-sm md:text-lg" style={{ fontWeight: 500 }}>{opt.text}</span>
                        {hasRevealed && isCorrectAnswer && <CheckCircle2 size={20} className="text-[#15803D]" />}
                        {hasRevealed && isSelected && !isCorrectAnswer && <XCircle size={20} className="text-[#DC2626]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer: PREV / NEXT / EXIT */}
              <div className="p-3 bg-black/10 border-t border-white/10 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={teacherPrevStage}
                    disabled={currentStage === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} /> PREV
                  </button>
                  <button
                    onClick={teacherNextStage}
                    disabled={currentStage === 9}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    NEXT <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={exitTeacherMode}
                    className="flex items-center justify-center gap-1 py-2.5 px-4 rounded-xl bg-red-500/80 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                  >
                    <LogOut size={16} /> EXIT
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
  // TEACHER REVIEW — Student answers by name
  // =====================================================
  const renderTeacherReview = () => {
    // Sort entries by name
    const sortedEntries = [...leaderboard].sort((a, b) => a.name.localeCompare(b.name));
    const questionIds = questions.length > 0 ? questions.map(q => q.id) : FALLBACK_QUESTIONS.slice(0, 10).map(q => q.id);

    return (
      <div className="min-h-screen bg-slate-50 font-['Poppins']">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold text-[#0F766E] flex items-center gap-2 font-['Montserrat']">
                <span>🥗</span> English 11 – Healthy Lifestyle
              </h1>
              <span className="text-xs text-slate-400 font-medium tracking-wide">READING CHALLENGE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0F766E] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                TEACHER MODE
              </div>
              <button
                onClick={() => setAppState(AppState.TEACHER_PLAYING)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                QUESTIONS
              </button>
              <button
                onClick={() => setAppState(AppState.LEADERBOARD)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                LEADERBOARD
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 bg-gradient-to-r from-[#0F766E]/5 to-transparent">
              <h2 className="text-lg md:text-xl font-bold text-[#0F766E] flex items-center gap-2">
                <Eye size={22} /> Student Responses
              </h2>
              <p className="text-sm text-slate-500 mt-1">{sortedEntries.length} student(s) submitted</p>
            </div>

            {sortedEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <UserIcon size={48} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">No student submissions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-bold text-slate-600">#</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600">Name</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600">Class</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-600">Score</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-600">Time</th>
                      {questionIds.map((_, i) => (
                        <th key={i} className="text-center py-3 px-2 font-bold text-slate-600 whitespace-nowrap">Q{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{entry.name}</td>
                        <td className="py-3 px-4 text-slate-500">{entry.className}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold text-xs">
                            {entry.score * 10}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs">
                          {Math.floor(entry.timeSpent / 60)}:{(entry.timeSpent % 60).toString().padStart(2, '0')}
                        </td>
                        {questionIds.map((qId, i) => {
                          const answer = entry.answers?.[qId];
                          return (
                            <td key={i} className="py-3 px-2 text-center">
                              {answer === undefined ? (
                                <span className="text-slate-300">—</span>
                              ) : answer ? (
                                <span className="text-green-500 font-bold">✅</span>
                              ) : (
                                <span className="text-red-500 font-bold">❌</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
      onExit={() => isTeacherMode ? setAppState(AppState.TEACHER_PLAYING) : setAppState(AppState.LOGIN)}
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
      {appState === AppState.TEACHER_PLAYING && renderTeacherPlaying()}
      {appState === AppState.TEACHER_REVIEW && renderTeacherReview()}
    </div>
  );
};

export default App;
