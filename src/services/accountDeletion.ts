/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { purgeUserFromFirebase } from './firebase';
import { removeLeaderboardEntry } from './leaderboard';
import { appDeleteAccount } from './supabase';

const DELETION_SESSION_KEY = 'discipline_pending_deletion';

export interface PendingDeletionState {
  uid: string;
  email: string;
  code: string;
  token: string;
  expiresAt: number;
}

export interface RequestDeletionResult {
  email: string;
  code: string;
  token: string;
  expiresAt: number;
  directGmailUrl: string;
}

/**
 * Generates a 6-digit confirmation code and sends an email notification to the user's Gmail
 */
export async function requestDeletionCode(email: string, uid: string): Promise<RequestDeletionResult> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  const pending: PendingDeletionState = {
    uid,
    email: cleanEmail,
    code,
    token,
    expiresAt
  };

  try {
    sessionStorage.setItem(DELETION_SESSION_KEY, JSON.stringify(pending));
  } catch {
    // Session storage fallback
  }

  // Dispatch to backend API route if available
  try {
    await fetch('/api/send-deletion-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code,
        token,
        uid
      })
    });
  } catch (err) {
    console.warn('[Account Deletion] Backend notification notice:', err);
  }

  const directGmailUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent('Discipline Arena Account Deletion ' + code)}`;

  return {
    email: cleanEmail,
    code,
    token,
    expiresAt,
    directGmailUrl
  };
}

/**
 * Gets currently pending deletion request if still valid
 */
export function getPendingDeletion(): PendingDeletionState | null {
  try {
    const raw = sessionStorage.getItem(DELETION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDeletionState;
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(DELETION_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears pending deletion session
 */
export function clearPendingDeletion(): void {
  try {
    sessionStorage.removeItem(DELETION_SESSION_KEY);
  } catch {}
}

/**
 * Verifies code and completely purges account across Realtime Database, Firestore, Auth, and local cache
 */
export async function verifyAndExecuteCompletePurge(
  uid: string,
  enteredCodeOrToken: string
): Promise<{ success: boolean; message: string }> {
  const pending = getPendingDeletion();

  if (!pending) {
    throw new Error('No pending account deletion request found or verification has expired. Please request a new code.');
  }

  if (pending.uid !== uid) {
    throw new Error('Unauthorized verification attempt for this account.');
  }

  if (Date.now() > pending.expiresAt) {
    clearPendingDeletion();
    throw new Error('Verification code has expired (15-minute limit). Please request a new code.');
  }

  const cleanInput = enteredCodeOrToken.trim();
  const isValidCode = cleanInput === pending.code;
  const isValidToken = cleanInput === pending.token;

  if (!isValidCode && !isValidToken) {
    throw new Error('Invalid verification code. Please check your Gmail or copy the code from the preview.');
  }

  // 1. Completely purge from Firebase Realtime Database (leaderboard/{uid}), Firestore, and Firebase Auth
  await purgeUserFromFirebase(uid);

  // 2. Remove from global leaderboard service & trigger real-time updates everywhere
  await removeLeaderboardEntry(uid);

  // 3. Clear universal stored account credentials and sessions
  await appDeleteAccount(uid);

  // 4. Wipe local user data caches
  try {
    localStorage.removeItem(`discipline_user_data_${uid}`);
    localStorage.removeItem('weeklyChecks');
    localStorage.removeItem('userRankProgress');
    localStorage.removeItem('DISCIPLINE_TRACKER_LEADERBOARD_SETTINGS');
    clearPendingDeletion();
  } catch (err) {
    console.warn('Local storage purge notice:', err);
  }

  // 5. Notify the rest of the application
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('discipline_leaderboard_updated'));
    window.dispatchEvent(new CustomEvent('account_completely_purged'));
  }

  return {
    success: true,
    message: 'Your account, leaderboard rank, and all stored progress have been permanently erased.'
  };
}
