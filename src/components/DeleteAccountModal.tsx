/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert, 
  Clock, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  requestDeletionCode, 
  verifyAndExecuteCompletePurge, 
  RequestDeletionResult,
  getPendingDeletion 
} from '../services/accountDeletion';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  onDeletionSuccess: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userId,
  onDeletionSuccess,
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [deletionData, setDeletionData] = useState<RequestDeletionResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Check if there is an existing pending code on modal open
  useEffect(() => {
    if (isOpen) {
      const pending = getPendingDeletion();
      if (pending && pending.uid === userId) {
        setDeletionData({
          email: pending.email,
          code: pending.code,
          token: pending.token,
          expiresAt: pending.expiresAt,
          directGmailUrl: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent('Discipline Arena Account Deletion')}`
        });
        setStep('verify');
      } else {
        setStep('request');
        setVerificationCode('');
        setError(null);
      }
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestDeletionCode(userEmail, userId);
      setDeletionData(result);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurge = async (codeToVerify?: string) => {
    const code = codeToVerify || verificationCode;
    if (!code || code.trim().length < 6) {
      setError('Please enter the complete 6-digit confirmation code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyAndExecuteCompletePurge(userId, code.trim());
      setStep('completed');
      setTimeout(() => {
        onDeletionSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (deletionData?.code) {
      navigator.clipboard.writeText(deletionData.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0C0E14] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-white text-base">Permanent Account Deletion</h3>
              <p className="text-xs text-red-400/80 font-mono">Gmail Email Verification Required</p>
            </div>
          </div>
          {step !== 'completed' && (
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: REQUEST VERIFICATION EMAIL */}
        {step === 'request' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-xs tracking-wider uppercase">
                <ShieldAlert className="w-4 h-4" />
                <span>Irreversible Purge Warning</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Confirming account deletion will completely and permanently erase all your data:
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-white">Realtime Database:</strong> Your score and profile will vanish from the live leaderboard.</li>
                <li><strong className="text-white">Cloud Firestore:</strong> All habit check records, streaks, and custom categories will be wiped.</li>
                <li><strong className="text-white">Authentication:</strong> Your login credentials and identity session will be destroyed.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Confirmation email will be sent to:</p>
                <p className="text-sm font-mono font-bold text-white truncate">{userEmail}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Keep My Account
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSendCode}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending to Gmail...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Verification Code to Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY CODE AND PURGE */}
        {step === 'verify' && deletionData && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">Verification code sent to Gmail</p>
                  <p className="text-[11px] font-mono text-indigo-300 truncate">{deletionData.email}</p>
                </div>
              </div>
              <a
                href="https://mail.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition-colors shrink-0"
              >
                <span>Open Gmail</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* In-App Email Notification Preview Box */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="w-full px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] border-b border-white/5 flex items-center justify-between text-xs text-slate-300 font-sans transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Gmail Deletion Email & 6-Digit Code</span>
                </div>
                <span className="text-[11px] text-indigo-400 font-mono">
                  {showEmailPreview ? 'Hide Preview' : 'Show Preview'}
                </span>
              </button>

              {showEmailPreview && (
                <div className="p-4 space-y-3 bg-[#0E1118] text-xs">
                  <div className="border-b border-white/5 pb-2 text-[11px] text-slate-400 space-y-0.5 font-mono">
                    <p><strong>From:</strong> Discipline Arena &lt;security@discipline.app&gt;</p>
                    <p><strong>To:</strong> {deletionData.email}</p>
                    <p><strong>Subject:</strong> ⚠️ Confirm Permanent Account Deletion</p>
                  </div>
                  <p className="text-slate-300">
                    We received a request to permanently delete your account and remove you from the live leaderboard.
                  </p>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Your Confirmation Code:</span>
                      <p className="text-xl font-mono font-black text-amber-400 tracking-widest">{deletionData.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleConfirmPurge(deletionData.code)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span>Click here to auto-fill code & delete account immediately</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Enter 6-Digit Confirmation Code:</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  Expires in 15m
                </span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-3 bg-[#141824] border border-red-500/40 focus:border-red-400 rounded-xl text-center font-mono text-2xl font-black tracking-widest text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Resend code
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || verificationCode.length < 6}
                  onClick={() => handleConfirmPurge()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Purging Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete Everything</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETED SUCCESS STATE */}
        {step === 'completed' && (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Account & Score Completely Purged</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You have been removed from the Firebase Realtime Database leaderboard, Firestore, and authentication system.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 max-w-xs mx-auto text-[11px] text-emerald-400 font-mono">
              Redirecting you to the home arena...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
