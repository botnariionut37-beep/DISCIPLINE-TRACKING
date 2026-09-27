/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RankDefinition, RankId, UserRankProgress, WeeklyChecks, Category, DAYS_OF_WEEK } from '../types';
import { getWeekKey } from './date';

export const DISCIPLINE_RATE_PROMOTION_THRESHOLD = 80; // 80% or more discipline rate required (+1 score)
export const DISCIPLINE_RATE_DOWNGRADE_THRESHOLD = 50; // Less than 50% discipline rate in one week downgrades score by 1 (-1 score)

export const RANK_TIERS: RankDefinition[] = [
  {
    id: 'bronz',
    index: 0,
    name: 'Bronz',
    tierCategory: 'Novice',
    title: 'Initiate of Daily Will',
    quote: 'The journey begins at Bronze. Commit to 80% or more discipline this week to rank up.',
    requiredWeeks: 0,
    iconName: 'Shield',
    accentColor: '#CD7F32',
    bgGradient: 'from-amber-950/40 via-[#18110D] to-[#0C0E12]',
    badgeStyle: 'bg-amber-700/20 text-amber-500 border-amber-600/30',
    borderStyle: 'border-amber-700/30 hover:border-amber-600/50',
    glowColor: 'rgba(205, 127, 50, 0.25)',
    textColor: 'text-amber-500',
    perks: ['Starting Rank: Bronze', 'Target: 80%+ Weekly Discipline', 'Unlocked Daily Habit Tracker']
  },
  {
    id: 'gold',
    index: 1,
    name: 'gold',
    tierCategory: 'Prestige',
    title: 'Steadfast Practitioner',
    quote: '1 week sustained above 80% discipline. Character is forged through continuous heat.',
    requiredWeeks: 1,
    iconName: 'Award',
    accentColor: '#EAB308',
    bgGradient: 'from-yellow-950/40 via-[#19160B] to-[#0C0E12]',
    badgeStyle: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.2)]',
    borderStyle: 'border-yellow-500/30 hover:border-yellow-400/60',
    glowColor: 'rgba(234, 179, 8, 0.3)',
    textColor: 'text-yellow-400',
    perks: ['1 Week at ≥80% Discipline', 'Golden Consistency Badge', 'Habit Momentum Multiplier']
  },
  {
    id: 'platinum',
    index: 2,
    name: 'platinum',
    tierCategory: 'Prestige',
    title: 'Unshakable Guardian',
    quote: '2 weeks above 80%. Impervious to distraction, smooth as polished metal.',
    requiredWeeks: 2,
    iconName: 'Star',
    accentColor: '#E2E8F0',
    bgGradient: 'from-slate-800/40 via-[#111622] to-[#0C0E12]',
    badgeStyle: 'bg-slate-300/20 text-slate-200 border-slate-300/40 shadow-[0_0_15px_rgba(226,232,240,0.25)]',
    borderStyle: 'border-slate-300/30 hover:border-slate-200/60',
    glowColor: 'rgba(226, 232, 240, 0.35)',
    textColor: 'text-slate-200',
    perks: ['2 Weeks at ≥80% Discipline', 'Platinum Sheen Interface Badge', 'Deep Focus Multiplier']
  },
  {
    id: 'diamond',
    index: 3,
    name: 'diamond',
    tierCategory: 'Prestige',
    title: 'Crystalline Mind',
    quote: '3 weeks above 80%. Under sustained pressure, carbon transforms into diamond.',
    requiredWeeks: 3,
    iconName: 'Gem',
    accentColor: '#38BDF8',
    bgGradient: 'from-sky-950/50 via-[#0B1A24] to-[#0C0E12]',
    badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_18px_rgba(56,189,248,0.35)]',
    borderStyle: 'border-sky-400/40 hover:border-sky-300/70',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    textColor: 'text-sky-300',
    perks: ['3 Weeks at ≥80% Discipline', 'Diamond Prism Shimmer Aura', 'Unbreakable Habit Shield']
  },
  {
    id: 'advanced_1',
    index: 4,
    name: 'advanced 1',
    tierCategory: 'Advanced',
    title: 'Ascendant Vanguard I',
    quote: '4 weeks above 80%. Ordinary discipline left behind; calculated execution begins.',
    requiredWeeks: 4,
    iconName: 'Zap',
    accentColor: '#818CF8',
    bgGradient: 'from-indigo-950/50 via-[#10142B] to-[#0C0E12]',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 shadow-[0_0_16px_rgba(129,140,248,0.3)]',
    borderStyle: 'border-indigo-500/40 hover:border-indigo-400/70',
    glowColor: 'rgba(129, 140, 248, 0.4)',
    textColor: 'text-indigo-300',
    perks: ['4 Weeks at ≥80% Discipline', 'Advanced Tier Insignia', 'Streak Resilience Safeguard']
  },
  {
    id: 'advanced_2',
    index: 5,
    name: 'advanced 2',
    tierCategory: 'Advanced',
    title: 'Ascendant Vanguard II',
    quote: '5 weeks above 80%. Consistency has transformed from conscious effort into identity.',
    requiredWeeks: 5,
    iconName: 'Flame',
    accentColor: '#A855F7',
    bgGradient: 'from-purple-950/50 via-[#180E2B] to-[#0C0E12]',
    badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.35)]',
    borderStyle: 'border-purple-500/40 hover:border-purple-400/70',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    textColor: 'text-purple-300',
    perks: ['5 Weeks at ≥80% Discipline', 'Violet Resonance Glow', 'Advanced Habit Matrix']
  },
  {
    id: 'advanced_3',
    index: 6,
    name: 'advanced 3',
    tierCategory: 'Advanced',
    title: 'Ascendant Vanguard III',
    quote: '6 weeks above 80%. Standing resolute at the threshold of the Elite echelon.',
    requiredWeeks: 6,
    iconName: 'Target',
    accentColor: '#EC4899',
    bgGradient: 'from-pink-950/50 via-[#220B1C] to-[#0C0E12]',
    badgeStyle: 'bg-pink-500/20 text-pink-300 border-pink-400/50 shadow-[0_0_20px_rgba(236,72,153,0.35)]',
    borderStyle: 'border-pink-500/40 hover:border-pink-400/70',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    textColor: 'text-pink-300',
    perks: ['6 Weeks at ≥80% Discipline', 'Triple Chevron Vanguard Sigil', 'Elite Echelon Access']
  },
  {
    id: 'elite_1',
    index: 7,
    name: 'Elite 1',
    tierCategory: 'Elite',
    title: 'Elite Sovereign I',
    quote: '7 weeks above 80%. You no longer negotiate with weakness. The standard is absolute.',
    requiredWeeks: 7,
    iconName: 'Crown',
    accentColor: '#F43F5E',
    bgGradient: 'from-rose-950/60 via-[#260B12] to-[#0C0E12]',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-400/60 shadow-[0_0_22px_rgba(244,63,94,0.4)]',
    borderStyle: 'border-rose-500/50 hover:border-rose-400/80',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    textColor: 'text-rose-300',
    perks: ['7 Weeks at ≥80% Discipline', 'Elite Sovereign Crown Emblem', 'Red Crimson Radiant Border']
  },
  {
    id: 'elite_2',
    index: 8,
    name: 'Elite 2',
    tierCategory: 'Elite',
    title: 'Elite Sovereign II',
    quote: '8 weeks above 80%. What you decide in the morning is fulfilled by evening.',
    requiredWeeks: 8,
    iconName: 'Swords',
    accentColor: '#FB7185',
    bgGradient: 'from-rose-950/60 via-[#2B0E17] to-[#0C0E12]',
    badgeStyle: 'bg-rose-600/25 text-rose-200 border-rose-400/70 shadow-[0_0_24px_rgba(251,113,133,0.45)]',
    borderStyle: 'border-rose-500/50 hover:border-rose-300/80',
    glowColor: 'rgba(251, 113, 133, 0.55)',
    textColor: 'text-rose-200',
    perks: ['8 Weeks at ≥80% Discipline', 'Dual Blades of Will Emblem', 'Elite Master Streak Beacon']
  },
  {
    id: 'elite_3',
    index: 9,
    name: 'Elite 3',
    tierCategory: 'Elite',
    title: 'Elite Sovereign III',
    quote: '9 weeks above 80%. Absolute mastery over impulse through relentless repetition.',
    requiredWeeks: 9,
    iconName: 'Medal',
    accentColor: '#FF6B00',
    bgGradient: 'from-orange-950/60 via-[#2A1208] to-[#0C0E12]',
    badgeStyle: 'bg-orange-500/25 text-orange-200 border-orange-400/70 shadow-[0_0_26px_rgba(255,107,0,0.5)]',
    borderStyle: 'border-orange-500/60 hover:border-orange-300/90',
    glowColor: 'rgba(255, 107, 0, 0.6)',
    textColor: 'text-orange-300',
    perks: ['9 Weeks at ≥80% Discipline', 'Imperial Sunburst Seal', 'Pinnacle Momentum Status']
  },
  {
    id: 'elite_4',
    index: 10,
    name: 'Elite 4',
    tierCategory: 'Elite',
    title: 'Grandmaster of the Absolute',
    quote: '10 weeks above 80%. The summit is within reach. You stand at the threshold of Legend.',
    requiredWeeks: 10,
    iconName: 'Trophy',
    accentColor: '#FF0055',
    bgGradient: 'from-red-950/70 via-[#2E0B19] to-[#0C0E12]',
    badgeStyle: 'bg-red-600/30 text-white border-red-400/80 shadow-[0_0_30px_rgba(255,0,85,0.6)] animate-pulse',
    borderStyle: 'border-red-500/70 hover:border-red-300',
    glowColor: 'rgba(255, 0, 85, 0.7)',
    textColor: 'text-red-400',
    perks: ['10 Weeks at ≥80% Discipline', 'Grandmaster Sovereign Crest', 'Gateway to ELITE MAX']
  },
  {
    id: 'elite_max',
    index: 11,
    name: 'ELITE MAX',
    tierCategory: 'Apex',
    title: 'The Unstoppable Legend',
    quote: '11+ weeks above 80%. Master of oneself, conqueror of time, immortalized in discipline.',
    requiredWeeks: 11,
    iconName: 'Sparkles',
    accentColor: '#10B981',
    bgGradient: 'from-emerald-950/80 via-[#0B241B] to-[#120E22]',
    badgeStyle: 'bg-gradient-to-r from-amber-400/30 via-emerald-400/30 to-purple-400/30 text-white border-emerald-400/90 shadow-[0_0_35px_rgba(16,185,129,0.7)]',
    borderStyle: 'border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.35)]',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    textColor: 'text-emerald-300',
    perks: [
      '★ 11+ Weeks at ≥80% Discipline',
      '★ ELITE MAX Prismatic Insignia',
      '★ Uncapped Supreme Status',
      '★ Holographic Particle Aura & Crown'
    ]
  }
];

/**
 * Calculates current rank progression based on:
 * - Starting rank is Bronze (Bronz).
 * - Rank up every week where the user has achieved 80% or more discipline rate (+1 score).
 * - Downgrade by 1 score if someone has less than 50% in one week (-1 score).
 * - Safe/neutral if between 50% and 79% (score maintained).
 * - Weeks prior to account creation/first login are never evaluated.
 */
export function calculateRankProgress(
  checks: WeeklyChecks,
  categories: Category[],
  activeWeekKey: string,
  bonusQualifyingWeeks: number = 0,
  overrideRankId?: RankId | null,
  accountStartDate?: Date | string | null,
  evaluatedWeeks?: Record<string, boolean>
): UserRankProgress {
  const qualifyingWeeksList: string[] = [];
  const downgradedWeeksList: string[] = [];
  let totalChecks = 0;
  let perfectWeeks = 0;

  const totalPossiblePerWeek = categories.length * 7;
  const currentRealWeekKey = getWeekKey(new Date());

  // Determine starting week of the account
  let accountStartWeekKey: string | null = null;
  if (accountStartDate) {
    try {
      accountStartWeekKey = getWeekKey(new Date(accountStartDate));
    } catch {
      accountStartWeekKey = null;
    }
  }

  // Process all recorded weeks in checks history
  Object.keys(checks).forEach(wKey => {
    // Never penalize or evaluate weeks prior to account creation / first login
    if (accountStartWeekKey && wKey < accountStartWeekKey) {
      return;
    }

    const weekData = checks[wKey] || {};
    let weekCompleted = 0;

    categories.forEach(cat => {
      const catObj = weekData[cat.id] || {};
      DAYS_OF_WEEK.forEach(day => {
        if (catObj[day]) {
          weekCompleted++;
          totalChecks++;
        }
      });
    });

    if (totalPossiblePerWeek > 0) {
      const weekRate = Math.round((weekCompleted / totalPossiblePerWeek) * 100);

      // Promotion rule: >= 80% discipline rate adds +1 week
      if (weekRate >= DISCIPLINE_RATE_PROMOTION_THRESHOLD) {
        qualifyingWeeksList.push(wKey);
      }
      // Downgrade rule: less than 50% in one completed week downgrades score by 1 (-1)
      else if (
        weekRate < DISCIPLINE_RATE_DOWNGRADE_THRESHOLD && 
        (wKey < currentRealWeekKey || evaluatedWeeks?.[wKey])
      ) {
        downgradedWeeksList.push(wKey);
      }

      if (weekCompleted === totalPossiblePerWeek) {
        perfectWeeks++;
      }
    }
  });

  // Calculate rate for the active viewing week
  let activeWeekCompleted = 0;
  const activeWeekData = checks[activeWeekKey] || {};
  categories.forEach(cat => {
    const catObj = activeWeekData[cat.id] || {};
    DAYS_OF_WEEK.forEach(day => {
      if (catObj[day]) activeWeekCompleted++;
    });
  });

  const currentWeekRate = totalPossiblePerWeek > 0 
    ? Math.round((activeWeekCompleted / totalPossiblePerWeek) * 100) 
    : 0;

  const currentWeekQualifies = currentWeekRate >= DISCIPLINE_RATE_PROMOTION_THRESHOLD;
  const isCurrentWeekAtRisk = currentWeekRate < DISCIPLINE_RATE_DOWNGRADE_THRESHOLD;
  const currentWeekStatus: 'promotion' | 'neutral' | 'downgrade_risk' = currentWeekQualifies
    ? 'promotion'
    : (isCurrentWeekAtRisk ? 'downgrade_risk' : 'neutral');

  // Net score: gross qualifying weeks - downgraded weeks + bonus qualifying weeks
  const baseQualifyingWeeks = new Set(qualifyingWeeksList).size;
  const totalDowngradedWeeks = new Set(downgradedWeeksList).size;
  const netQualifyingWeeks = Math.max(0, baseQualifyingWeeks - totalDowngradedWeeks + bonusQualifyingWeeks);

  // If user selected an override rank, pin to that tier
  let rankIndex = 0;
  if (overrideRankId) {
    const foundIndex = RANK_TIERS.findIndex(r => r.id === overrideRankId);
    if (foundIndex >= 0) {
      rankIndex = foundIndex;
    }
  } else {
    // Ranking begins at Bronze (index 0).
    // Advances with net qualifying score (+1 for >=80%, -1 for <50%)
    rankIndex = Math.min(RANK_TIERS.length - 1, netQualifyingWeeks);
  }

  const currentRank = RANK_TIERS[rankIndex];
  const nextRank = rankIndex + 1 < RANK_TIERS.length ? RANK_TIERS[rankIndex + 1] : null;

  return {
    currentRank,
    nextRank,
    qualifyingWeeksCount: netQualifyingWeeks,
    grossQualifyingWeeksCount: baseQualifyingWeeks,
    downgradedWeeksCount: totalDowngradedWeeks,
    currentWeekRate,
    currentWeekQualifies,
    isCurrentWeekAtRisk,
    currentWeekStatus,
    qualifyingWeeksNeededForNextRank: nextRank ? 1 : 0,
    totalChecks,
    qualifyingWeeks: qualifyingWeeksList,
    downgradedWeeks: downgradedWeeksList,
    perfectWeeks
  };
}
