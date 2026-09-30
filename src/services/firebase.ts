/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Connection offline notice:', error.message);
    }
  }
}

testConnection().catch(() => {});

/**
 * Dispatches a password reset email via Firebase Authentication directly to the user's Gmail/email
 */
export async function sendFirebasePasswordReset(email: string): Promise<boolean> {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return true;
  } catch (error: any) {
    console.warn('[Firebase Auth] sendPasswordResetEmail error:', error?.code || error?.message);
    // Return false so caller can fall back if needed
    return false;
  }
}
