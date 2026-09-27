import { RankId } from '../types';

export interface CompetitorHabitSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  completed: number;
  total: number;
  rate: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  customAlias?: string | null;
  photoURL?: string | null;
  rankIndex: number;
  rankId: RankId;
  rankName: string;
  tierCategory: 'Novice' | 'Prestige' | 'Advanced' | 'Elite' | 'Apex';
  qualifyingWeeks: number;
  disciplineScore: number; // Current week completion rate (0-100)
  weeklyCompletedChecks: number;
  weeklyTargetChecks: number;
  topHabits: CompetitorHabitSummary[];
  isPublic: boolean;
  updatedAt: string;
}

export interface LeaderboardSettings {
  isPublic: boolean;
  customAlias: string;
}
