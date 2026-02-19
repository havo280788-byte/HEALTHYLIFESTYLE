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

export const READING_PASSAGE = `
## GET IN SHAPE WITH THE LATEST FITNESS TRENDS

**Going to the gym, or not?**
Home workouts are becoming very popular these days because many working people can't manage to have time to go to the fitness centre. Recently, 75% of people asked say it is easier, cheaper and more convenient to exercise at home. Mini-workouts of 5 to 10 minutes spread out during the day are also a great way to exercise while busy at home. All you need is a mat, light weights and some space for the perfect home gym.

**Apps are everywhere**
As we use our mobile phones for almost everything, it is no surprise they can help us exercise too. Fitness applications on our mobiles, smart watches and computers are the latest craze. These apps are often free to download and for people of all ages. They offer a variety of workouts as well as healthy diet advice and wellness tips. They also help track your progress and even give rewards such as badges and stars for encouragement.

**High-tech exercising**
Technology has definitely become part of our daily exercise. Whether at home or at the gym, exercise bikes, treadmills and other types of equipment have become interactive with screens and speakers. Smart fitness mirrors, acting as personal trainers, provide a variety of exercise programmes from boxing to Pilates while the person exercising can see themself in the mirror.

**Building muscles outdoors**
Running, cycling, walking and hiking are some types of outdoor fitness. More and more people are getting together to exercise or take an outdoor class while enjoying the benefits of nature with some fresh air and green healing.
`;

export const FALLBACK_QUESTIONS: Question[] = [
  // 5 True/False
  {
    id: 'tf1',
    type: QuestionType.TRUE_FALSE,
    content: 'According to the text, 75% of people find home workouts easier and more convenient.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'true',
    explanation: 'The text states that "75% of people asked say it is easier, cheaper and more convenient to exercise at home."'
  },
  {
    id: 'tf2',
    type: QuestionType.TRUE_FALSE,
    content: 'You need expensive equipment to create a perfect home gym.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'false',
    explanation: 'The text mentions you only need "a mat, light weights and some space."'
  },
  {
    id: 'tf3',
    type: QuestionType.TRUE_FALSE,
    content: 'Fitness apps are only available for young people.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'false',
    explanation: 'The text says these apps are "for people of all ages."'
  },
  {
    id: 'tf4',
    type: QuestionType.TRUE_FALSE,
    content: 'Smart fitness mirrors allow you to see yourself while training.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'true',
    explanation: 'The text confirms that "the person exercising can see themself in the mirror."'
  },
  {
    id: 'tf5',
    type: QuestionType.TRUE_FALSE,
    content: 'Outdoor fitness activities include boxing and Pilates.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswerId: 'false',
    explanation: 'Boxing and Pilates are mentioned as programs on smart fitness mirrors, while running and cycling are listed as outdoor fitness.'
  },
  // 5 Multiple Choice
  {
    id: 'mc1',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Why are home workouts becoming popular?',
    options: [
      { id: 'a', text: 'Gyms are closing down' },
      { id: 'b', text: 'Working people lack time to go to fitness centres' },
      { id: 'c', text: 'They require heavy weights' },
      { id: 'd', text: 'Apps pay you to exercise' }
    ],
    correctAnswerId: 'b',
    explanation: 'The text says "many working people can\'t manage to have time to go to the fitness centre."'
  },
  {
    id: 'mc2',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'What is a suggested duration for "mini-workouts"?',
    options: [
      { id: 'a', text: '1 hour' },
      { id: 'b', text: '30 minutes' },
      { id: 'c', text: '5 to 10 minutes' },
      { id: 'd', text: '20 seconds' }
    ],
    correctAnswerId: 'c',
    explanation: 'The text suggests "Mini-workouts of 5 to 10 minutes spread out during the day."'
  },
  {
    id: 'mc3',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'What allows exercise equipment like treadmills to be interactive?',
    options: [
      { id: 'a', text: 'Screens and speakers' },
      { id: 'b', text: 'Wheels and pedals' },
      { id: 'c', text: 'Remote controls' },
      { id: 'd', text: 'Virtual Reality headsets' }
    ],
    correctAnswerId: 'a',
    explanation: 'Equipment has "become interactive with screens and speakers."'
  },
  {
    id: 'mc4',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Which of the following is NOT mentioned as an outdoor fitness activity?',
    options: [
      { id: 'a', text: 'Hiking' },
      { id: 'b', text: 'Cycling' },
      { id: 'c', text: 'Swimming' },
      { id: 'd', text: 'Walking' }
    ],
    correctAnswerId: 'c',
    explanation: 'Swimming is not listed in the text; Running, cycling, walking and hiking are.'
  },
  {
    id: 'mc5',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'What benefit does the text mention for outdoor fitness?',
    options: [
      { id: 'a', text: 'No equipment needed' },
      { id: 'b', text: 'Fresh air and green healing' },
      { id: 'c', text: 'It is always free' },
      { id: 'd', text: 'You can bring your pet' }
    ],
    correctAnswerId: 'b',
    explanation: 'The text mentions "enjoying the benefits of nature with some fresh air and green healing."'
  }
];
