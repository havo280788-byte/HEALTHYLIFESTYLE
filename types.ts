export enum QuestionType {
  TRUE_FALSE = 'TRUE_FALSE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options: Option[];
  correctAnswerId: string;
  explanation: string;
}

export interface User {
  name: string;
  className: string;
}

export interface LeaderboardEntry {
  name: string;
  className: string;
  score: number;
  timeSpent: number; // in seconds
  timestamp: number;
}

export interface GameSettings {
  apiKey: string;
  model: string;
}

export enum AppState {
  LOGIN = 'LOGIN',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  LEADERBOARD = 'LEADERBOARD'
}
