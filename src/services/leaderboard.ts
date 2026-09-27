import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import { Category, DisciplineStats, UserRankProgress } from '../types';
import { LeaderboardEntry, LeaderboardSettings, CompetitorHabitSummary } from '../types/leaderboard';

const SETTINGS_KEY = 'DISCIPLINE_TRACKER_LEADERBOARD_SETTINGS';

export const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  isPublic: true,
  customAlias: ''
};

export function getLocalLeaderboardSettings(): LeaderboardSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_LEADERBOARD_SETTINGS;
    return { ...DEFAULT_LEADERBOARD_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LEADERBOARD_SETTINGS;
  }
}

export function saveLocalLeaderboardSettings(settings: LeaderboardSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save leaderboard settings', err);
  }
}

/**
 * Publish the user's current progress snapshot to the public leaderboard collection
 */
export async function publishLeaderboardSnapshot(
  userId: string,
  userProfile: { displayName?: string | null; email?: string | null; photoURL?: string | null },
  rankProgress: UserRankProgress,
  stats: DisciplineStats,
  categories: Category[],
  settings: LeaderboardSettings
): Promise<void> {
  if (!db || !userId) return;

  // Extract top habit category summaries
  const topHabits: CompetitorHabitSummary[] = categories.slice(0, 5).map(cat => {
    const catStat = stats.categoryCompletions[cat.id];
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      completed: catStat?.completed ?? 0,
      total: catStat?.total ?? 7,
      rate: catStat?.rate ?? 0
    };
  });

  const resolvedName = settings.customAlias.trim() 
    || userProfile.displayName 
    || (userProfile.email ? userProfile.email.split('@')[0] : 'Warrior');

  const entry: LeaderboardEntry = {
    userId,
    displayName: resolvedName,
    customAlias: settings.customAlias.trim() || null,
    photoURL: userProfile.photoURL || null,
    rankIndex: rankProgress.currentRank.index,
    rankId: rankProgress.currentRank.id,
    rankName: rankProgress.currentRank.name,
    tierCategory: rankProgress.currentRank.tierCategory,
    qualifyingWeeks: rankProgress.qualifyingWeeksCount,
    disciplineScore: Math.round(stats.weeklyRate),
    weeklyCompletedChecks: stats.completedCount,
    weeklyTargetChecks: stats.totalPossibleCount,
    topHabits,
    isPublic: settings.isPublic,
    updatedAt: new Date().toISOString()
  };

  try {
    const leaderDocRef = doc(db, 'leaderboard', userId);
    await setDoc(leaderDocRef, entry, { merge: true });
  } catch (error) {
    console.error('Failed to publish leaderboard snapshot:', error);
  }
}

/**
 * Subscribe to real-time community leaderboard updates for registered accounts only
 */
export function subscribeToLeaderboard(
  currentUserId: string | null,
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'leaderboard'), where('isPublic', '==', true));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const realEntries: LeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          // Ensure only valid registered entries with a userId are ranked
          if (data && data.userId) {
            realEntries.push(data);
          }
        });

        // Sort by Rank Tier (descending), then Qualifying Weeks, then Discipline Score, then completed checks
        realEntries.sort((a, b) => {
          if (b.rankIndex !== a.rankIndex) {
            return b.rankIndex - a.rankIndex;
          }
          if (b.qualifyingWeeks !== a.qualifyingWeeks) {
            return b.qualifyingWeeks - a.qualifyingWeeks;
          }
          if (b.disciplineScore !== a.disciplineScore) {
            return b.disciplineScore - a.disciplineScore;
          }
          return b.weeklyCompletedChecks - a.weeklyCompletedChecks;
        });

        onUpdate(realEntries);
      },
      (error) => {
        console.warn('Leaderboard real-time listener error:', error);
        onUpdate([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize leaderboard subscription:', err);
    onUpdate([]);
    return () => {};
  }
}

