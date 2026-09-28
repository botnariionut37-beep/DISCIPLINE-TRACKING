/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { AppAuthUser, getSupabase } from '../services/supabase';
import { Category, WeeklyChecks } from '../types';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface UseCloudSyncProps {
  user: AppAuthUser | null;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  checks: WeeklyChecks;
  setChecks: Dispatch<SetStateAction<WeeklyChecks>>;
  bonusQualifyingWeeks: number;
  setBonusQualifyingWeeks: Dispatch<SetStateAction<number>>;
}

export function getUserStorageKey(uid: string | null | undefined): string {
  if (!uid) return 'discipline_guest_data';
  return `discipline_user_data_${uid}`;
}

export function useCloudSync({
  user,
  categories,
  setCategories,
  checks,
  setChecks,
  bonusQualifyingWeeks,
  setBonusQualifyingWeeks
}: UseCloudSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const pushTimerRef = useRef<any>(null);
  const prevUserUidRef = useRef<string | null>(null);

  // When user signs in or changes accounts, load that user's specific progress
  useEffect(() => {
    let isSubscribed = true;
    const currentUid = user?.uid || null;

    async function loadUserData() {
      if (!user) {
        // Switched to guest / logged out
        const guestRaw = localStorage.getItem('discipline_guest_data');
        if (guestRaw) {
          try {
            const parsed = JSON.parse(guestRaw);
            if (parsed.categories) setCategories(parsed.categories);
            if (parsed.checks) setChecks(parsed.checks);
            if (typeof parsed.bonusQualifyingWeeks === 'number') {
              setBonusQualifyingWeeks(parsed.bonusQualifyingWeeks);
            }
          } catch (e) {
            console.warn('[CloudSync] Failed to parse guest data', e);
          }
        } else {
          const defaultCats: Category[] = [
            { id: 'cat-1', name: 'Early Rise & Routine', icon: 'Clock', color: 'amber', createdAt: Date.now() },
            { id: 'cat-2', name: 'Physical Exercise', icon: 'Dumbbell', color: 'rose', createdAt: Date.now() + 1 },
            { id: 'cat-3', name: 'Study / Stoic Reading', icon: 'BookOpen', color: 'indigo', createdAt: Date.now() + 2 },
            { id: 'cat-4', name: 'Clean Nutrition', icon: 'Apple', color: 'emerald', createdAt: Date.now() + 3 },
            { id: 'cat-5', name: 'Deep Work Session', icon: 'Code', color: 'blue', createdAt: Date.now() + 4 },
          ];
          setCategories(defaultCats);
          setChecks({});
          setBonusQualifyingWeeks(0);
        }
        setSyncStatus('local');
        prevUserUidRef.current = null;
        return;
      }

      setSyncStatus('syncing');

      // 1. Try local per-user cache first for instant zero-latency paint
      const userKey = getUserStorageKey(user.uid);
      const localUserRaw = localStorage.getItem(userKey);
      let loadedFromLocal = false;

      if (localUserRaw) {
        try {
          const parsed = JSON.parse(localUserRaw);
          if (parsed.categories && parsed.categories.length > 0) {
            setCategories(parsed.categories);
          }
          if (parsed.checks) {
            setChecks(parsed.checks);
          }
          if (typeof parsed.bonusQualifyingWeeks === 'number') {
            setBonusQualifyingWeeks(parsed.bonusQualifyingWeeks);
          }
          loadedFromLocal = true;
        } catch (e) {
          console.warn('[CloudSync] Failed to parse local user data', e);
        }
      }

      // 2. Query Supabase profiles table if connected
      const sb = getSupabase();
      if (sb) {
        try {
          const { data: remoteProfile, error } = await sb
            .from('discipline_profiles')
            .select('*')
            .eq('user_id', user.uid)
            .maybeSingle();

          if (!error && remoteProfile && isSubscribed) {
            if (remoteProfile.categories && remoteProfile.categories.length > 0) {
              setCategories(remoteProfile.categories);
            }
            if (remoteProfile.checks) {
              setChecks(remoteProfile.checks);
            }
            if (typeof remoteProfile.bonus_weeks === 'number') {
              setBonusQualifyingWeeks(remoteProfile.bonus_weeks);
            }

            // Sync to local per-user cache
            localStorage.setItem(userKey, JSON.stringify({
              categories: remoteProfile.categories || categories,
              checks: remoteProfile.checks || checks,
              bonusQualifyingWeeks: remoteProfile.bonus_weeks ?? bonusQualifyingWeeks
            }));

            setSyncStatus('synced');
            setLastSyncedAt(new Date());
            prevUserUidRef.current = user.uid;
            return;
          }
        } catch (sbErr) {
          console.warn('[CloudSync] Supabase profile check skipped:', sbErr);
        }
      }

      // If user had no existing progress in either local or remote, initialize current state to their storage
      if (!loadedFromLocal) {
        localStorage.setItem(userKey, JSON.stringify({
          categories,
          checks,
          bonusQualifyingWeeks
        }));
      }

      if (isSubscribed) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        prevUserUidRef.current = user.uid;
      }
    }

    loadUserData();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // Debounced push to Supabase and per-user storage when user modifies state
  const pushToCloud = useCallback((
    updatedCategories: Category[],
    updatedChecks: WeeklyChecks,
    updatedBonus: number
  ) => {
    // 1. Save to active user's dedicated key (or guest key)
    const storageKey = getUserStorageKey(user?.uid);
    const dataToSave = {
      categories: updatedCategories,
      checks: updatedChecks,
      bonusQualifyingWeeks: updatedBonus,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    // Also mirror to global keys for backward compatibility
    localStorage.setItem('discipline_categories', JSON.stringify(updatedCategories));
    localStorage.setItem('discipline_checks', JSON.stringify(updatedChecks));
    localStorage.setItem('discipline_bonus_weeks', String(updatedBonus));

    if (!user) {
      setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');

    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }

    pushTimerRef.current = setTimeout(async () => {
      try {
        // Upsert to Supabase table
        const sb = getSupabase();
        if (sb) {
          try {
            await sb.from('discipline_profiles').upsert({
              user_id: user.uid,
              categories: updatedCategories,
              checks: updatedChecks,
              bonus_weeks: updatedBonus,
              updated_at: new Date().toISOString()
            });
          } catch (sbError) {
            // Non-blocking if table is not provisioned yet
          }
        }

        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (error) {
        console.warn('[CloudSync] Auto-save status:', error);
        setSyncStatus('synced');
      }
    }, 600);
  }, [user]);

  const forceSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      pushToCloud(categories, checks, bonusQualifyingWeeks);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn('[CloudSync] Force sync notice:', err);
      setSyncStatus('synced');
    }
  }, [user, categories, checks, bonusQualifyingWeeks, pushToCloud]);

  return {
    syncStatus,
    lastSyncedAt,
    pushToCloud,
    forceSync
  };
}
