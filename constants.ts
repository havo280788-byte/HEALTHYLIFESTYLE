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

export const STAGE_ICONS = ["🌱", "🥗", "💧", "🏃", "💪", "🧠", "🌙", "🚴", "❤️", "🏆"];

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
  // 1. Many people think it is less expensive to exercise in their homes.
  {
    id: 'tf1',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Many people think it is less expensive to exercise in their homes.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
      { id: 'ds', text: "Doesn't Say" }
    ],
    correctAnswerId: 'true',
    explanation: 'The text says: "75% of people asked say it is easier, cheaper and more convenient to exercise at home."'
  },
  // 2. Mini-workouts last from _________.
  {
    id: 'mc1',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Mini-workouts last from _______.',
    options: [
      { id: 'a', text: '5 to 10 minutes' },
      { id: 'b', text: '15 to 20 minutes' },
      { id: 'c', text: '30 to 45 minutes' },
      { id: 'd', text: '60 to 90 minutes' }
    ],
    correctAnswerId: 'a',
    explanation: 'The text states: "Mini-workouts of 5 to 10 minutes spread out during the day are also a great way to exercise while busy at home."'
  },
  // 3. Home gyms need a lot of space.
  {
    id: 'tf2',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Home gyms need a lot of space.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
      { id: 'ds', text: "Doesn't Say" }
    ],
    correctAnswerId: 'false',
    explanation: 'The text states: "All you need is a mat, light weights and some space," implying minimal space is sufficient.'
  },
  // 4. The latest fitness _________ is apps on our smart watches, laptops and computers.
  {
    id: 'mc3',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'The latest fitness _______ is apps on our smart watches, laptops and computers.',
    options: [
      { id: 'a', text: 'routine' },
      { id: 'b', text: 'habit' },
      { id: 'c', text: 'craze' },
      { id: 'd', text: 'schedule' }
    ],
    correctAnswerId: 'c',
    explanation: 'The text mentions: "Fitness applications on our mobiles, smart watches and computers are the latest craze."'
  },
  // 5. Most fitness apps are downloaded on mobile phones.
  {
    id: 'tf3',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Most fitness apps are downloaded on mobile phones.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
      { id: 'ds', text: "Doesn't Say" }
    ],
    correctAnswerId: 'ds',
    explanation: 'The text mentions apps on mobiles, smart watches, and computers are a craze, but does not specify that "most" are downloaded on phones.'
  },
  // 6. Some fitness apps also offer healthy _________ tips.
  {
    id: 'mc2',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Some fitness apps also offer healthy _______tips.',
    options: [
      { id: 'a', text: 'exercise programmes' },
      { id: 'b', text: 'diet advice and wellness' },
      { id: 'c', text: 'outdoor activities' },
      { id: 'd', text: 'fitness equipment' }
    ],
    correctAnswerId: 'b',
    explanation: 'According to the text: "They offer a variety of workouts as well as healthy diet advice and wellness tips."'
  },
  // 7. Smart fitness mirrors are like _________ that teach exercises.
  {
    id: 'mc4',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Smart fitness mirrors are like _______ that teach exercises.',
    options: [
      { id: 'a', text: 'gym members' },
      { id: 'b', text: 'fitness students' },
      { id: 'c', text: 'personal trainers' },
      { id: 'd', text: 'office workers' }
    ],
    correctAnswerId: 'c',
    explanation: 'The text explains: "Smart fitness mirrors, acting as personal trainers, provide a variety of exercise programmes..."'
  },
  // 8. You can't take exercise classes with a smart fitness mirror.
  {
    id: 'tf4',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'You can’t take exercise classes with a smart fitness mirror.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
      { id: 'ds', text: "Doesn't Say" }
    ],
    correctAnswerId: 'false',
    explanation: 'The text says smart fitness mirrors "provide a variety of exercise programmes from boxing to Pilates."'
  },
  // 9. Outdoor fitness classes don't have equipment.
  {
    id: 'tf5',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Outdoor fitness classes don’t have equipment.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
      { id: 'ds', text: "Doesn't Say" }
    ],
    correctAnswerId: 'ds',
    explanation: 'The text mentions outdoor classes but doesn\'t specify whether they have equipment or not.'
  },
  // 10. Fresh air is one of the _________ of exercising outside.
  {
    id: 'mc5',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Fresh air is one of the _______ of exercising outside.',
    options: [
      { id: 'a', text: 'plans' },
      { id: 'b', text: 'rewards' },
      { id: 'c', text: 'benefits' },
      { id: 'd', text: 'workouts' }
    ],
    correctAnswerId: 'c',
    explanation: 'The text refers to "enjoying the benefits of nature with some fresh air and green healing."'
  }
];

export const SOUND_EFFECTS = {
  correct: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // Ding
  incorrect: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3', // Error/Buzz
  click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3', // Pop/Click
};
