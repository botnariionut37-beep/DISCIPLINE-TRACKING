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
import { AppAuthUser } from './supabase';
import { isAdminEmail } from '../utils/admin';
import { LeaderboardEntry } from '../types/leaderboard';

// User's provided Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBAL9byDh4uQnytmwppCmMZw9AP6Z_fIa4",
  authDomain: "discipline-90780.firebaseapp.com",
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
    // If popup was blocked or closed by user, rethrow with friendly message
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

/**
 * Subscribe in real time to the discipline_leaderboard collection
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
          entries.push({
            userId: d.userId,
            displayName: d.displayName || 'Warrior',
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
 * Real-time write: Upsert leaderboard entry in Firestore
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
