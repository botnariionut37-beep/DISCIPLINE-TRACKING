/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  AppAuthUser, 
  getSupabase, 
  getActiveUniversalSession, 
  setActiveUniversalSession, 
  appSignIn, 
  appSignUp, 
  appSignInWithGoogle, 
  appSignOut, 
  appSendPasswordReset,
  appResetPassword,
  appDeleteAccount,
  purgeAllExistingAccounts,
  PasswordResetResult,
  appUpdateUserProfile,
  appVerifyEmail,
  appResendVerification,
  SignUpResult,
  isSupabaseConfigured,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getStoredSupabaseConfig
} from '../services/supabase';
import { isAdminEmail } from '../utils/admin';

interface AuthContextType {
  user: AppAuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: (fallbackEmail?: string, fallbackName?: string) => Promise<AppAuthUser>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<AppAuthUser>;
  signUpWithEmail: (email: string, pass: string, displayName?: string, username?: string) => Promise<SignUpResult>;
  verifyEmail: (tokenOrEmail: string) => Promise<AppAuthUser>;
  resendVerification: (email: string) => Promise<string>;
  sendPasswordReset: (email: string) => Promise<PasswordResetResult>;
  resetPassword: (email: string, newPass: string, token?: string) => Promise<AppAuthUser>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<AppAuthUser | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isSupabaseConfigured: boolean;
  saveSupabaseConfig: (url: string, anonKey: string) => void;
  clearSupabaseConfig: () => void;
  storedSupabaseConfig: { url: string; anonKey: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (localStorage.getItem('discipline_all_accounts_purged_flag_v1') !== 'done') {
          purgeAllExistingAccounts();
          localStorage.setItem('discipline_all_accounts_purged_flag_v1', 'done');
        }

        const sb = getSupabase();
        if (sb) {
          const { data } = await sb.auth.getSession();
          if (data.session?.user && mounted) {
            const sbUser = data.session.user;
            const meta = sbUser.user_metadata || {};
            const email = sbUser.email || '';
            const appUser: AppAuthUser = {
              uid: sbUser.id,
              email,
              displayName: meta.display_name || meta.username || email.split('@')[0],
              username: meta.username || email.split('@')[0],
              photoURL: meta.avatar_url || null,
              isAdmin: isAdminEmail(email),
              provider: 'supabase',
              metadata: { creationTime: sbUser.created_at }
            };
            setUser(appUser);
            setActiveUniversalSession(appUser);
            setLoading(false);
            return;
          }
        }

        // Check active universal session in local storage
        const activeLocal = getActiveUniversalSession();
        if (activeLocal && mounted) {
          setUser(activeLocal);
        }
      } catch (err) {
        console.warn('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth state changes if connected
    const sb = getSupabase();
    let authListener: any = null;
    if (sb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (session?.user && mounted) {
          const meta = session.user.user_metadata || {};
          const email = session.user.email || '';
          const appUser: AppAuthUser = {
            uid: session.user.id,
            email,
            displayName: meta.display_name || meta.username || email.split('@')[0],
            username: meta.username || email.split('@')[0],
            photoURL: meta.avatar_url || null,
            isAdmin: isAdminEmail(email),
            provider: 'supabase',
            metadata: { creationTime: session.user.created_at }
          };
          setUser(appUser);
          setActiveUniversalSession(appUser);
        } else if (event === 'SIGNED_OUT' && mounted) {
          setUser(null);
          setActiveUniversalSession(null);
        }
      });
      authListener = data.subscription;
    }

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (fallbackEmail?: string, fallbackName?: string): Promise<AppAuthUser> => {
    const loggedUser = await appSignInWithGoogle(fallbackEmail, fallbackName);
    if (loggedUser) setUser(loggedUser);
    return loggedUser;
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string): Promise<AppAuthUser> => {
    const loggedUser = await appSignIn({
      identifier: emailOrUsername,
      password: pass
    });
    setUser(loggedUser);
    return loggedUser;
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    displayName?: string, 
    username?: string
  ): Promise<SignUpResult> => {
    const finalUsername = username?.trim() || email.split('@')[0];
    const result = await appSignUp({
      email,
      username: finalUsername,
      password: pass,
      displayName: displayName || finalUsername
    });
    // Only set user as active session if they don't need email verification
    if (!result.needsEmailVerification) {
      setUser(result.user);
    }
    return result;
  };

  const verifyEmail = async (tokenOrEmail: string): Promise<AppAuthUser> => {
    const verifiedUser = await appVerifyEmail(tokenOrEmail);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const resendVerification = async (email: string): Promise<string> => {
    return await appResendVerification(email);
  };

  const sendPasswordReset = async (email: string): Promise<PasswordResetResult> => {
    return await appSendPasswordReset(email);
  };

  const resetPassword = async (email: string, newPass: string, token?: string): Promise<AppAuthUser> => {
    const updatedUser = await appResetPassword({ email, newPassword: newPass, token });
    setUser(updatedUser);
    return updatedUser;
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }): Promise<AppAuthUser | null> => {
    const updated = await appUpdateUserProfile(updates);
    if (updated) {
      setUser(updated);
    }
    return updated;
  };

  const signOut = async (): Promise<void> => {
    await appSignOut();
    setUser(null);
  };

  const deleteAccount = async (): Promise<void> => {
    if (!user) return;
    await appDeleteAccount(user.uid);
    setUser(null);
  };

  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    saveSupabaseConfig(url, anonKey);
    setIsConfigured(isSupabaseConfigured());
  };

  const handleClearSupabaseConfig = () => {
    clearSupabaseConfig();
    setIsConfigured(false);
  };

  const isAdmin = Boolean(user && isAdminEmail(user.email));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        verifyEmail,
        resendVerification,
        sendPasswordReset,
        resetPassword,
        updateUserProfile,
        signOut,
        deleteAccount,
        isSupabaseConfigured: isConfigured,
        saveSupabaseConfig: handleSaveSupabaseConfig,
        clearSupabaseConfig: handleClearSupabaseConfig,
        storedSupabaseConfig: getStoredSupabaseConfig()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
