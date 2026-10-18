/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, saveUserScoreToLeaderboard, upsertFirestoreLeaderboardEntry } from './firebase';
import { Category, WeeklyChecks, DAYS_OF_WEEK } from '../types';
import { calculateRankProgress } from '../utils/ranks';
import { getCurrentWeekKey } from '../utils/date';
import { LeaderboardEntry } from '../types/leaderboard';
import { getStoredCommunityEntries, saveCommunityEntries } from './leaderboard';
import { getUserStorageKey } from '../hooks/useCloudSync';

export interface WarriorDataPayload {
  categories: Category[];
  checks: WeeklyChecks;
  bonusQualifyingWeeks: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Early Rise & Routine', icon: 'Clock', color: 'amber', createdAt: 1 },
  { id: 'cat-2', name: 'Physical Exercise', icon: 'Dumbbell', color: 'rose', createdAt: 2 },
  { id: 'cat-3', name: 'Study / Stoic Reading', icon: 'BookOpen', color: 'indigo', createdAt: 3 },
  { id: 'cat-4', name: 'Clean Nutrition', icon: 'Apple', color: 'emerald', createdAt: 4 },
  { id: 'cat-5', name: 'Deep Work Session', icon: 'Code', color: 'blue', createdAt: 5 },
];

/**
 * Fetch a warrior's full habit tracking data (categories, checks, bonus weeks)
 * from Firestore or local user storage cache
 */
export async function fetchWarriorHabitData(userId: string): Promise<WarriorDataPayload> {
  if (!userId) {
    return { categories: DEFAULT_CATEGORIES, checks: {}, bonusQualifyingWeeks: 0 };
  }

  // 1. Try local cache first for instant zero-latency paint
  const storageKey = getUserStorageKey(userId);
  let cached: WarriorDataPayload | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.categories && parsed.categories.length > 0) {
        cached = {
          categories: parsed.categories,
          checks: parsed.checks || {},
          bonusQualifyingWeeks: typeof parsed.bonusQualifyingWeeks === 'number' ? parsed.bonusQualifyingWeeks : 0,
        };
      }
    }
  } catch (e) {
    // Ignore cache parse error
  }

  // 2. Fetch remote document from Firestore
  try {
    const docRef = doc(db, 'discipline_user_data', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const payload: WarriorDataPayload = {
        categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : (cached?.categories || DEFAULT_CATEGORIES),
        checks: (data.checks && typeof data.checks === 'object') ? data.checks : (cached?.checks || {}),
        bonusQualifyingWeeks: typeof data.bonusQualifyingWeeks === 'number' ? data.bonusQualifyingWeeks : (cached?.bonusQualifyingWeeks || 0),
      };

      // Cache locally
      localStorage.setItem(storageKey, JSON.stringify(payload));
      return payload;
    }
  } catch (err) {
    console.warn('[AdminService] Could not fetch remote user data:', err);
  }

  if (cached) return cached;
  return { categories: DEFAULT_CATEGORIES, checks: {}, bonusQualifyingWeeks: 0 };
}

/**
 * Save updated habit data for a warrior and synchronize to cloud
 */
export async function saveWarriorHabitData(
  userId: string,
  payload: WarriorDataPayload,
  warriorMeta?: Partial<LeaderboardEntry>
): Promise<void> {
  if (!userId) return;

  const storageKey = getUserStorageKey(userId);
  localStorage.setItem(storageKey, JSON.stringify(payload));

  // 1. Write to Firestore discipline_user_data/{userId}
  try {
    const docRef = doc(db, 'discipline_user_data', userId);
    await setDoc(docRef, {
      userId,
      categories: payload.categories,
      checks: payload.checks,
      bonusQualifyingWeeks: payload.bonusQualifyingWeeks,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[AdminService] Error saving to Firestore discipline_user_data:', err);
  }

  // 2. Recalculate metrics for current week and lifetime score
  const currentRealWeekKey = getCurrentWeekKey();
  const rankProgress = calculateRankProgress(
    payload.checks,
    payload.categories,
    currentRealWeekKey,
    payload.bonusQualifyingWeeks
  );

  const currentWeekData = payload.checks[currentRealWeekKey] || {};
  let weeklyCompleted = 0;
  payload.categories.forEach(cat => {
    const catChecks = currentWeekData[cat.id] || {};
    DAYS_OF_WEEK.forEach(day => {
      if (catChecks[day]) weeklyCompleted++;
    });
  });

  const totalPossible = payload.categories.length * 7;
  const disciplineScore = totalPossible > 0 ? Math.round((weeklyCompleted / totalPossible) * 100) : 0;

  const topHabits = payload.categories.map(cat => {
    const catChecks = currentWeekData[cat.id] || {};
    const completed = DAYS_OF_WEEK.filter(d => catChecks[d]).length;
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      completed,
      total: 7,
      rate: Math.round((completed / 7) * 100),
    };
  });

  // 3. Update Community Leaderboard Entry
  const existingEntries = getStoredCommunityEntries();
  const existing = existingEntries.find(e => e.userId === userId);

  const updatedEntry: LeaderboardEntry = {
    userId,
    displayName: warriorMeta?.displayName || existing?.displayName || 'Competitor',
    customAlias: warriorMeta?.customAlias ?? existing?.customAlias ?? null,
    photoURL: warriorMeta?.photoURL || existing?.photoURL || null,
    rankIndex: rankProgress.currentRank.index,
    rankId: rankProgress.currentRank.id,
    rankName: rankProgress.currentRank.name,
    tierCategory: rankProgress.currentRank.tierCategory,
    qualifyingWeeks: rankProgress.qualifyingWeeksCount,
    disciplineScore,
    weeklyCompletedChecks: weeklyCompleted,
    weeklyTargetChecks: totalPossible,
    dailyPushups: existing?.dailyPushups || 0,
    allTimePushups: existing?.allTimePushups || 0,
    topHabits,
    isPublic: true,
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = existingEntries.findIndex(e => e.userId === userId);
  if (existingIdx >= 0) {
    existingEntries[existingIdx] = updatedEntry;
  } else {
    existingEntries.push(updatedEntry);
  }
  saveCommunityEntries(existingEntries);

  // 4. Push updated score to Firebase RTDB and Firestore
  try {
    await saveUserScoreToLeaderboard(userId, {
      displayName: updatedEntry.displayName,
      photoURL: updatedEntry.photoURL,
      score: updatedEntry.disciplineScore,
      rankName: updatedEntry.rankName,
      rankIndex: updatedEntry.rankIndex,
      dailyPushups: updatedEntry.dailyPushups,
      allTimePushups: updatedEntry.allTimePushups,
    });
  } catch (e) {
    console.warn('[AdminService] RTDB score update notice:', e);
  }

  try {
    await upsertFirestoreLeaderboardEntry(updatedEntry);
  } catch (e) {
    console.warn('[AdminService] Firestore leaderboard upsert notice:', e);
  }

  // 5. Notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('discipline_leaderboard_updated'));
  }
}
