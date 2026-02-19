import { Question, QuestionType } from './types';

export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Smart)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Stable)' }
];

export const GAME_STAGES = [
  "Energy Spark",
  "Fuel Your Body",
  "Move & Burn",
  "Power Up",
  "Stay Strong",
  "Mind Matters",
  "Healthy Moves",
  "Boost Zone",
  "Challenge Peak",
  "Wellness Champion"
];

export const THEME_COLORS = {
  primary: '#0F766E', // Deep Teal
  secondary: '#14B8A6', // Fresh Teal
  accent: '#5EEAD4', // Mint Light
  success: '#22c55e', // Green
  warning: '#eab308', // Yellow
  error: '#ef4444', // Red
};

export const FALLBACK_QUESTIONS: Question[] = [
  // 5 True/False
  {
    id: 'tf1',
    type: QuestionType.TRUE_FALSE,
    content: 'Eating a lot of sugar is good for your teeth and energy.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'false',
    explanation: 'Too much sugar causes tooth decay and energy crashes. Balanced diets are better.'
  },
  {
    id: 'tf2',
    type: QuestionType.TRUE_FALSE,
    content: 'You should drink about 8 glasses of water every day.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'true',
    explanation: 'Staying hydrated is essential for your body to function correctly.'
  },
  {
    id: 'tf3',
    type: QuestionType.TRUE_FALSE,
    content: 'Sleeping for only 4 hours is enough for a teenager.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'false',
    explanation: 'Teenagers need 8-10 hours of sleep for proper growth and focus.'
  },
  {
    id: 'tf4',
    type: QuestionType.TRUE_FALSE,
    content: 'Regular exercise strengthens your heart and muscles.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'true',
    explanation: 'Exercise improves cardiovascular health and builds strength.'
  },
  {
    id: 'tf5',
    type: QuestionType.TRUE_FALSE,
    content: 'Fruits and vegetables provide essential vitamins.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'true',
    explanation: 'They are rich in vitamins, minerals, and fiber needed for health.'
  },
  // 5 Multiple Choice
  {
    id: 'mc1',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Which of the following is considered a healthy snack?',
    options: [
      { id: 'a', text: 'Potato chips' },
      { id: 'b', text: 'Chocolate bar' },
      { id: 'c', text: 'An apple' },
      { id: 'd', text: 'Fried chicken' }
    ],
    correctAnswerId: 'c',
    explanation: 'Apples are natural, full of fiber, and have no added sugars compared to processed snacks.'
  },
  {
    id: 'mc2',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'What is the best way to prevent spreading germs?',
    options: [
      { id: 'a', text: 'Touching your face' },
      { id: 'b', text: 'Washing hands frequently' },
      { id: 'c', text: 'Sharing water bottles' },
      { id: 'd', text: 'Coughing without covering' }
    ],
    correctAnswerId: 'b',
    explanation: 'Washing hands with soap removes bacteria and viruses effectively.'
  },
  {
    id: 'mc3',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Which activity is NOT part of a sedentary lifestyle?',
    options: [
      { id: 'a', text: 'Playing video games all day' },
      { id: 'b', text: 'Watching TV for hours' },
      { id: 'c', text: 'Running in the park' },
      { id: 'd', text: 'Sitting at a desk' }
    ],
    correctAnswerId: 'c',
    explanation: 'Running is an active physical exercise, whereas the others involve sitting for long periods.'
  },
  {
    id: 'mc4',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'To keep your eyes healthy, you should eat foods rich in Vitamin A, like:',
    options: [
      { id: 'a', text: 'Carrots' },
      { id: 'b', text: 'Bread' },
      { id: 'c', text: 'Rice' },
      { id: 'd', text: 'Pasta' }
    ],
    correctAnswerId: 'a',
    explanation: 'Carrots are famous for being high in Vitamin A, which supports good vision.'
  },
  {
    id: 'mc5',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Mental health is improved by:',
    options: [
      { id: 'a', text: 'Ignoring your feelings' },
      { id: 'b', text: 'Talking to friends and family' },
      { id: 'c', text: 'Sleeping very late' },
      { id: 'd', text: 'Eating junk food' }
    ],
    correctAnswerId: 'b',
    explanation: 'Social connection and expressing feelings are key to maintaining good mental health.'
  }
];
