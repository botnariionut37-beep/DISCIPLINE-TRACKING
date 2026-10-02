/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  set, 
  get,
  onValue, 
  off, 
  remove 
} from 'firebase/database';
import { AppAuthUser } from './supabase';
import { isAdminEmail } from '../utils/admin';
import { LeaderboardEntry } from '../types/leaderboard';

// User's provided Firebase configuration with Realtime Database URL
export const firebaseConfig = {
  apiKey: "AIzaSyBAL9byDh4uQnytmwppCmMZw9AP6Z_fIa4",
  authDomain: "discipline-90780.firebaseapp.com",
  databaseURL: "https://discipline-90780-default-rtdb.firebaseio.com",
  projectId: "discipline-90780",
  storageBucket: "discipline-90780.firebasestorage.app",
  messagingSenderId: "662687015133",
  appId: "1:662687015133:web:fc53771c6f7b23674cbb34",
  measurementId: "G-CBZL9NXFH7"
};

// Initialize Firebase App idempotently
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);

export interface RealtimeLeaderboardItem {
  uid: string;
  displayName: string;
  photoURL: string | null;
  score: number;
  rankName: string;
  rankIndex?: number;
  dailyPushups?: number;
  allTimePushups?: number;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.warn('[Firestore Error]', JSON.stringify(errInfo));
  return errInfo;
}

// Validate connection to Firestore on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

/**
 * Sign in with Google using Firebase Auth popup flow
 */
export async function signInWithGooglePopup(): Promise<AppAuthUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const username = fbUser.email ? fbUser.email.split('@')[0] : 'warrior';

    const appUser: AppAuthUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || username,
      username,
      photoURL: fbUser.photoURL || null,
      isAdmin: isAdminEmail(fbUser.email || ''),
      emailVerified: fbUser.emailVerified,
      provider: 'google',
      metadata: {
        creationTime: fbUser.metadata.creationTime
      }
    };

    return appUser;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up window was blocked by your browser. Please allow popups for this site and try again.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign in cancelled. Pop-up was closed before completing authentication.');
    }
    throw error;
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth] Sign-out warning:', err);
  }
}

// =========================================================================
// FIREBASE REALTIME DATABASE LIVE LEADERBOARD (leaderboard/{uid})
// =========================================================================

/**
 * Save or update the logged-in user's score to leaderboard/{uid} in Firebase Realtime Database
 */
export async function saveUserScoreToLeaderboard(
  uid: string,
  data: {
    displayName: string;
    photoURL?: string | null;
    score: number;
    rankName?: string;
    rankIndex?: number;
    dailyPushups?: number;
    allTimePushups?: number;
  }
): Promise<void> {
  if (!uid) return;
  const userRef = ref(rtdb, `leaderboard/${uid}`);
  await set(userRef, {
    displayName: data.displayName || 'Anonymous',
    photoURL: data.photoURL || null,
    score: Number(data.score) || 0,
    rankName: data.rankName || 'Bronz',
    rankIndex: Number(data.rankIndex) || 1,
    dailyPushups: Number(data.dailyPushups) || 0,
    allTimePushups: Number(data.allTimePushups) || 0,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Instantly update push-ups in RTDB and Firestore
 */
export async function updateUserPushUpsInRealtime(
  uid: string,
  dailyPushups: number,
  allTimePushups: number
): Promise<void> {
  if (!uid) return;
  try {
    const dailyRef = ref(rtdb, `leaderboard/${uid}/dailyPushups`);
    const allTimeRef = ref(rtdb, `leaderboard/${uid}/allTimePushups`);
    const updatedRef = ref(rtdb, `leaderboard/${uid}/updatedAt`);
    await Promise.allSettled([
      set(dailyRef, Number(dailyPushups) || 0),
      set(allTimeRef, Number(allTimePushups) || 0),
      set(updatedRef, new Date().toISOString())
    ]);
  } catch (err) {
    console.warn('[Firebase RTDB] Push-up sync notice:', err);
  }

  try {
    const docRef = doc(db, 'discipline_leaderboard', uid);
    await setDoc(docRef, {
      dailyPushups: Number(dailyPushups) || 0,
      allTimePushups: Number(allTimePushups) || 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase Firestore] Push-up sync notice:', err);
  }
}

/**
 * Real-time function using onValue to fetch all participants from Firebase Realtime Database,
 * sort them by score in descending order, and invoke the onUpdate callback.
 */
export function listenToRealtimeLeaderboard(
  onUpdate: (participants: RealtimeLeaderboardItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const leaderboardRef = ref(rtdb, 'leaderboard');

  const callback = (snapshot: any) => {
    const participants: RealtimeLeaderboardItem[] = [];
    const val = snapshot.val();
    if (val && typeof val === 'object') {
      Object.entries(val).forEach(([uid, item]: [string, any]) => {
        if (item && typeof item === 'object') {
          const name = (item.displayName || '').trim().toLowerCase();
          const alias = (item.customAlias || '').trim().toLowerCase();
          const uidLower = uid.toLowerCase();

          // Permanently purge any 'JUST' or placeholder 'Warrior' or 'warrior-*' accounts
          if (
            name === 'just' || alias === 'just' || uidLower === 'just' ||
            name === 'warrior' || alias === 'warrior' || uidLower.startsWith('warrior-')
          ) {
            removeUserFromRealtimeLeaderboard(uid).catch(() => {});
            deleteFirestoreLeaderboardEntry(uid).catch(() => {});
            return;
          }

          participants.push({
            uid,
            displayName: item.displayName || 'Anonymous',
            photoURL: item.photoURL || null,
            score: typeof item.score === 'number' ? item.score : Number(item.score) || 0,
            rankName: item.rankName || 'Bronz',
            rankIndex: Number(item.rankIndex) || 1,
            dailyPushups: Number(item.dailyPushups) || 0,
            allTimePushups: Number(item.allTimePushups) || 0,
            updatedAt: item.updatedAt || new Date().toISOString()
          });
        }
      });
    }

    // Sort by score descending
    participants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.displayName.localeCompare(b.displayName);
    });

    onUpdate(participants);
  };

  onValue(leaderboardRef, callback, (error) => {
    console.warn('[Firebase RTDB] onValue error:', error);
    if (onError) onError(error);
  });

  return () => {
    off(leaderboardRef, 'value', callback);
  };
}

/**
 * Remove an entry from Firebase Realtime Database leaderboard/{uid}
 */
export async function removeUserFromRealtimeLeaderboard(uid: string): Promise<void> {
  if (!uid) return;
  const userRef = ref(rtdb, `leaderboard/${uid}`);
  await remove(userRef);
}

/**
 * Display participants in an HTML element with id='leaderboard-list'
 * (showing profile pictures, names, ranks, and points, or "No participants yet" if empty).
 */
export function renderLeaderboardToElement(
  elementId: string = 'leaderboard-list',
  participants: RealtimeLeaderboardItem[]
) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!participants || participants.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center">
        <div class="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-500 mb-2">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p class="text-sm font-sans font-medium text-gray-300">No participants yet</p>
        <p class="text-xs text-gray-500 mt-1">Sign in with Gmail to log your score and claim the top rank!</p>
      </div>
    `;
    return;
  }

  const itemsHtml = participants
    .map((p, index) => {
      const rank = index + 1;
      const avatar = p.photoURL
        ? `<img src="${p.photoURL}" alt="${p.displayName}" class="w-9 h-9 rounded-full object-cover border border-emerald-500/40 shrink-0" />`
        : `<div class="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/30 shrink-0">${(p.displayName || 'W')[0].toUpperCase()}</div>`;

      const rankBadge =
        rank === 1
          ? '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold">#1 👑</span>'
          : rank === 2
          ? '<span class="px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/30 text-[11px] font-mono font-bold">#2 🥈</span>'
          : rank === 3
          ? '<span class="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 text-[11px] font-mono font-bold">#3 🥉</span>'
          : `<span class="text-xs font-mono text-gray-500 pl-1">#${rank}</span>`;

      return `
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-[#12161F] hover:bg-[#161B26] border border-white/5 transition-all duration-150 gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 shrink-0 flex items-center justify-center">${rankBadge}</div>
            ${avatar}
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-sans font-bold text-white truncate">${p.displayName}</p>
              </div>
              <p class="text-[11px] font-mono text-gray-400 truncate">${p.rankName}</p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-base font-mono font-bold text-emerald-400 tabular-nums">${p.score}%</span>
            <p class="text-[9px] font-mono text-gray-500 tracking-wider">SCORE</p>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `<div class="space-y-2">${itemsHtml}</div>`;
}

// =========================================================================
// FIRESTORE COMPATIBILITY FUNCTIONS
// =========================================================================

/**
 * Subscribe in real time to the discipline_leaderboard Firestore collection
 */
export function subscribeFirestoreLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const collectionRef = collection(db, 'discipline_leaderboard');

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.userId && !d.userId.startsWith('seed-warrior-')) {
          const name = (d.displayName || '').trim().toLowerCase();
          const alias = (d.customAlias || '').trim().toLowerCase();
          const docIdLower = docSnap.id.toLowerCase();
          const userIdLower = (d.userId || '').toLowerCase();

          // Permanently purge any 'JUST' or placeholder 'Warrior' or 'warrior-*' accounts
          if (
            name === 'just' || alias === 'just' || docIdLower === 'just' || userIdLower === 'just' ||
            name === 'warrior' || alias === 'warrior' || docIdLower.startsWith('warrior-') || userIdLower.startsWith('warrior-')
          ) {
            deleteDoc(docSnap.ref).catch(() => {});
            removeUserFromRealtimeLeaderboard(docSnap.id).catch(() => {});
            return;
          }

          entries.push({
            userId: d.userId,
            displayName: d.displayName || 'Anonymous',
            customAlias: d.customAlias ?? null,
            photoURL: d.photoURL ?? null,
            rankIndex: Number(d.rankIndex) || 1,
            rankId: d.rankId || 'bronz',
            rankName: d.rankName || 'Bronz',
            tierCategory: d.tierCategory || 'Foundation',
            qualifyingWeeks: Number(d.qualifyingWeeks) || 0,
            disciplineScore: Number(d.disciplineScore) || 0,
            weeklyCompletedChecks: Number(d.weeklyCompletedChecks) || 0,
            weeklyTargetChecks: Number(d.weeklyTargetChecks) || 35,
            dailyPushups: Number(d.dailyPushups) || 0,
            allTimePushups: Number(d.allTimePushups) || 0,
            topHabits: Array.isArray(d.topHabits) ? d.topHabits : [],
            isPublic: d.isPublic !== false,
            updatedAt: d.updatedAt || new Date().toISOString()
          });
        }
      });
      onUpdate(entries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'discipline_leaderboard');
      if (onError) onError(error);
    }
  );
}

/**
 * Upsert leaderboard entry in Firestore
 */
export async function upsertFirestoreLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
  if (!entry.userId) return;
  const path = `discipline_leaderboard/${entry.userId}`;

  try {
    const docRef = doc(db, 'discipline_leaderboard', entry.userId);
    await setDoc(docRef, {
      userId: entry.userId,
      displayName: entry.displayName,
      customAlias: entry.customAlias ?? null,
      photoURL: entry.photoURL ?? null,
      rankIndex: entry.rankIndex,
      rankId: entry.rankId,
      rankName: entry.rankName,
      tierCategory: entry.tierCategory,
      qualifyingWeeks: entry.qualifyingWeeks,
      disciplineScore: entry.disciplineScore,
      weeklyCompletedChecks: entry.weeklyCompletedChecks,
      weeklyTargetChecks: entry.weeklyTargetChecks,
      topHabits: entry.topHabits || [],
      isPublic: entry.isPublic,
      updatedAt: entry.updatedAt || new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove an entry from Firestore discipline_leaderboard
 */
export async function deleteFirestoreLeaderboardEntry(userId: string): Promise<void> {
  if (!userId) return;
  const path = `discipline_leaderboard/${userId}`;

  try {
    const docRef = doc(db, 'discipline_leaderboard', userId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sync and upload existing local community records to Firestore
 */
export async function syncLocalEntriesToFirestore(localEntries: LeaderboardEntry[]): Promise<void> {
  if (!Array.isArray(localEntries) || localEntries.length === 0) return;

  for (const entry of localEntries) {
    if (entry.userId && !entry.userId.startsWith('seed-warrior-')) {
      try {
        await upsertFirestoreLeaderboardEntry(entry);
      } catch (err) {
        // Continue with other entries if one fails
      }
    }
  }
}

/**
 * Fetch personal habit progress from Firestore
 */
export async function fetchFirestoreUserData(userId: string): Promise<any | null> {
  if (!userId) return null;
  const path = `discipline_user_data/${userId}`;

  try {
    const docRef = doc(db, 'discipline_user_data', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Save personal habit progress to Firestore in real time
 */
export async function saveFirestoreUserData(userId: string, data: any): Promise<void> {
  if (!userId) return;
  const path = `discipline_user_data/${userId}`;

  try {
    const docRef = doc(db, 'discipline_user_data', userId);
    await setDoc(docRef, {
      userId,
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Permanently purge user data from Firebase Realtime Database, Firestore collections, and Auth
 */
export async function purgeUserFromFirebase(userId: string): Promise<void> {
  if (!userId) return;

  // 1. Purge from Firebase Realtime Database (leaderboard/{uid})
  try {
    await removeUserFromRealtimeLeaderboard(userId);
    console.log('[Firebase RTDB] Purged user from realtime leaderboard:', userId);
  } catch (err) {
    console.warn('[Firebase RTDB] Purge leaderboard notice:', err);
  }

  // 2. Purge from Firestore (discipline_leaderboard and discipline_user_data)
  try {
    await deleteFirestoreLeaderboardEntry(userId);
  } catch (err) {
    console.warn('[Firebase Firestore] Delete leaderboard document notice:', err);
  }

  try {
    const userDataRef = doc(db, 'discipline_user_data', userId);
    await deleteDoc(userDataRef);
    console.log('[Firebase Firestore] Purged user data document:', userId);
  } catch (err) {
    console.warn('[Firebase Firestore] Delete user data document notice:', err);
  }

  // 3. Delete Firebase Auth account if the signed-in user matches
  try {
    if (auth.currentUser && auth.currentUser.uid === userId) {
      await auth.currentUser.delete();
      console.log('[Firebase Auth] Current user account deleted from Firebase Auth');
    }
  } catch (authErr: any) {
    console.warn('[Firebase Auth] User delete notice (may require recent login):', authErr);
    try {
      await firebaseSignOut(auth);
    } catch {}
  }
}

/**
 * Scan RTDB and delete any participant where uid, displayName, or customAlias matches target
 */
export async function purgeRealtimeLeaderboardByNameOrId(target: string): Promise<void> {
  if (!target) return;
  const clean = target.trim().toLowerCase();
  try {
    const leaderboardRef = ref(rtdb, 'leaderboard');
    const snap = await get(leaderboardRef);
    if (snap.exists()) {
      const data = snap.val();
      if (data && typeof data === 'object') {
        const promises: Promise<any>[] = [];
        for (const [uid, item] of Object.entries<any>(data)) {
          const name = (item?.displayName || '').trim().toLowerCase();
          const alias = (item?.customAlias || '').trim().toLowerCase();
          const uidLower = uid.toLowerCase();
          if (
            uidLower === clean || name === clean || alias === clean ||
            (clean === 'warrior' && (uidLower.startsWith('warrior-') || name === 'warrior' || alias === 'warrior'))
          ) {
            promises.push(remove(ref(rtdb, `leaderboard/${uid}`)));
            promises.push(deleteFirestoreLeaderboardEntry(uid));
          }
        }
        await Promise.allSettled(promises);
      }
    }
  } catch (err) {
    console.warn('[Firebase RTDB] purgeRealtimeLeaderboardByNameOrId notice:', err);
  }
}

/**
 * Scan Firestore and delete any document where id, displayName, or customAlias matches target
 */
export async function purgeFirestoreLeaderboardByNameOrId(target: string): Promise<void> {
  if (!target) return;
  const clean = target.trim().toLowerCase();
  try {
    const colRef = collection(db, 'discipline_leaderboard');
    const snap = await getDocs(colRef);
    const promises: Promise<any>[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const name = (d?.displayName || '').trim().toLowerCase();
      const alias = (d?.customAlias || '').trim().toLowerCase();
      const docIdLower = docSnap.id.toLowerCase();
      if (
        docIdLower === clean || name === clean || alias === clean ||
        (clean === 'warrior' && (docIdLower.startsWith('warrior-') || name === 'warrior' || alias === 'warrior'))
      ) {
        promises.push(deleteDoc(docSnap.ref));
        promises.push(removeUserFromRealtimeLeaderboard(docSnap.id));
      }
    });
    await Promise.allSettled(promises);
  } catch (err) {
    console.warn('[Firebase Firestore] purgeFirestoreLeaderboardByNameOrId notice:', err);
  }
}

