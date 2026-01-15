export enum HabitType {
  GOOD = 'GOOD',
  BAD = 'BAD'
}

export interface Habit {
  id: string;
  user_id?: string;
  name: string;
  type: HabitType;
  description: string;
  frequency: number[]; // 0-6 for Mon-Sun
  daily_goal: number;
  reminders: string[];
  color?: string;
  icon?: string;
  streak: number;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  // Computed fields (not in DB)
  todayCount?: number;
  thisWeekDays?: number;
}

export interface Log {
  id: string;
  habit_id: string;
  user_id?: string;
  timestamp: string; // ISO string
  created_at?: string;
  note?: string;
  status: 'completed' | 'missed' | 'skipped';
}

export interface ChatMessage {
  id: string;
  user_id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO string
  created_at?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
}
