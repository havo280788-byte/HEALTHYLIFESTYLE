export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Smart)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Stable)' }
];

export const THEME_COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#1d4ed8', // Darker Blue
  accent: '#60a5fa', // Blue Light
  success: '#22c55e', // Green
  warning: '#eab308', // Yellow
  error: '#ef4444', // Red
};

export const GAME_CONTENT = {
  activities: [
    { id: 'a1', text: "Doing yoga and meditation", target: 'mind' },
    { id: 'a2', text: "Getting 8 hours of sleep", target: 'mind' },
    { id: 'a3', text: "Reading books or learning new things", target: 'mind' },
    { id: 'a4', text: "Lifting weights at the gym", target: 'body' },
    { id: 'a5', text: "Eating a balanced diet with vegetables", target: 'body' },
    { id: 'a6', text: "Going for a 30-minute run", target: 'body' }
  ],
  reasons: [
    { id: 'r1', text: "Reduces stress and improves mental clarity", target: 'mind' },
    { id: 'r2', text: "Allows the brain to recharge and process information", target: 'mind' },
    { id: 'r3', text: "Keeps the mind sharp and prevents cognitive decline", target: 'mind' },
    { id: 'r4', text: "Increases muscle mass and bone density", target: 'body' },
    { id: 'r5', text: "Provides essential nutrients for organ function", target: 'body' },
    { id: 'r6', text: "Strengthens the heart and improves stamina", target: 'body' }
  ]
};

export const SOUND_EFFECTS = {
  correct: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // Ding
  incorrect: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3', // Error/Buzz
  click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3', // Pop/Click
};
