export enum HabitType {
  GOOD = 'GOOD',
  BAD = 'BAD'
}

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  description: string;
  frequency: number[]; // 0-6 for Mon-Sun
  dailyGoal: number;
  reminders: string[];
  color?: string;
  icon?: string;
  streak: number;
  todayCount: number;
}

export interface Log {
  id: string;
  habitId: string;
  timestamp: number; // Date.now()
  note?: string;
  status: 'completed' | 'missed' | 'skipped';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}