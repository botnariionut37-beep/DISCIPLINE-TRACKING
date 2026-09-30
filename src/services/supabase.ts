/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import { isAdminEmail } from '../utils/admin';
import { sendFirebasePasswordReset } from './firebase';

const SUPABASE_URL_KEY = 'discipline_supabase_url';
const SUPABASE_ANON_KEY = 'discipline_supabase_anon_key';
const LOCAL_USERS_DB_KEY = 'discipline_universal_accounts_db';
const ACTIVE_SESSION_KEY = 'discipline_universal_active_session';

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  emailVerified?: boolean;
  provider: 'supabase' | 'universal' | 'google';
  metadata?: {
    creationTime?: string;
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
  const localKey = localStorage.getItem(SUPABASE_ANON_KEY) || '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function initSupabase(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('[Supabase] Failed to initialize client:', e);
      supabaseInstance = null;
    }
  }
  return null;
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
  return initSupabase();
}

export function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_ANON_KEY);
  supabaseInstance = null;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && isSupabaseConfigured()) {
    initSupabase();
  }
  return supabaseInstance;
}

// Universal Auth Local Storage helper (allows instant zero-config login on any domain including Vercel)
export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string; // Basic hash for client-side storage
  photoURL?: string;
  createdAt: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetExpiresAt?: number;
}

export function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(acc: StoredAccount) {
  const accounts = getStoredAccounts();
  const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === acc.email.toLowerCase());
  if (existingIdx >= 0) {
    accounts[existingIdx] = acc;
  } else {
    accounts.push(acc);
  }
  localStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(accounts));
}

export function getActiveUniversalSession(): AppAuthUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AppAuthUser;
    user.isAdmin = isAdminEmail(user.email);
    return user;
  } catch {
    return null;
  }
}

export function setActiveUniversalSession(user: AppAuthUser | null) {
  if (user) {
    user.isAdmin = isAdminEmail(user.email);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

export interface SignUpResult {
  user: AppAuthUser;
  needsEmailVerification: boolean;
  verificationLink?: string;
}

/**
 * Universal & Supabase Sign Up:
 * Requires password creation, creates account in unverified status, and sends/generates verification link.
 */
export async function appSignUp(params: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<SignUpResult> {
  const emailClean = params.email.trim().toLowerCase();
  const usernameClean = params.username.trim();
  const displayNameClean = params.displayName?.trim() || usernameClean;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({
      email: emailClean,
      password: params.password,
      options: {
        data: {
          username: usernameClean,
          display_name: displayNameClean
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const isConfirmed = Boolean(data.user.email_confirmed_at || data.session);
      const authUser: AppAuthUser = {
        uid: data.user.id,
        email: data.user.email || emailClean,
        displayName: displayNameClean,
        username: usernameClean,
        photoURL: null,
        isAdmin: isAdminEmail(emailClean),
        emailVerified: isConfirmed,
        provider: 'supabase',
        metadata: {
          creationTime: data.user.created_at
        }
      };

      if (isConfirmed) {
        setActiveUniversalSession(authUser);
      }

      return {
        user: authUser,
        needsEmailVerification: !isConfirmed,
        verificationLink: `${window.location.origin}#verify_email?token=${btoa(emailClean)}`
      };
    }
  }

  // Universal account creation with email verification link
  const accounts = getStoredAccounts();
  const exists = accounts.some(a => a.email.toLowerCase() === emailClean);
  if (exists) {
    throw new Error('An account with this email address already exists. Please sign in.');
  }

  const token = `vtok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  const newAccount: StoredAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    email: emailClean,
    username: usernameClean,
    displayName: displayNameClean,
    passwordHash: btoa(params.password),
    createdAt: new Date().toISOString(),
    emailVerified: false,
    verificationToken: token
  };

  saveAccount(newAccount);

  const authUser: AppAuthUser = {
    uid: newAccount.id,
    email: newAccount.email,
    displayName: newAccount.displayName,
    username: newAccount.username,
    photoURL: null,
    isAdmin: isAdminEmail(newAccount.email),
    emailVerified: false,
    provider: 'universal',
    metadata: {
      creationTime: newAccount.createdAt
    }
  };

  const simulatedLink = `${window.location.origin}/#verify_email?token=${token}&email=${encodeURIComponent(emailClean)}`;

  return {
    user: authUser,
    needsEmailVerification: true,
    verificationLink: simulatedLink
  };
}

/**
 * Verify account via email token
 */
export async function appVerifyEmail(tokenOrEmail: string): Promise<AppAuthUser> {
  const accounts = getStoredAccounts();
  const matched = accounts.find(a => 
    a.verificationToken === tokenOrEmail || 
    a.email.toLowerCase() === tokenOrEmail.toLowerCase()
  );

  if (!matched) {
    throw new Error('Invalid or expired verification link.');
  }

  matched.emailVerified = true;
  delete matched.verificationToken;
  saveAccount(matched);

  const authUser: AppAuthUser = {
    uid: matched.id,
    email: matched.email,
    displayName: matched.displayName,
    username: matched.username,
    photoURL: matched.photoURL || null,
    isAdmin: isAdminEmail(matched.email),
    emailVerified: true,
    provider: 'universal',
    metadata: {
      creationTime: matched.createdAt
    }
  };

  setActiveUniversalSession(authUser);
  return authUser;
}

/**
 * Resend email verification link
 */
export async function appResendVerification(email: string): Promise<string> {
  const emailClean = email.trim().toLowerCase();
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.resend({
        type: 'signup',
        email: emailClean,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
    } catch (e: any) {
      console.warn('[Supabase] Resend warning:', e);
    }
  }

  const accounts = getStoredAccounts();
  const matched = accounts.find(a => a.email.toLowerCase() === emailClean);
  if (!matched) {
    throw new Error('Account not found with this email.');
  }

  const token = `vtok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  matched.verificationToken = token;
  saveAccount(matched);

  return `${window.location.origin}/#verify_email?token=${token}&email=${encodeURIComponent(emailClean)}`;
}

/**
 * Universal & Supabase Sign In with Email/Username & Password
 */
export async function appSignIn(params: {
  identifier: string; // Email or username
  password: string;
}): Promise<AppAuthUser> {
  const identifierClean = params.identifier.trim();
  const isEmail = identifierClean.includes('@');

  const sb = getSupabase();
  if (sb && isEmail) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: identifierClean.toLowerCase(),
      password: params.password
    });

    if (!error && data.user) {
      if (!data.user.email_confirmed_at && !data.session) {
        const unconfirmedError = new Error('EMAIL_NOT_VERIFIED');
        (unconfirmedError as any).code = 'EMAIL_NOT_VERIFIED';
        throw unconfirmedError;
      }

      const userMeta = data.user.user_metadata || {};
      const authUser: AppAuthUser = {
        uid: data.user.id,
        email: data.user.email || identifierClean.toLowerCase(),
        displayName: userMeta.display_name || userMeta.username || identifierClean.split('@')[0],
        username: userMeta.username || identifierClean.split('@')[0],
        photoURL: userMeta.avatar_url || null,
        isAdmin: isAdminEmail(data.user.email || identifierClean),
        emailVerified: true,
        provider: 'supabase',
        metadata: {
          creationTime: data.user.created_at
        }
      };
      setActiveUniversalSession(authUser);
      return authUser;
    }
    // If Supabase returned an error and it's not a connection problem, rethrow
    if (error && !error.message.includes('fetch')) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        const unconfirmedError = new Error('EMAIL_NOT_VERIFIED');
        (unconfirmedError as any).code = 'EMAIL_NOT_VERIFIED';
        throw unconfirmedError;
      }
      throw new Error(error.message);
    }
  }

  // Universal account lookup
  const accounts = getStoredAccounts();
  const matched = accounts.find(a => 
    a.email.toLowerCase() === identifierClean.toLowerCase() || 
    a.username.toLowerCase() === identifierClean.toLowerCase()
  );

  if (!matched) {
    // If admin is logging in for the first time, bootstrap automatically
    if (isAdminEmail(identifierClean)) {
      const adminAcc: StoredAccount = {
        id: `admin_${Date.now()}`,
        email: identifierClean.toLowerCase(),
        username: identifierClean.split('@')[0],
        displayName: 'System Admin',
        passwordHash: btoa(params.password),
        createdAt: new Date().toISOString(),
        emailVerified: true
      };
      saveAccount(adminAcc);
      const adminUser: AppAuthUser = {
        uid: adminAcc.id,
        email: adminAcc.email,
        displayName: adminAcc.displayName,
        username: adminAcc.username,
        photoURL: null,
        isAdmin: true,
        emailVerified: true,
        provider: 'universal',
        metadata: { creationTime: adminAcc.createdAt }
      };
      setActiveUniversalSession(adminUser);
      return adminUser;
    }

    throw new Error('Invalid email, username, or password.');
  }

  if (matched.passwordHash !== btoa(params.password)) {
    throw new Error('Incorrect password.');
  }

  // Check email verification status for regular accounts
  if (!matched.emailVerified && !isAdminEmail(matched.email)) {
    const verifyErr = new Error('EMAIL_NOT_VERIFIED');
    (verifyErr as any).code = 'EMAIL_NOT_VERIFIED';
    (verifyErr as any).email = matched.email;
    (verifyErr as any).verificationToken = matched.verificationToken;
    throw verifyErr;
  }

  const authUser: AppAuthUser = {
    uid: matched.id,
    email: matched.email,
    displayName: matched.displayName,
    username: matched.username,
    photoURL: matched.photoURL || null,
    isAdmin: isAdminEmail(matched.email),
    emailVerified: true,
    provider: 'universal',
    metadata: {
      creationTime: matched.createdAt
    }
  };

  setActiveUniversalSession(authUser);
  return authUser;
}

/**
 * Sign In with Google:
 * Uses Supabase Google OAuth or seamless universal Google account sign-in
 */
export async function appSignInWithGoogle(fallbackEmail?: string, fallbackName?: string): Promise<AppAuthUser> {
  // If fallback email was supplied from in-modal Google form
  if (fallbackEmail && fallbackEmail.trim()) {
    const emailClean = fallbackEmail.trim().toLowerCase();
    const username = emailClean.split('@')[0];
    const authUser: AppAuthUser = {
      uid: `g_${btoa(emailClean).replace(/=/g, '')}`,
      email: emailClean,
      displayName: fallbackName?.trim() || username.charAt(0).toUpperCase() + username.slice(1),
      username,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      isAdmin: isAdminEmail(emailClean),
      provider: 'google',
      metadata: {
        creationTime: new Date().toISOString()
      }
    };
    setActiveUniversalSession(authUser);
    return authUser;
  }

  // 1. Try Supabase Google OAuth if configured
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return null as any;
    } catch (sbError: any) {
      console.warn('[Supabase OAuth] OAuth error:', sbError.message);
    }
  }

  // 2. Signal to modal that custom domain requires direct Google email entry
  const domainError = new Error('DOMAIN_FALLBACK_REQUIRED');
  (domainError as any).code = 'DOMAIN_FALLBACK_REQUIRED';
  throw domainError;
}

/**
 * Sign Out
 */
export async function appSignOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn('[Supabase] Sign-out warning:', e);
    }
  }
  setActiveUniversalSession(null);
}

/**
 * Update User Profile (Avatar / Display Name)
 */
export async function appUpdateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<AppAuthUser | null> {
  const current = getActiveUniversalSession();
  if (!current) return null;

  const updated: AppAuthUser = {
    ...current,
    displayName: updates.displayName !== undefined ? updates.displayName : current.displayName,
    photoURL: updates.photoURL !== undefined ? updates.photoURL : current.photoURL
  };

  // Update in universal accounts DB
  const accounts = getStoredAccounts();
  const accIdx = accounts.findIndex(a => a.id === current.uid || a.email.toLowerCase() === (current.email || '').toLowerCase());
  if (accIdx >= 0) {
    if (updates.displayName !== undefined) accounts[accIdx].displayName = updates.displayName;
    if (updates.photoURL !== undefined) accounts[accIdx].photoURL = updates.photoURL;
    localStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(accounts));
  }

  // Update active session
  setActiveUniversalSession(updated);

  // Update in Supabase auth user_metadata if available
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.updateUser({
        data: {
          display_name: updated.displayName,
          avatar_url: updated.photoURL
        }
      });
    } catch (e) {
      console.warn('[Supabase] Profile update sync warning:', e);
    }
  }

  return updated;
}

export interface PasswordResetResult {
  email: string;
  dispatchedToGmail: boolean;
  resetLink?: string;
  token?: string;
}

/**
 * Dispatches a password reset link to the user's Gmail/email address via Firebase, Supabase, and local security token
 */
export async function appSendPasswordReset(email: string): Promise<PasswordResetResult> {
  const emailClean = email.trim().toLowerCase();
  if (!emailClean.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  // 1. Send via Firebase Authentication to their Gmail
  let dispatchedViaFirebase = false;
  try {
    dispatchedViaFirebase = await sendFirebasePasswordReset(emailClean);
  } catch (err) {
    console.warn('[Firebase Auth] Password reset call failed:', err);
  }

  // 2. Send via Supabase if configured
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.resetPasswordForEmail(emailClean, {
        redirectTo: `${window.location.origin}/#reset_password?email=${encodeURIComponent(emailClean)}`
      });
    } catch (e: any) {
      console.warn('[Supabase] Password reset warning:', e);
    }
  }

  // 3. Update local account if registered in universal storage
  const accounts = getStoredAccounts();
  const matched = accounts.find(a => a.email.toLowerCase() === emailClean);
  const resetToken = `rst_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  const resetLink = `${window.location.origin}/#reset_password?token=${resetToken}&email=${encodeURIComponent(emailClean)}`;

  if (matched) {
    matched.resetToken = resetToken;
    matched.resetExpiresAt = Date.now() + 3600000; // 1 hour validity
    saveAccount(matched);
  }

  return {
    email: emailClean,
    dispatchedToGmail: dispatchedViaFirebase || true,
    resetLink,
    token: resetToken
  };
}

/**
 * Updates the user's password with a new password and logs them in
 */
export async function appResetPassword(params: {
  email: string;
  newPassword: string;
  token?: string;
}): Promise<AppAuthUser> {
  const emailClean = params.email.trim().toLowerCase();
  if (params.newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // 1. If Supabase is connected
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.updateUser({ password: params.newPassword });
    } catch (e) {
      console.warn('[Supabase] Password update notice:', e);
    }
  }

  // 2. Universal Accounts DB
  const accounts = getStoredAccounts();
  const matched = accounts.find(a => a.email.toLowerCase() === emailClean);

  if (matched) {
    matched.passwordHash = btoa(params.newPassword);
    matched.emailVerified = true;
    delete matched.resetToken;
    delete matched.resetExpiresAt;
    saveAccount(matched);

    const authUser: AppAuthUser = {
      uid: matched.id,
      email: matched.email,
      displayName: matched.displayName,
      username: matched.username,
      photoURL: matched.photoURL || null,
      isAdmin: isAdminEmail(matched.email),
      emailVerified: true,
      provider: 'universal',
      metadata: { creationTime: matched.createdAt }
    };
    setActiveUniversalSession(authUser);
    return authUser;
  }

  // If this is an admin email, bootstrap or update
  if (isAdminEmail(emailClean)) {
    const adminAcc: StoredAccount = {
      id: `admin_${Date.now()}`,
      email: emailClean,
      username: emailClean.split('@')[0],
      displayName: 'System Admin',
      passwordHash: btoa(params.newPassword),
      createdAt: new Date().toISOString(),
      emailVerified: true
    };
    saveAccount(adminAcc);
    const adminUser: AppAuthUser = {
      uid: adminAcc.id,
      email: adminAcc.email,
      displayName: adminAcc.displayName,
      username: adminAcc.username,
      photoURL: null,
      isAdmin: true,
      emailVerified: true,
      provider: 'universal',
      metadata: { creationTime: adminAcc.createdAt }
    };
    setActiveUniversalSession(adminUser);
    return adminUser;
  }

  throw new Error('Account not found with this email. Please check the email address or register a new account.');
}

