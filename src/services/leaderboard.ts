import { getSupabase } from './supabase';
import { 
  subscribeFirestoreLeaderboard, 
  upsertFirestoreLeaderboardEntry, 
  deleteFirestoreLeaderboardEntry,
  syncLocalEntriesToFirestore,
  saveUserScoreToLeaderboard,
  updateUserPushUpsInRealtime,
  listenToRealtimeLeaderboard,
  removeUserFromRealtimeLeaderboard,
  purgeRealtimeLeaderboardByNameOrId,
  purgeFirestoreLeaderboardByNameOrId,
  RealtimeLeaderboardItem,
  renderLeaderboardToElement
} from './firebase';
import { Category, DisciplineStats, UserRankProgress } from '../types';
import { LeaderboardEntry, LeaderboardSettings, CompetitorHabitSummary } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';

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
    const parsed = { ...DEFAULT_LEADERBOARD_SETTINGS, ...JSON.parse(raw) };
    if (parsed.customAlias && parsed.customAlias.trim().toLowerCase() === 'just') {
      parsed.customAlias = '';
    }
    return parsed;
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
      // Strictly exclude any seed/bot accounts, 'JUST', and any 'Warrior' / 'warrior-*' accounts
      return parsed.filter(entry => {
        if (!entry.userId || entry.userId.startsWith('seed-warrior-')) return false;
        const name = (entry.displayName || '').trim().toLowerCase();
        const alias = (entry.customAlias || '').trim().toLowerCase();
        const id = (entry.userId || '').trim().toLowerCase();
        if (name === 'just' || alias === 'just' || id === 'just') return false;
        if (name === 'warrior' || alias === 'warrior' || id.startsWith('warrior-')) return false;
        return true;
      });
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
 * Publish the user's current progress snapshot to Firebase Realtime Database, Firestore, and local store
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

  let resolvedName = settings.customAlias.trim() 
    || userProfile.displayName 
    || (userProfile.email ? userProfile.email.split('@')[0] : 'Warrior');

  if (resolvedName.trim().toLowerCase() === 'just') {
    resolvedName = userProfile.email ? userProfile.email.split('@')[0] : 'Warrior';
  }

  const todayKey = `discipline_pushups_${new Date().toISOString().slice(0, 10)}`;
  const dailyPushups = parseInt(localStorage.getItem(todayKey) || '0', 10);
  const allTimePushups = parseInt(localStorage.getItem('discipline_lifetime_pushups') || '0', 10);

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
    dailyPushups,
    allTimePushups,
    topHabits,
    isPublic: settings.isPublic,
    updatedAt: new Date().toISOString()
  };

  // 1. Update synchronized community storage immediately for instant UI responsiveness
  const existing = getStoredCommunityEntries();
  const existingIdx = existing.findIndex(e => e.userId === userId);
  if (existingIdx >= 0) {
    existing[existingIdx] = entry;
  } else {
    existing.push(entry);
  }
  saveCommunityEntries(existing);

  // 2. Real-Time Write to Firebase Realtime Database (leaderboard/{uid})
  try {
    await saveUserScoreToLeaderboard(userId, {
      displayName: entry.displayName,
      photoURL: entry.photoURL,
      score: entry.disciplineScore,
      rankName: entry.rankName,
      rankIndex: entry.rankIndex,
      dailyPushups: entry.dailyPushups,
      allTimePushups: entry.allTimePushups
    });
  } catch (rtdbErr) {
    console.warn('[Firebase RTDB Leaderboard] Write notice:', rtdbErr);
  }

  // 3. Real-Time Write to Firebase Firestore (discipline_leaderboard)
  try {
    await upsertFirestoreLeaderboardEntry(entry);
  } catch (fbErr) {
    console.warn('[Firebase Firestore Leaderboard] Upsert notice:', fbErr);
  }

  // 4. Upsert to Supabase if connected
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
 * Subscribe to real-time synchronized leaderboard updates across Realtime Database, Firestore, and local store
 */
export function subscribeToLeaderboard(
  currentUserId: string | null,
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  let isMounted = true;
  let remoteRTDBEntries: LeaderboardEntry[] = [];
  let rawRTDBParticipants: RealtimeLeaderboardItem[] = [];
  let remoteFirestoreEntries: LeaderboardEntry[] = [];

  const broadcastCombined = () => {
    if (!isMounted) return;
    const localEntries = getStoredCommunityEntries();
    
    // Merge: Realtime Database takes precedence for real-time scores
    const map = new Map<string, LeaderboardEntry>();

    // 1. Local baseline
    localEntries
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .forEach(e => map.set(e.userId, e));

    // 2. Firestore entries
    remoteFirestoreEntries
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .forEach(e => map.set(e.userId, e));

    // 3. Realtime Database entries (authoritative live source)
    remoteRTDBEntries
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .forEach(e => map.set(e.userId, e));

    const isJust = (e: LeaderboardEntry) => {
      const name = (e.displayName || '').trim().toLowerCase();
      const alias = (e.customAlias || '').trim().toLowerCase();
      const id = (e.userId || '').trim().toLowerCase();
      return name === 'just' || alias === 'just' || id === 'just';
    };

    const combined = Array.from(map.values()).filter(e => !isJust(e));

    // Filter public or current user entries
    const visible = combined
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .filter(e => e.isPublic || (currentUserId && e.userId === currentUserId));
    
    const sorted = sortLeaderboardEntries(visible);
    onUpdate(sorted);

    // Render directly to element with id="leaderboard-list" if present in the DOM
    if (typeof document !== 'undefined') {
      const activeListItems: RealtimeLeaderboardItem[] = sorted.map(s => ({
        uid: s.userId,
        displayName: s.displayName,
        photoURL: s.photoURL,
        score: s.disciplineScore,
        rankName: s.rankName,
        rankIndex: s.rankIndex,
        updatedAt: s.updatedAt
      }));
      renderLeaderboardToElement('leaderboard-list', activeListItems);
    }
  };

  // Sync existing local community entries to Firestore on first load
  const initialLocal = getStoredCommunityEntries();
  if (initialLocal.length > 0) {
    syncLocalEntriesToFirestore(initialLocal).catch(() => {});
  }

  // Initial broadcast from local cache
  broadcastCombined();

  // 1. Subscribe to Firebase Realtime Database onValue (live leaderboard/{uid})
  const unsubscribeRTDB = listenToRealtimeLeaderboard(
    (participants) => {
      rawRTDBParticipants = participants;
      remoteRTDBEntries = participants.map(p => {
        const rankMeta = RANK_TIERS.find(
          r => r.name.toLowerCase() === (p.rankName || '').toLowerCase() || r.index === p.rankIndex
        ) || RANK_TIERS[0];

        return {
          userId: p.uid,
          displayName: p.displayName,
          customAlias: null,
          photoURL: p.photoURL,
          rankIndex: rankMeta.index,
          rankId: rankMeta.id,
          rankName: rankMeta.name,
          tierCategory: rankMeta.tierCategory,
          qualifyingWeeks: 0,
          disciplineScore: p.score,
          weeklyCompletedChecks: Math.round((p.score / 100) * 35),
          weeklyTargetChecks: 35,
          dailyPushups: (p as any).dailyPushups ?? 0,
          allTimePushups: (p as any).allTimePushups ?? 0,
          topHabits: [],
          isPublic: true,
          updatedAt: p.updatedAt
        };
      });
      broadcastCombined();
    },
    (err) => {
      console.warn('[Firebase RTDB] Subscription notice:', err);
    }
  );

  // 2. Subscribe to Firestore collection updates
  const unsubscribeFirestore = subscribeFirestoreLeaderboard(
    (firestoreEntries) => {
      remoteFirestoreEntries = firestoreEntries;
      broadcastCombined();
    },
    (err) => {
      console.warn('[Firebase Firestore] Subscription notice:', err);
    }
  );

  // 3. Fallback query for Supabase if connected
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

  refreshSupabase();

  // Listen for local tab and cross-window events
  const handleUpdate = () => {
    if (isMounted) broadcastCombined();
  };

  window.addEventListener(LEADERBOARD_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    isMounted = false;
    unsubscribeRTDB();
    unsubscribeFirestore();
    window.removeEventListener(LEADERBOARD_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

/**
 * Completely removes an entry from Realtime Database, Firestore, and local community store
 */
export async function removeLeaderboardEntry(userId: string): Promise<void> {
  if (!userId) return;

  // 1. Remove from local community storage
  const existing = getStoredCommunityEntries();
  const filtered = existing.filter(e => e.userId !== userId);
  saveCommunityEntries(filtered);

  // 2. Remove from Firebase Realtime Database
  try {
    await removeUserFromRealtimeLeaderboard(userId);
  } catch (e) {
    console.warn('[Firebase RTDB] Delete error:', e);
  }

  // 3. Remove from Firebase Firestore
  try {
    await deleteFirestoreLeaderboardEntry(userId);
  } catch (e) {
    console.warn('[Firebase Firestore] Delete error:', e);
  }

  // 4. Remove from Supabase if connected
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('discipline_leaderboard').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('[Supabase Leaderboard] Delete entry notice:', e);
    }
  }
}

/**
 * Resets push-up counts to 0 for all participants and local storage
 */
export function resetAllPushUps(): void {
  try {
    // 1. Reset user local push-up metrics
    localStorage.setItem('discipline_lifetime_pushups', '0');
    const todayKey = `discipline_pushups_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(todayKey, '0');

    // Clear all date-based push-up keys in local storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('discipline_pushups_')) {
        localStorage.setItem(key, '0');
      }
    }

    // 2. Reset push-up fields across stored community entries
    const existing = getStoredCommunityEntries();
    const resetEntries = existing.map(e => ({
      ...e,
      dailyPushups: 0,
      allTimePushups: 0,
    }));
    saveCommunityEntries(resetEntries);

    // 3. Dispatch update event
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  } catch (err) {
    console.error('Failed to reset push-ups:', err);
  }
}

/**
 * Permanently purge a warrior by their userId or display alias (e.g. JUST)
 */
export async function purgeWarriorByNameOrId(target: string): Promise<boolean> {
  if (!target) return false;
  const cleanTarget = target.trim().toLowerCase();

  // Purge from Firebase Realtime Database and Firestore by scanning remote entries
  try {
    await Promise.allSettled([
      purgeRealtimeLeaderboardByNameOrId(cleanTarget),
      purgeFirestoreLeaderboardByNameOrId(cleanTarget),
    ]);
  } catch (e) {
    console.warn('Remote purge warning:', e);
  }

  const existing = getStoredCommunityEntries();
  const matched = existing.find(e => 
    e.userId.toLowerCase() === cleanTarget ||
    (e.displayName && e.displayName.toLowerCase() === cleanTarget) ||
    (e.customAlias && e.customAlias.toLowerCase() === cleanTarget)
  );

  if (matched) {
    await removeLeaderboardEntry(matched.userId);
  }

  // Filter out any matches by name in local storage
  const filtered = existing.filter(e => 
    e.userId.toLowerCase() !== cleanTarget &&
    (!e.displayName || e.displayName.toLowerCase() !== cleanTarget) &&
    (!e.customAlias || e.customAlias.toLowerCase() !== cleanTarget)
  );
  saveCommunityEntries(filtered);
  window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  return true;
}

// Auto-run push-up reset and removal of JUST account upon initial load
if (typeof window !== 'undefined') {
  try {
    resetAllPushUps();
    purgeWarriorByNameOrId('JUST');
  } catch (e) {
    // Non-blocking
  }
}

