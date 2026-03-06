export interface GameItem {
  id: string;
  text: string;
  target: 'mind' | 'body';
}

export interface DragDropContent {
  activities: GameItem[];
  reasons: GameItem[];
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
  answers?: Record<string, boolean>; // for compatibility
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
  LEADERBOARD = 'LEADERBOARD',
  STUDENT_REVIEW = 'STUDENT_REVIEW',
  TEACHER_PLAYING = 'TEACHER_PLAYING',
  TEACHER_REVIEW = 'TEACHER_REVIEW'
}
