import { getSupabase } from './supabase';
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

function getStoredCommunityEntries(): LeaderboardEntry[] {
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

function saveCommunityEntries(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(COMMUNITY_LEADERBOARD_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  } catch (err) {
    console.error('Failed to save community entries', err);
  }
}

function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
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
 * Publish the user's current progress snapshot to the public Supabase & synchronized leaderboard
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

  const sb = getSupabase();
  if (sb) {
    try {
      // 1. Direct authoritative save to Supabase table discipline_leaderboard (not localStorage)
      const { error } = await sb.from('discipline_leaderboard').upsert({
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
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('[Supabase Leaderboard] Table upsert error:', error.message);
      }
    } catch (e) {
      console.error('[Supabase Leaderboard] Table upsert exception:', e);
    }
  } else {
    // Fallback to local storage only if Supabase is not configured
    const existing = getStoredCommunityEntries();
    const existingIdx = existing.findIndex(e => e.userId === userId);
    if (existingIdx >= 0) {
      existing[existingIdx] = entry;
    } else {
      existing.push(entry);
    }
    saveCommunityEntries(existing);
  }

  // Notify active listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  }
}

/**
 * Subscribe to synchronized leaderboard updates across Supabase with Realtime WebSocket support.
 * Fetches all users from Supabase table discipline_leaderboard ordered descending by discipline_score.
 */
export function subscribeToLeaderboard(
  currentUserId: string | null,
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  let isMounted = true;
  let realtimeChannel: any = null;

  const refreshEntries = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        // Interogare directă în Supabase care aduce scorurile tuturor utilizatorilor ordonate descrescător
        const { data, error } = await sb
          .from('discipline_leaderboard')
          .select('*')
          .order('discipline_score', { ascending: false })
          .order('qualifying_weeks', { ascending: false });

        if (error) {
          console.error('[Supabase Leaderboard] Query error:', error.message);
        } else if (Array.isArray(data)) {
          const remoteMapped: LeaderboardEntry[] = data
            .filter((d: any) => d.user_id && !d.user_id.startsWith('seed-warrior-'))
            .map((d: any) => ({
              userId: d.user_id,
              displayName: d.custom_alias || d.display_name || 'Warrior',
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
              isPublic: d.is_public !== false,
              updatedAt: d.updated_at || new Date().toISOString()
            }));

          if (isMounted) {
            // Filtrăm dacă este public sau este utilizatorul curent
            const visible = remoteMapped.filter(
              e => e.isPublic || (currentUserId && e.userId === currentUserId)
            );
            const sorted = sortLeaderboardEntries(visible);
            onUpdate(sorted);
            return;
          }
        }
      } catch (err) {
        console.warn('[Supabase Leaderboard] Remote query error, checking local fallback:', err);
      }
    }

    // Fallback local dacă Supabase nu este configurat
    if (!isMounted) return;
    const combined = getStoredCommunityEntries();
    const visible = combined
      .filter(e => e.userId && !e.userId.startsWith('seed-warrior-'))
      .filter(e => e.isPublic || (currentUserId && e.userId === currentUserId));
    const sorted = sortLeaderboardEntries(visible);
    onUpdate(sorted);
  };

  // Initial load
  refreshEntries();

  // Abonare la Supabase Realtime pentru actualizări instant între toate dispozitivele
  const sb = getSupabase();
  if (sb) {
    try {
      realtimeChannel = sb
        .channel('discipline_leaderboard_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'discipline_leaderboard'
          },
          () => {
            if (isMounted) {
              refreshEntries();
            }
          }
        )
        .subscribe();
    } catch (rtErr) {
      console.warn('[Supabase Leaderboard] Realtime channel setup notice:', rtErr);
    }
  }

  // Listen for local and cross-tab updates
  const handleUpdate = () => {
    if (isMounted) refreshEntries();
  };

  window.addEventListener(LEADERBOARD_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  // Periodic refresh every 5 seconds ca rezervă pentru sincronizare continuă
  const interval = setInterval(refreshEntries, 5000);

  return () => {
    isMounted = false;
    window.removeEventListener(LEADERBOARD_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
    clearInterval(interval);
    if (realtimeChannel && sb) {
      try {
        sb.removeChannel(realtimeChannel);
      } catch {}
    }
  };
}

/**
 * Completely removes an entry from Supabase leaderboard table and local community store
 */
export async function removeLeaderboardEntry(userId: string): Promise<void> {
  if (!userId) return;

  // 1. Remove from Supabase if connected
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('discipline_leaderboard').delete().eq('user_id', userId);
      if (error) {
        console.error('[Supabase Leaderboard] Delete error:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase Leaderboard] Delete entry notice:', e);
    }
  }

  // 2. Remove from local community storage
  const existing = getStoredCommunityEntries();
  const filtered = existing.filter(e => e.userId !== userId);
  saveCommunityEntries(filtered);

  // 3. Dispatch update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADERBOARD_EVENT));
  }
}



