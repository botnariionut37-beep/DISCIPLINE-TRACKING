/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { User, doc, getDoc, setDoc, onSnapshot, db } from '../services/firebase';
import { Category, WeeklyChecks } from '../types';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface UseCloudSyncProps {
  user: User | null;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  checks: WeeklyChecks;
  setChecks: Dispatch<SetStateAction<WeeklyChecks>>;
  bonusQualifyingWeeks: number;
  setBonusQualifyingWeeks: Dispatch<SetStateAction<number>>;
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

  const isRemoteSyncRef = useRef(false);
  const pushTimerRef = useRef<any>(null);

  // Initialize and merge data when user logs in
  useEffect(() => {
    if (!user) {
      setSyncStatus('local');
      return;
    }

    let isSubscribed = true;
    const userDocRef = doc(db, 'users', user.uid);

    async function bootstrapUserData() {
      setSyncStatus('syncing');
      try {
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          // Brand new user: upload currently loaded local data
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Warrior',
            photoURL: user.photoURL || '',
            categories,
            checks,
            bonusQualifyingWeeks,
            updatedAt: new Date().toISOString()
          });

          if (isSubscribed) {
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          }
        } else {
          // Existing document: Merge local changes into remote account
          const remoteData = snap.data();

          // Merge categories (preserve remote, append new local ones)
          const remoteCategories: Category[] = remoteData.categories || [];
          const remoteCatIds = new Set(remoteCategories.map(c => c.id));
          const localOnlyCats = categories.filter(c => !remoteCatIds.has(c.id));
          const mergedCategories = [...remoteCategories, ...localOnlyCats];

          // Merge weekly checks
          const remoteChecks: WeeklyChecks = remoteData.checks || {};
          const mergedChecks: WeeklyChecks = { ...remoteChecks };

          Object.keys(checks).forEach(wKey => {
            if (!mergedChecks[wKey]) {
              mergedChecks[wKey] = { ...checks[wKey] };
            } else {
              mergedChecks[wKey] = { ...mergedChecks[wKey] };
              Object.keys(checks[wKey] || {}).forEach(catId => {
                mergedChecks[wKey][catId] = {
                  ...(mergedChecks[wKey][catId] || {}),
                  ...(checks[wKey][catId] || {})
                };
              });
            }
          });

          // Merge bonus weeks: take max
          const mergedBonus = Math.max(remoteData.bonusQualifyingWeeks || 0, bonusQualifyingWeeks || 0);

          isRemoteSyncRef.current = true;
          setCategories(mergedCategories);
          setChecks(mergedChecks);
          setBonusQualifyingWeeks(mergedBonus);

          // Update Firestore with unified merged profile
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email || remoteData.email || '',
            displayName: user.displayName || remoteData.displayName || '',
            photoURL: user.photoURL || remoteData.photoURL || '',
            categories: mergedCategories,
            checks: mergedChecks,
            bonusQualifyingWeeks: mergedBonus,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Also mirror to localStorage so offline access stays current
          localStorage.setItem('discipline_categories', JSON.stringify(mergedCategories));
          localStorage.setItem('discipline_checks', JSON.stringify(mergedChecks));
          localStorage.setItem('discipline_bonus_weeks', String(mergedBonus));

          if (isSubscribed) {
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          }
        }
      } catch (err) {
        console.error('[CloudSync] Bootstrap error:', err);
        if (isSubscribed) setSyncStatus('error');
      }
    }

    bootstrapUserData();

    // Listen to real-time updates from other tabs or devices
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (isRemoteSyncRef.current) {
          isRemoteSyncRef.current = false;
          return;
        }

        if (data.categories) {
          setCategories(data.categories);
          localStorage.setItem('discipline_categories', JSON.stringify(data.categories));
        }
        if (data.checks) {
          setChecks(data.checks);
          localStorage.setItem('discipline_checks', JSON.stringify(data.checks));
        }
        if (typeof data.bonusQualifyingWeeks === 'number') {
          setBonusQualifyingWeeks(data.bonusQualifyingWeeks);
          localStorage.setItem('discipline_bonus_weeks', String(data.bonusQualifyingWeeks));
        }

        setLastSyncedAt(new Date());
        setSyncStatus('synced');
      }
    }, (error) => {
      console.error('[CloudSync] Snapshot error:', error);
      setSyncStatus('error');
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // Debounced push to cloud when user modifies state
  const pushToCloud = useCallback((
    updatedCategories: Category[],
    updatedChecks: WeeklyChecks,
    updatedBonus: number
  ) => {
    if (!user) return;
    setSyncStatus('syncing');

    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }

    pushTimerRef.current = setTimeout(async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        isRemoteSyncRef.current = true;
        await setDoc(userDocRef, {
          uid: user.uid,
          categories: updatedCategories,
          checks: updatedChecks,
          bonusQualifyingWeeks: updatedBonus,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (error) {
        console.error('[CloudSync] Auto-save error:', error);
        setSyncStatus('error');
      }
    }, 700);
  }, [user]);

  const forceSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        categories,
        checks,
        bonusQualifyingWeeks,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('[CloudSync] Force sync error:', err);
      setSyncStatus('error');
    }
  }, [user, categories, checks, bonusQualifyingWeeks]);

  return {
    syncStatus,
    lastSyncedAt,
    pushToCloud,
    forceSync
  };
}
