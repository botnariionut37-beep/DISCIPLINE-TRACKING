/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Database,
  AtSign,
  KeyRound,
  ExternalLink,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronRight,
  UserPlus,
  Globe
} from 'lucide-react';
import { ADMIN_EMAILS } from '../utils/admin';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    verifyEmail,
    resendVerification,
    sendPasswordReset,
    isSupabaseConfigured,
    saveSupabaseConfig,
    clearSupabaseConfig,
    storedSupabaseConfig,
    cachedGoogleAccounts
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'supabase_settings' | 'google_prompt' | 'verification_sent'>('signin');
  const [googleStep, setGoogleStep] = useState<'choose_account' | 'enter_password' | 'custom_email'>('choose_account');
  const [googlePassword, setGooglePassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<{ email: string; name: string; avatar?: string } | null>(null);

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');
  const [googleAccountName, setGoogleAccountName] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [pendingVerificationLink, setPendingVerificationLink] = useState('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supabase Config fields
  const [supabaseUrl, setSupabaseUrl] = useState(storedSupabaseConfig.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(storedSupabaseConfig.anonKey || '');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Directs user to accounts.google.com in an official Firebase popup window
      await signInWithGoogle();
      setSuccessMsg('Successfully signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.warn('[AuthModal] Google popup failed or was closed:', err);
      if (err.message && err.message.includes('popup-blocked')) {
        setErrorMsg('Pop-up window was blocked. Please allow pop-ups for this site, or use the direct option below.');
        setMode('google_prompt');
      } else if (err.message && err.message.includes('cancelled')) {
        // User closed the Google account selector
        setErrorMsg('Google sign-in was cancelled. Click Continue with Google to try again.');
      } else {
        setErrorMsg(err.message || 'Failed to complete Google sign-in.');
        setMode('google_prompt');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGoogleAccount = (acc: { email: string; name: string; avatar?: string }) => {
    setSelectedGoogleAccount(acc);
    setGoogleAccountEmail(acc.email);
    setGoogleAccountName(acc.name);
    setGooglePassword('');
    setErrorMsg(null);
    setGoogleStep('enter_password');
  };

  const handleCustomGoogleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAccountEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    setErrorMsg(null);
    setSelectedGoogleAccount({
      email: googleAccountEmail.trim().toLowerCase(),
      name: googleAccountName.trim() || googleAccountEmail.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${googleAccountEmail.split('@')[0]}`
    });
    setGoogleStep('enter_password');
  };

  const handleGooglePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = selectedGoogleAccount?.email || googleAccountEmail;
    const targetName = selectedGoogleAccount?.name || googleAccountName;

    if (!targetEmail) {
      setErrorMsg('Please specify an account.');
      return;
    }

    if (!googlePassword || googlePassword.length < 6) {
      setErrorMsg('Password requirement: Must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle(targetEmail, targetName, googlePassword);
      setSuccessMsg('Successfully signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in with Google account.');
    } finally {
      setIsLoading(false);
    }
  };

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
        if (!email.includes('@')) {
          throw new Error('Please enter your registered email address.');
        }
        await sendPasswordReset(email);
        setSuccessMsg(`Recovery link sent to ${email}. Please check your inbox.`);
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

        {/* Header (hidden during Google sign-in flow for genuine Google interface) */}
        {mode !== 'google_prompt' && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <ShieldCheck size={14} />
                <span>Multi-Domain Free Cloud Auth</span>
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
              {mode === 'supabase_settings' && 'Custom Supabase Setup'}
              {mode === 'verification_sent' && 'Verify Your Email'}
            </h2>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              {mode === 'verification_sent'
                ? `We have generated an email verification link for ${pendingVerificationEmail || 'your account'}. Click the link to complete verification and sign in.`
                : mode === 'supabase_settings'
                ? 'Connect your custom Supabase database and authentication project to allow unlimited free domains (e.g. vercel.app).'
                : mode === 'forgot'
                ? 'Enter your registered email to receive account recovery instructions.'
                : 'Works seamlessly across all domains (Vercel, custom URLs, localhost) with free accounts.'}
            </p>
          </div>
        )}

        {/* Google One-Click Button */}
        {mode !== 'forgot' && mode !== 'supabase_settings' && mode !== 'google_prompt' && mode !== 'verification_sent' && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-sans font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-emerald-500/10 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google / Gmail</span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">or email & password</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </>
        )}

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

        {/* Google Direct Sign-In & Account Picker (matches Google dark theme in screenshot) */}
        {mode === 'google_prompt' ? (
          <div className="space-y-4">
            {googleStep === 'choose_account' ? (
              <div className="space-y-3">
                {/* Header bar matching screenshot */}
                <div className="flex items-center gap-2 text-xs text-gray-300 pb-1">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="font-medium text-gray-200">Conectează-te cu Google</span>
                </div>

                <div className="pt-1 pb-2">
                  <h3 className="text-2xl font-sans font-normal text-white">
                    Alege un cont
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Accesează <span className="text-blue-400 font-medium hover:underline cursor-pointer">disciplinetracker.app</span>
                  </p>
                </div>

                {/* List of Google Accounts */}
                <div className="divide-y divide-white/10 border-t border-b border-white/10 max-h-60 overflow-y-auto pr-1">
                  {cachedGoogleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(acc)}
                      className="w-full py-3 px-2 flex items-center gap-3.5 hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-900/60 border border-white/20 flex items-center justify-center shrink-0">
                        {acc.avatar ? (
                          <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-emerald-300">
                            {acc.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {acc.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {acc.email}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-300 shrink-0" />
                    </button>
                  ))}

                  {/* Use another account option */}
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleAccountEmail('');
                      setGoogleAccountName('');
                      setErrorMsg(null);
                      setGoogleStep('custom_email');
                    }}
                    className="w-full py-3 px-2 flex items-center gap-3.5 hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-gray-300 group-hover:text-white">
                      <UserPlus size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        Folosește alt cont
                      </div>
                      <div className="text-xs text-gray-400">
                        Use another Google email address
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-300 shrink-0" />
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('signin');
                    }}
                    className="hover:text-white cursor-pointer py-1"
                  >
                    Înapoi la autentificare
                  </button>

                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="hover:text-gray-300 cursor-pointer">Ajutor</span>
                    <span className="hover:text-gray-300 cursor-pointer">Confidențialitate</span>
                    <span className="hover:text-gray-300 cursor-pointer">Termeni</span>
                  </div>
                </div>
              </div>
            ) : googleStep === 'custom_email' ? (
              <form onSubmit={handleCustomGoogleEmailSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-gray-300 pb-1">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="font-medium text-gray-200">Conectează-te</span>
                </div>

                <div>
                  <h3 className="text-2xl font-sans font-normal text-white">
                    Introdu adresa de e-mail
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Continuă către Discipline Tracker
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    E-mail sau telefon
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={googleAccountEmail}
                      onChange={(e) => setGoogleAccountEmail(e.target.value)}
                      placeholder="nume@gmail.com"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Nume de afișare (opțional)
                  </label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={googleAccountName}
                      onChange={(e) => setGoogleAccountName(e.target.value)}
                      placeholder="Warrior"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setGoogleStep('choose_account');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Alege alt cont
                  </button>

                  <button
                    type="submit"
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans font-medium text-sm transition-colors cursor-pointer shadow-md"
                  >
                    Înainte
                  </button>
                </div>
              </form>
            ) : (
              /* googleStep === 'enter_password' */
              <form onSubmit={handleGooglePasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-gray-300 pb-1">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="font-medium text-gray-200">Bună ziua, {selectedGoogleAccount?.name || 'Warrior'}</span>
                </div>

                {/* Selected account chip */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-900/60 border border-white/20 flex items-center justify-center shrink-0">
                      {selectedGoogleAccount?.avatar ? (
                        <img src={selectedGoogleAccount.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-emerald-300">
                          {(selectedGoogleAccount?.name || 'G').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-200 truncate font-mono">
                      {selectedGoogleAccount?.email || googleAccountEmail}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setGoogleStep('choose_account');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer shrink-0 pl-2"
                  >
                    Schimbă
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-sans font-normal text-white">
                    Introdu parola
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Cerință de securitate: minim 6 caractere
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Parolă Google / Cont (min. 6 caractere)
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showGooglePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={googlePassword}
                      onChange={(e) => setGooglePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowGooglePassword(!showGooglePassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                    >
                      {showGooglePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className={googlePassword.length >= 6 ? 'text-emerald-400' : 'text-gray-500'}>
                      {googlePassword.length}/6 caractere minime
                    </span>
                    <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showGooglePassword}
                        onChange={(e) => setShowGooglePassword(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0"
                      />
                      <span>Afișează parola</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setGoogleStep('choose_account');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Înapoi
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-md"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Conectează-te</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : mode === 'supabase_settings' ? (
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

            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-center text-xs text-emerald-400 hover:underline pt-2 cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
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
                    placeholder="botnariionut37@gmail.com or username"
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
                    placeholder="warrior@discipline.app"
                    className="w-full bg-[#161A22] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
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
        {mode !== 'supabase_settings' && mode !== 'google_prompt' && (
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
          </div>
        )}
      </div>
    </div>
  );
}
