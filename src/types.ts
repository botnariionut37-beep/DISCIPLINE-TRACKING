/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayOfWeek = 
  | 'Monday' 
  | 'Tuesday' 
  | 'Wednesday' 
  | 'Thursday' 
  | 'Friday' 
  | 'Saturday' 
  | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon key
  color: string; // Tailwind color key prefix (emerald, indigo, rose, etc.)
  createdAt: number;
}

// Map from weekKey (e.g. "2026-W24") to CategoryId to Days checked
// e.g. { "2026-W24": { "cat-1": { "Monday": true, "Wednesday": true } } }
export interface WeeklyChecks {
  [weekKey: string]: {
    [categoryId: string]: {
      [day in DayOfWeek]?: boolean;
    };
  };
}

export interface Quote {
  text: string;
  author: string;
}

export interface DisciplineStats {
  weeklyRate: number; // overall percentage
  completedCount: number;
  totalPossibleCount: number;
  dayCompletions: Record<DayOfWeek, { completed: number; total: number; rate: number }>;
  categoryCompletions: Record<string, { completed: number; total: number; rate: number; currentStreak: number }>;
}

export type RankId = 
  | 'bronz'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'advanced_1'
  | 'advanced_2'
  | 'advanced_3'
  | 'elite_1'
  | 'elite_2'
  | 'elite_3'
  | 'elite_4'
  | 'elite_max';

export interface RankDefinition {
  id: RankId;
  index: number; // 0 to 11
  name: string; // The exact user display name: "Bronz", "gold", "platinum", "diamond", "advanced 1", "advanced 2", "advanced 3", "Elite 1", "Elite 2", "Elite 3", "Elite 4", "ELITE MAX"
  tierCategory: 'Novice' | 'Prestige' | 'Advanced' | 'Elite' | 'Apex';
  title: string; // Motivating discipline title
  quote: string;
  requiredWeeks: number; // 0 for Bronz, 1 for gold, 2 for platinum, ..., 11 for ELITE MAX (80%+ discipline rate weeks)
  iconName: string; // Lucide icon
  accentColor: string;
  bgGradient: string;
  badgeStyle: string;
  borderStyle: string;
  glowColor: string;
  textColor: string;
  perks: string[];
}

export interface UserRankProgress {
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  qualifyingWeeksCount: number; // Net score (qualifying weeks - downgraded weeks + bonus)
  grossQualifyingWeeksCount: number; // Total weeks with >= 80%
  downgradedWeeksCount: number; // Total weeks with < 50%
  currentWeekRate: number; // Live percentage of current selected week
  currentWeekQualifies: boolean; // Does current selected week hit >= 80%?
  isCurrentWeekAtRisk: boolean; // Does current week have < 50%?
  currentWeekStatus: 'promotion' | 'neutral' | 'downgrade_risk';
  qualifyingWeeksNeededForNextRank: number;
  totalChecks: number;
  qualifyingWeeks: string[]; // Keys of weeks meeting >= 80% rate
  downgradedWeeks: string[]; // Keys of weeks failing < 50% rate
  perfectWeeks: number;
}

