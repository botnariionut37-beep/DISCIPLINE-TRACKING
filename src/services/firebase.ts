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
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppAuthUser, setActiveUniversalSession } from './supabase';
import { isAdminEmail } from '../utils/admin';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore with specific database ID from config
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Setup Google Auth Provider configured to always prompt account chooser
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Maps a Firebase Auth user to our unified AppAuthUser interface
 */
export function mapFirebaseUserToAppUser(fbUser: FirebaseUser): AppAuthUser {
  const email = fbUser.email || '';
  const username = email ? email.split('@')[0] : `user_${fbUser.uid.slice(0, 6)}`;
  
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || (username.charAt(0).toUpperCase() + username.slice(1)),
    username: username,
    photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    isAdmin: isAdminEmail(email),
    emailVerified: fbUser.emailVerified,
    provider: 'google',
    metadata: {
      creationTime: fbUser.metadata.creationTime
    }
  };
}

/**
 * Sign in using Firebase Google OAuth Popup (sends user to accounts.google.com)
 */
export async function signInWithFirebaseGoogle(): Promise<AppAuthUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const appUser = mapFirebaseUserToAppUser(result.user);
    setActiveUniversalSession(appUser);
    return appUser;
  } catch (error: any) {
    console.error('[Firebase Auth] Google popup sign-in error:', error);
    // User closed popup or cancelled
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('Google sign-in was cancelled.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Google sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    throw error;
  }
}

/**
 * Sign out of Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth] Sign out warning:', err);
  }
}
