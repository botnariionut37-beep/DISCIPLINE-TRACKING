import React, { useState } from 'react';
import { X, Shield, Eye, EyeOff, UserCheck, Check, Sparkles } from 'lucide-react';
import { LeaderboardSettings } from '../types/leaderboard';

interface LeaderboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LeaderboardSettings;
  onSaveSettings: (settings: LeaderboardSettings) => void;
  defaultDisplayName: string;
  onOpenDeleteAccount?: () => void;
}

export const LeaderboardSettingsModal: React.FC<LeaderboardSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  defaultDisplayName,
  onOpenDeleteAccount,
}) => {
  const [isPublic, setIsPublic] = useState(settings.isPublic);
  const [customAlias, setCustomAlias] = useState(settings.customAlias || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      isPublic,
      customAlias: customAlias.trim()
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const previewName = customAlias.trim() || defaultDisplayName || 'Warrior';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0F1218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Community Standing & Privacy</h3>
              <p className="text-xs text-slate-400">Control how other warriors see your progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Public vs Private Switch */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isPublic ? (
                  <Eye className="w-5 h-5 text-emerald-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <div className="text-sm font-semibold text-white">Public Leaderboard Presence</div>
                  <div className="text-xs text-slate-400">
                    {isPublic ? 'Your rank and stats appear in the Arena.' : 'Hidden from everyone (Incognito mode).'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isPublic ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Custom Warrior Alias Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Warrior Alias / Call-sign
            </label>
            <input
              type="text"
              maxLength={24}
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder={defaultDisplayName || 'e.g., IronAurelius, Spartan99'}
              className="w-full px-3.5 py-2.5 bg-[#141824] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              Leave blank to use your default profile name ({defaultDisplayName || 'Warrior'}).
            </p>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-[#121622] border border-white/5 space-y-1.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Leaderboard Name Preview:
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{previewName}</span>
              {isPublic ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Visible
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  Incognito
                </span>
              )}
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          {onOpenDeleteAccount && (
            <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-rose-400">Delete Account & Leaderboard Score</p>
                <p className="text-[11px] text-slate-400">Requires 6-digit confirmation code sent to Gmail</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeleteAccount();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Delete Account
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
