import { getSupabase } from './supabase';
import { 
  subscribeFirestoreLeaderboard, 
  upsertFirestoreLeaderboardEntry, 
  deleteFirestoreLeaderboardEntry,
  syncLocalEntriesToFirestore 
} from './firebase';
import { Category, DisciplineStats, UserRankProgress } from '../types';
import { LeaderboardEntry, LeaderboardSettings, CompetitorHabitSummary } from '../types/leaderboard';

const SETTINGS_KEY = 'DISCIPLINE_TRACKER_LEADERBOARD_SETTINGS';
const COMMUNITY_LEADERBOARD_KEY = 'discipline_community_leaderboard';
const LEADERBOARD_EVENT = 'discipline_leaderboard_updated';

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
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  } catch (err) {
    console.error('Failed to save leaderboard settings', err);
  }
}

export function getStoredCommunityEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(COMMUNITY_LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (Array.isArray(parsed)) {
      // Strictly exclude any seed/bot accounts
      return parsed.filter(entry => entry.userId && !entry.userId.startsWith('seed-warrior-'));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCommunityEntries(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(COMMUNITY_LEADERBOARD_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  } catch (err) {
    console.error('Failed to save community entries', err);
  }
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Rank Tier index (higher rank first)
    if (b.rankIndex !== a.rankIndex) {
      return b.rankIndex - a.rankIndex;
    }
    // 2. Qualifying weeks (stars / seniority)
    if (b.qualifyingWeeks !== a.qualifyingWeeks) {
      return b.qualifyingWeeks - a.qualifyingWeeks;
    }
    // 3. Discipline Score (weekly rate %)
    if (b.disciplineScore !== a.disciplineScore) {
      return b.disciplineScore - a.disciplineScore;
    }
    // 4. Completed checks count
    return b.weeklyCompletedChecks - a.weeklyCompletedChecks;
  });
}

/**
 * Publish the user's current progress snapshot to Firestore, Supabase, and synchronized local store
 */
export async function publishLeaderboardSnapshot(
  userId: string,
  userProfile: { displayName?: string | null; email?: string | null; photoURL?: string | null },
  rankProgress: UserRankProgress,
  stats: DisciplineStats,
  categories: Category[],
  settings: LeaderboardSettings
): Promise<void> {
  if (!userId) return;

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

  // 1. Update synchronized community storage immediately for instant UI
  const existing = getStoredCommunityEntries();
  const existingIdx = existing.findIndex(e => e.userId === userId);
  if (existingIdx >= 0) {
    existing[existingIdx] = entry;
  } else {
    existing.push(entry);
  }
  saveCommunityEntries(existing);

  // 2. Real-Time Write to Firebase Firestore (discipline_leaderboard)
  try {
    await upsertFirestoreLeaderboardEntry(entry);
  } catch (fbErr) {
    console.warn('[Firebase Leaderboard] Upsert notice:', fbErr);
  }

  // 3. Upsert to Supabase if connected
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('discipline_leaderboard').upsert({
        user_id: entry.userId,
        display_name: entry.displayName,
        custom_alias: entry.customAlias,
        photo_url: entry.photoURL,
        rank_index: entry.rankIndex,
        rank_id: entry.rankId,
        rank_name: entry.rankName,
        tier_category: entry.tierCategory,
        qualifying_weeks: entry.qualifyingWeeks,
        discipline_score: entry.disciplineScore,
        weekly_completed_checks: entry.weeklyCompletedChecks,
        weekly_target_checks: entry.weeklyTargetChecks,
        top_habits: entry.topHabits,
        is_public: entry.isPublic,
        updated_at: entry.updatedAt
      });
    } catch (e) {
      console.warn('[Supabase Leaderboard] Table upsert skipped:', e);
    }
  }
}

/**
 * Subscribe to real-time synchronized leaderboard updates across Firestore, local storage, and Supabase
 */
export function subscribeToLeaderboard(
  currentUserId: string | null,
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  let isMounted = true;
  let remoteFirestoreEntries: LeaderboardEntry[] = [];

  const broadcastCombined = () => {
    if (!isMounted) return;
    const localEntries = getStoredCommunityEntries();
    
    // Merge Firestore entries with local entries (Firestore takes precedence for freshness)
    const map = new Map<string, LeaderboardEntry>();
    localEntries
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .forEach(e => map.set(e.userId, e));

    remoteFirestoreEntries
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .forEach(e => map.set(e.userId, e));

    const combined = Array.from(map.values());

    // Filter public or current user entries
    const visible = combined
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .filter(e => e.isPublic || (currentUserId && e.userId === currentUserId));
    
    const sorted = sortLeaderboardEntries(visible);
    onUpdate(sorted);
  };

  // Sync existing local community entries to Firestore on first load so no entries are lost
  const initialLocal = getStoredCommunityEntries();
  if (initialLocal.length > 0) {
    syncLocalEntriesToFirestore(initialLocal).catch(() => {});
  }

  // Initial broadcast from local cache
  broadcastCombined();

  // 1. Subscribe to real-time Firestore collection updates
  const unsubscribeFirestore = subscribeFirestoreLeaderboard(
    (firestoreEntries) => {
      remoteFirestoreEntries = firestoreEntries;
      broadcastCombined();
    },
    (err) => {
      console.warn('[Firebase Leaderboard] Snapshot fallback to polling:', err);
    }
  );

  // 2. Fallback query for Supabase if connected
  const refreshSupabase = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('discipline_leaderboard')
          .select('*')
          .eq('is_public', true);

        if (!error && Array.isArray(data) && data.length > 0) {
          const remoteMapped: LeaderboardEntry[] = data.map((d: any) => ({
            userId: d.user_id,
            displayName: d.display_name || 'Warrior',
            customAlias: d.custom_alias,
            photoURL: d.photo_url,
            rankIndex: Number(d.rank_index) || 1,
            rankId: d.rank_id || 'bronz',
            rankName: d.rank_name || 'Bronz',
            tierCategory: d.tier_category || 'Foundation',
            qualifyingWeeks: Number(d.qualifying_weeks) || 0,
            disciplineScore: Number(d.discipline_score) || 0,
            weeklyCompletedChecks: Number(d.weekly_completed_checks) || 0,
            weeklyTargetChecks: Number(d.weekly_target_checks) || 35,
            topHabits: d.top_habits || [],
            isPublic: Boolean(d.is_public),
            updatedAt: d.updated_at || new Date().toISOString()
          }));

          const localExisting = getStoredCommunityEntries();
          const map = new Map<string, LeaderboardEntry>();
          localExisting.forEach(e => map.set(e.userId, e));
          remoteMapped.forEach(e => map.set(e.userId, e));
          saveCommunityEntries(Array.from(map.values()));
          broadcastCombined();
        }
      } catch (err) {
        // Fallback silently
      }
    }
  };

  // Initial Supabase check
  refreshSupabase();

  // Listen for local tab and cross-window events
  const handleUpdate = () => {
    if (isMounted) broadcastCombined();
  };

  window.addEventListener(LEADERBOARD_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    isMounted = false;
    unsubscribeFirestore();
    window.removeEventListener(LEADERBOARD_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

/**
 * Completely removes an entry from Firestore, local community store, and Supabase
 */
export async function removeLeaderboardEntry(userId: string): Promise<void> {
  if (!userId) return;

  // 1. Remove from local community storage
  const existing = getStoredCommunityEntries();
  const filtered = existing.filter(e => e.userId !== userId);
  saveCommunityEntries(filtered);

  // 2. Remove from Firebase Firestore
  try {
    await deleteFirestoreLeaderboardEntry(userId);
  } catch (e) {
    console.warn('[Firebase Leaderboard] Delete error:', e);
  }

  // 3. Remove from Supabase if connected
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('discipline_leaderboard').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('[Supabase Leaderboard] Delete entry notice:', e);
    }
  }
}
