import React from 'react';
import { 
  X, 
  Shield, 
  Award, 
  Star, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  Calendar, 
  Activity, 
  Zap, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';
import { LeaderboardEntry } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';

interface WarriorInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  warrior: LeaderboardEntry | null;
  isCurrentUser: boolean;
}

export const WarriorInspectorModal: React.FC<WarriorInspectorModalProps> = ({
  isOpen,
  onClose,
  warrior,
  isCurrentUser,
}) => {
  if (!isOpen || !warrior) return null;

  const rankMeta = RANK_TIERS.find(r => r.index === warrior.rankIndex) || RANK_TIERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0F1218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ambient Glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 opacity-25 pointer-events-none blur-2xl"
          style={{ background: `radial-gradient(ellipse at top, ${rankMeta.accentColor}, transparent 70%)` }}
        />

        {/* Modal Top Bar */}
        <div className="relative flex items-center justify-between p-5 border-b border-white/10 bg-[#121620]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl overflow-hidden p-0.5 shadow-md flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${rankMeta.accentColor}, #1E293B)` }}
            >
              {warrior.photoURL ? (
                <img 
                  src={warrior.photoURL} 
                  alt={warrior.displayName} 
                  className="w-full h-full object-cover rounded-[10px]" 
                />
              ) : (
                <div className="w-full h-full bg-[#151923] flex items-center justify-center font-bold text-white text-base">
                  {warrior.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {warrior.customAlias || warrior.displayName}
                </h3>
                {isCurrentUser && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Discipline Warrior &bull; Tier {warrior.rankIndex + 1} of 12
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Rank Tier Banner */}
          <div 
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{
              borderColor: `${rankMeta.accentColor}40`,
              backgroundColor: `${rankMeta.accentColor}10`,
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${rankMeta.accentColor}25` }}
              >
                <Trophy className="w-5 h-5" style={{ color: rankMeta.accentColor }} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  {rankMeta.tierCategory} Class
                </div>
                <div className="text-base font-extrabold text-white flex items-center gap-2">
                  <span style={{ color: rankMeta.accentColor }}>{rankMeta.name}</span>
                  <span className="text-xs text-slate-400 font-normal">({rankMeta.title})</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Required</span>
              <div className="text-sm font-bold text-white">
                {rankMeta.requiredWeeks}+ wks ≥80%
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <Flame className="w-5 h-5 text-emerald-400 mb-1" />
              <div className="text-xs text-slate-400 font-medium">Discipline Rate</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                {warrior.disciplineScore}%
              </div>
              <div className="text-[10px] text-slate-500">Current Week</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400 mb-1" />
              <div className="text-xs text-slate-400 font-medium">Checks Done</div>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {warrior.weeklyCompletedChecks}
                <span className="text-xs text-slate-500 font-normal">/{warrior.weeklyTargetChecks}</span>
              </div>
              <div className="text-[10px] text-slate-500">This Week</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <Zap className="w-5 h-5 text-amber-400 mb-1" />
              <div className="text-xs text-slate-400 font-medium">Qualifying</div>
              <div className="text-xl font-extrabold text-amber-400 mt-0.5">
                {warrior.qualifyingWeeks}
              </div>
              <div className="text-[10px] text-slate-500">≥80% Weeks</div>
            </div>
          </div>

          {/* Active Habit Categories Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-400" />
                Active Habit Categories
              </h4>
              <span className="text-xs text-slate-500">
                {warrior.topHabits?.length || 0} trackings
              </span>
            </div>

            {(!warrior.topHabits || warrior.topHabits.length === 0) ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                No public habit categories recorded for this warrior yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {warrior.topHabits.map((habit) => (
                  <div 
                    key={habit.id}
                    className="p-3 rounded-xl bg-[#141822] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-medium text-white truncate pr-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="truncate">{habit.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-slate-400">{habit.completed}/{habit.total} days</span>
                        <span className={habit.rate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                          {habit.rate}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          habit.rate >= 80 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{ width: `${Math.min(100, habit.rate)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stoic Creed / Tier Perk */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/20 via-slate-900 to-slate-950 border border-white/5 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Warrior Creed
            </div>
            <p className="text-slate-300 italic leading-relaxed">
              &ldquo;{rankMeta.quote}&rdquo;
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#121620] flex items-center justify-between text-xs text-slate-400">
          <div>
            Last active: {new Date(warrior.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
