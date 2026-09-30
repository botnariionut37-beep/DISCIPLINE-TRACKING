/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Database,
  AtSign,
  KeyRound,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset_sent' | 'reset_password' | 'verification_sent' | 'supabase_settings';

export const SUPABASE_LEADERBOARD_SQL = `-- 1. Create Leaderboard Table in Supabase
create table if not exists public.discipline_leaderboard (
  user_id text primary key,
  display_name text not null,
  custom_alias text,
  photo_url text,
  rank_index integer default 1,
  rank_id text default 'bronz',
  rank_name text default 'Bronz',
  tier_category text default 'Foundation',
  qualifying_weeks integer default 0,
  discipline_score integer default 0,
  weekly_completed_checks integer default 0,
  weekly_target_checks integer default 35,
  top_habits jsonb default '[]'::jsonb,
  is_public boolean default true,
  updated_at timestamptz default now()
);

-- 2. Enable Realtime & RLS
alter table public.discipline_leaderboard enable row level security;
drop policy if exists "Allow public read on leaderboard" on public.discipline_leaderboard;
create policy "Allow public read on leaderboard" on public.discipline_leaderboard for select using (true);
drop policy if exists "Allow upsert on leaderboard" on public.discipline_leaderboard;
create policy "Allow upsert on leaderboard" on public.discipline_leaderboard for all using (true) with check (true);

-- 3. Broadcast updates in Realtime to all devices
alter publication supabase_realtime add table public.discipline_leaderboard;`;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    verifyEmail,
    resendVerification,
    sendPasswordReset,
    resetPassword,
    isSupabaseConfigured,
    saveSupabaseConfig,
    clearSupabaseConfig,
    storedSupabaseConfig
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [pendingVerificationLink, setPendingVerificationLink] = useState('');
  const [pendingResetEmail, setPendingResetEmail] = useState('');
  const [pendingResetLink, setPendingResetLink] = useState('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supabase Config fields
  const [supabaseUrl, setSupabaseUrl] = useState(storedSupabaseConfig.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(storedSupabaseConfig.anonKey || '');

  // Listen to hash routes for reset password or email verification
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('reset_password')) {
        const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(queryPart);
        const emailParam = params.get('email');
        const tokenParam = params.get('token');
        if (emailParam) {
          setEmail(emailParam);
          setPendingResetEmail(emailParam);
        }
        if (tokenParam) setManualTokenInput(tokenParam);
        setMode('reset_password');
      } else if (hash.includes('verify_email')) {
        const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(queryPart);
        const emailParam = params.get('email');
        const tokenParam = params.get('token');
        if (emailParam) setPendingVerificationEmail(emailParam);
        if (tokenParam) setManualTokenInput(tokenParam);
        setMode('verification_sent');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (!isOpen) return null;

  const handleVerifyEmail = async (tokenToVerify?: string) => {
    const token = tokenToVerify || manualTokenInput.trim() || pendingVerificationEmail;
    if (!token) {
      setErrorMsg('Please enter your verification token or email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await verifyEmail(token);
      setSuccessMsg('Email verified successfully! You are now logged in.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the link or resend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (!pendingVerificationEmail) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const newLink = await resendVerification(pendingVerificationEmail);
      setPendingVerificationLink(newLink);
      setSuccessMsg(`New verification link generated for ${pendingVerificationEmail}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(emailOrUsername, password);
        onClose();
      } else if (mode === 'signup') {
        if (!email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (confirmPassword && password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }
        if (!username.trim()) {
          throw new Error('Please choose a username.');
        }
        const result = await signUpWithEmail(email, password, displayName || username, username);
        if (result.needsEmailVerification) {
          setPendingVerificationEmail(email);
          setPendingVerificationLink(result.verificationLink || '');
          setMode('verification_sent');
          setSuccessMsg(`Verification link dispatched to ${email}!`);
        } else {
          onClose();
        }
      } else if (mode === 'forgot') {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.includes('@')) {
          throw new Error('Please enter your registered email address.');
        }
        const result = await sendPasswordReset(cleanEmail);
        setPendingResetEmail(cleanEmail);
        setPendingResetLink(result.resetLink || '');
        setMode('reset_sent');
        setSuccessMsg(`A password reset link was sent to ${cleanEmail}. Please check your Gmail or email inbox.`);
      } else if (mode === 'reset_password') {
        if (password.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (confirmPassword && password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }
        const targetEmail = email || pendingResetEmail;
        if (!targetEmail) {
          throw new Error('Missing email address. Please start password recovery again.');
        }
        await resetPassword(targetEmail, password, manualTokenInput);
        setSuccessMsg('Password updated successfully! You are now signed in.');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || (err.message && err.message.includes('EMAIL_NOT_VERIFIED'))) {
        setPendingVerificationEmail(err.email || emailOrUsername);
        if (err.verificationToken) {
          setPendingVerificationLink(`${window.location.origin}/#verify_email?token=${err.verificationToken}&email=${encodeURIComponent(err.email || emailOrUsername)}`);
        }
        setMode('verification_sent');
        setErrorMsg('Please verify your email address before logging in.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
      setSuccessMsg('Supabase configuration saved! Connected to custom project.');
      setTimeout(() => {
        setMode('signin');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg('Failed to save Supabase config.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-[#0C0E12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <ShieldCheck size={14} />
              <span>Warrior Authentication</span>
            </div>

            <button
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setMode(mode === 'supabase_settings' ? 'signin' : 'supabase_settings');
              }}
              className="text-[11px] font-mono text-gray-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="Configure custom Supabase project credentials"
            >
              <Database size={12} />
              <span>{isSupabaseConfigured ? 'Supabase Active' : 'Supabase Config'}</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight">
            {mode === 'signin' && 'Sign In to Your Account'}
            {mode === 'signup' && 'Create Warrior Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset_sent' && 'Reset Link Dispatched'}
            {mode === 'reset_password' && 'Set New Password'}
            {mode === 'supabase_settings' && 'Custom Supabase Setup'}
            {mode === 'verification_sent' && 'Verify Your Email'}
          </h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            {mode === 'verification_sent'
              ? `We have generated an email verification link for ${pendingVerificationEmail || 'your account'}. Click the link to complete verification and sign in.`
              : mode === 'reset_sent'
              ? `A password reset link has been dispatched to ${pendingResetEmail}. Follow the instructions in your email to change your password.`
              : mode === 'reset_password'
              ? 'Enter and confirm your new password below.'
              : mode === 'supabase_settings'
              ? 'Connect your custom Supabase database and authentication project to allow unlimited free domains.'
              : mode === 'forgot'
              ? 'Enter your registered email address. We will send a secure link to your Gmail/inbox to reset your password.'
              : 'Sign in with your email or username to sync your discipline progress.'}
          </p>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2.5 text-xs animate-shake">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5 text-xs">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Supabase Settings Form */}
        {mode === 'supabase_settings' ? (
          <form onSubmit={handleSaveSupabase} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-[#161A22] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="text"
                required
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                className="w-full bg-[#161A22] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-sans font-bold text-sm transition-all cursor-pointer"
              >
                Save Supabase Credentials
              </button>

              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    clearSupabaseConfig();
                    setSupabaseUrl('');
                    setSupabaseAnonKey('');
                    setSuccessMsg('Supabase config cleared; using universal multi-domain mode.');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/10 text-xs font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-emerald-400 text-[11px]">SQL Schema (Leaderboard Table & Realtime)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_LEADERBOARD_SQL);
                    setSuccessMsg('SQL copied! Paste into Supabase SQL Editor and click Run.');
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono underline cursor-pointer"
                >
                  Copy SQL
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                Run this SQL in your Supabase SQL Editor to create the leaderboard table and enable real-time synchronization across devices.
              </p>
              <pre className="text-[10px] text-gray-300 font-mono overflow-x-auto p-2 bg-[#0E1117] rounded-xl max-h-32 select-all leading-tight">
                {SUPABASE_LEADERBOARD_SQL}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-center text-xs text-emerald-400 hover:underline pt-2 cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        ) : mode === 'reset_sent' ? (
          /* Password Reset Link Dispatched Confirmation Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-400 text-sm">
                <Mail size={18} />
                <span>Password Reset Email Sent</span>
              </div>
              <p>
                A secure password change link has been sent to{' '}
                <strong className="text-white font-mono">{pendingResetEmail}</strong>.
              </p>
              <p className="text-[11px] text-gray-400">
                Please open your Gmail or email inbox, click the reset link, and set your new password. If you don't see the email after a moment, please check your Spam or Promotions folder.
              </p>
            </div>

            {/* Direct Gmail inbox button */}
            <a
              href={`https://mail.google.com/mail/u/${encodeURIComponent(pendingResetEmail)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-sans font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Open Gmail Inbox</span>
              <ExternalLink size={13} className="text-gray-500" />
            </a>

            {/* Quick in-app reset button */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setEmail(pendingResetEmail);
                  setMode('reset_password');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-sans font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                <KeyRound size={14} />
                <span>Enter New Password Directly</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await sendPasswordReset(pendingResetEmail);
                    setSuccessMsg(`Reset link resent to ${pendingResetEmail}!`);
                  } catch (e: any) {
                    setErrorMsg(e.message || 'Failed to resend reset link.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                <span>Resend email link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : mode === 'verification_sent' ? (
          /* Email Verification Pending Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 size={16} />
                <span>Verification Link Dispatched</span>
              </div>
              <p>
                An activation link has been prepared for <strong className="text-white font-mono">{pendingVerificationEmail}</strong>. 
                Your warrior account will be officially created and unlocked once verified.
              </p>
            </div>

            {pendingVerificationLink && (
              <div className="p-3.5 rounded-2xl bg-[#161A22] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Verification Link:</span>
                  <span className="text-emerald-400">Ready to activate</span>
                </div>
                <div className="text-[11px] text-gray-300 font-mono break-all p-2.5 rounded-xl bg-black/40 border border-white/5">
                  {pendingVerificationLink}
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyEmail(pendingVerificationEmail)}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  <ExternalLink size={13} />
                  <span>Verify Email & Activate Account</span>
                </button>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-mono text-gray-400">
                Or paste verification token manually:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="vtok_... or verification token"
                  className="flex-1 bg-[#161A22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyEmail()}
                  disabled={isLoading || !manualTokenInput.trim()}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={isLoading}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                <span>Resend verification email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : mode === 'reset_password' ? (
          /* Choose New Password Screen */
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email || pendingResetEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warrior@discipline.app"
                  className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                New Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save New Password & Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Email / Username & Password Form */
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {mode === 'signin' && (
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="warrior@discipline.app or username"
                    className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="warrior@discipline.app"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="spartan_will"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Display Name (Optional)
                  </label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Marcus Aurelius"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'forgot' && (
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 font-sans">
                  We'll send a password reset link to this email address.
                </p>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                    <span>Password</span>
                    <span className="text-[10px] text-gray-500 font-sans">(min 6 characters)</span>
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (emailOrUsername.includes('@')) {
                          setEmail(emailOrUsername.trim().toLowerCase());
                        }
                        setMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Switch Between Modes */}
        {mode !== 'supabase_settings' && mode !== 'reset_sent' && (
          <div className="mt-5 pt-4 border-t border-white/5 text-center text-xs text-gray-400">
            {mode === 'signin' && (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remember your credentials?{' '}
                <button
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </p>
            )}

            {mode === 'reset_password' && (
              <p>
                Finished or cancelled?{' '}
                <button
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
