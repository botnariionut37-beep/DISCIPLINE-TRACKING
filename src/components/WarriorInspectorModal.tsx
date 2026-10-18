/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  LayoutGrid,
  Clock,
  Dumbbell,
  BookOpen,
  Apple,
  Code,
  Heart,
  Droplet,
  Coffee,
  Moon,
  Sun,
  Compass
} from 'lucide-react';
import { LeaderboardEntry } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';
import { Category, WeeklyChecks, DAYS_OF_WEEK, DayOfWeek } from '../types';
import { fetchWarriorHabitData, saveWarriorHabitData, WarriorDataPayload } from '../services/adminService';
import { getCurrentWeekKey, getWeekLabel, getOffsetWeekKey, getDayDates } from '../utils/date';
import { chime } from '../utils/audio';

interface WarriorInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  warrior: LeaderboardEntry | null;
  isCurrentUser: boolean;
  isAdmin?: boolean;
  onInspectOnMainGrid?: (warrior: LeaderboardEntry) => void;
}

export const WarriorInspectorModal: React.FC<WarriorInspectorModalProps> = ({
  isOpen,
  onClose,
  warrior,
  isCurrentUser,
  isAdmin = false,
  onInspectOnMainGrid,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'boundaries'>('overview');
  const [inspectWeekKey, setInspectWeekKey] = useState<string>(() => getCurrentWeekKey());
  const [warriorData, setWarriorData] = useState<WarriorDataPayload | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingCheck, setIsSavingCheck] = useState(false);

  // Load target warrior's actual habit categories and checks when modal opens or warrior changes
  useEffect(() => {
    if (!isOpen || !warrior) return;
    setInspectWeekKey(getCurrentWeekKey());

    let isMounted = true;
    setIsLoadingData(true);

    fetchWarriorHabitData(warrior.userId)
      .then((data) => {
        if (isMounted) {
          setWarriorData(data);
          setIsLoadingData(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load warrior habit data:', err);
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, warrior?.userId]);

  if (!isOpen || !warrior) return null;

  const rankMeta = RANK_TIERS.find(r => r.index === warrior.rankIndex) || RANK_TIERS[0];
  const currentRealWeekKey = getCurrentWeekKey();
  const isCurrentWeek = inspectWeekKey === currentRealWeekKey;
  const weekLabel = getWeekLabel(inspectWeekKey);
  const dayDates = getDayDates(inspectWeekKey);

  // Helper icon renderer
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Clock': return <Clock size={14} />;
      case 'Dumbbell': return <Dumbbell size={14} />;
      case 'BookOpen': return <BookOpen size={14} />;
      case 'Apple': return <Apple size={14} />;
      case 'Code': return <Code size={14} />;
      case 'Heart': return <Heart size={14} />;
      case 'Droplet': return <Droplet size={14} />;
      case 'Coffee': return <Coffee size={14} />;
      case 'Moon': return <Moon size={14} />;
      case 'Sun': return <Sun size={14} />;
      default: return <Activity size={14} />;
    }
  };

  // Toggle checkmark for the target warrior (Admin superpower)
  const handleToggleHabitCell = async (categoryId: string, day: DayOfWeek) => {
    if (!isAdmin || !warriorData || !warrior) return;

    chime.init();
    chime.playCheck();

    const currentWeekChecks = warriorData.checks[inspectWeekKey] || {};
    const catChecks = currentWeekChecks[categoryId] || {};
    const currentVal = !!catChecks[day];
    const newVal = !currentVal;

    // Optimistic update
    const updatedWeekChecks = {
      ...currentWeekChecks,
      [categoryId]: {
        ...catChecks,
        [day]: newVal,
      },
    };

    const updatedChecks: WeeklyChecks = {
      ...warriorData.checks,
      [inspectWeekKey]: updatedWeekChecks,
    };

    const updatedPayload: WarriorDataPayload = {
      ...warriorData,
      checks: updatedChecks,
    };

    setWarriorData(updatedPayload);
    setIsSavingCheck(true);

    try {
      await saveWarriorHabitData(warrior.userId, updatedPayload, warrior);
    } catch (e) {
      console.warn('Error saving warrior check:', e);
    } finally {
      setIsSavingCheck(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#0F1218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none blur-2xl"
          style={{ background: `radial-gradient(ellipse at top, ${rankMeta.accentColor}, transparent 70%)` }}
        />

        {/* Modal Top Bar */}
        <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#121620]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-11 h-11 rounded-xl overflow-hidden p-0.5 shadow-md shrink-0"
              style={{ background: `linear-gradient(135deg, ${rankMeta.accentColor}, #1E293B)` }}
            >
              {warrior.photoURL ? (
                <img 
                  src={warrior.photoURL} 
                  alt={warrior.displayName} 
                  className="w-full h-full object-cover rounded-[10px]" 
                />
              ) : (
                <div className="w-full h-full bg-[#151923] flex items-center justify-center font-bold text-white text-sm">
                  {warrior.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                  {warrior.customAlias || warrior.displayName}
                </h3>
                {isCurrentUser && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    · You
                  </span>
                )}
                {isAdmin && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-500/10">
                    Admin Inspector
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Discipline Warrior · Tier {warrior.rankIndex + 1} of 12 · {rankMeta.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onInspectOnMainGrid && (
              <button
                type="button"
                onClick={() => {
                  onInspectOnMainGrid(warrior);
                  onClose();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
                title="Inspect this warrior's complete tracker on the main dashboard"
              >
                <LayoutGrid size={13} />
                <span>Open in Main Grid</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (for Admins: Overview vs Boundaries & Weekly Checks) */}
        {isAdmin && (
          <div className="flex items-center border-b border-white/10 bg-[#0B0E14] px-4 pt-2 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-3 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy size={14} />
              <span>Warrior Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('boundaries')}
              className={`pb-2 px-3 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'boundaries'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>Past & Future Boundaries (Admin Edit)</span>
              {isSavingCheck && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {activeTab === 'boundaries' && isAdmin ? (
            /* ============================================================== */
            /* ADMIN PAST & FUTURE BOUNDARIES & HABIT GRID                     */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Week Navigation Pager (Admin Unrestricted Past & Future) */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectWeekKey(prev => getOffsetWeekKey(prev, -1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="Navigate to Previous Week"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Prev Week</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectWeekKey(prev => getOffsetWeekKey(prev, 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="Navigate to Next Week"
                  >
                    <span className="hidden sm:inline">Next Week</span>
                    <ChevronRight size={16} />
                  </button>
                  {!isCurrentWeek && (
                    <button
                      type="button"
                      onClick={() => setInspectWeekKey(currentRealWeekKey)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                      title="Return to Current Real Week"
                    >
                      <RotateCcw size={12} />
                      <span>Current</span>
                    </button>
                  )}
                </div>

                <div className="text-center sm:text-right">
                  <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-end gap-1.5">
                    <Calendar size={13} className="text-amber-400" />
                    <span>{weekLabel}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {inspectWeekKey} {isCurrentWeek ? '· (Current Week)' : inspectWeekKey < currentRealWeekKey ? '· (Past Week)' : '· (Future Week)'}
                  </div>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between">
                <span>
                  Admin Mode: Click any past or future day cell to check or uncheck. Changes recalculate and sync to their profile in real time.
                </span>
                {isSavingCheck && (
                  <span className="text-[10px] font-mono text-amber-400 animate-pulse font-bold ml-2">
                    Syncing...
                  </span>
                )}
              </div>

              {/* Interactive Multi-Day Boundaries Table */}
              {isLoadingData ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading warrior habit boundaries from cloud...
                </div>
              ) : !warriorData || warriorData.categories.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  No habit categories registered for this warrior yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0A0C10]">
                  <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="py-2.5 px-3 font-semibold text-slate-300">Habit Category</th>
                        {dayDates.map(d => (
                          <th key={d.dayName} className="py-2.5 px-1.5 text-center font-mono text-slate-400">
                            <div className="text-[11px] font-bold text-slate-200">{d.dayName.slice(0, 3)}</div>
                            <div className="text-[9px] text-slate-500">{d.dateNum}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {warriorData.categories.map(cat => {
                        const weekChecks = warriorData.checks[inspectWeekKey] || {};
                        const catChecks = weekChecks[cat.id] || {};

                        return (
                          <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 font-medium text-white">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-white/5 text-slate-300">
                                  {renderCategoryIcon(cat.icon)}
                                </span>
                                <span className="truncate max-w-[160px]">{cat.name}</span>
                              </div>
                            </td>
                            {DAYS_OF_WEEK.map(day => {
                              const isChecked = !!catChecks[day];

                              return (
                                <td key={day} className="py-2 px-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHabitCell(cat.id, day)}
                                    className={`w-7 h-7 mx-auto rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                      isChecked
                                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm shadow-emerald-500/20'
                                        : 'bg-white/[0.03] border-white/10 text-slate-600 hover:border-white/30 hover:text-slate-400'
                                    }`}
                                    title={`Admin: Toggle ${cat.name} on ${day}`}
                                  >
                                    {isChecked ? (
                                      <Check size={13} className="stroke-[3.5]" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* STANDARD OVERVIEW TAB                                          */
            /* ============================================================== */
            <>
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
                  <span className="text-xs text-slate-400">Requirement</span>
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

              {/* Push-Up Metrics */}
              {(typeof warrior.dailyPushups === 'number' || typeof warrior.allTimePushups === 'number') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Daily Push-Ups</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {warrior.dailyPushups ?? 0} reps
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">All-Time Push-Ups</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {warrior.allTimePushups ?? 0} reps
                    </span>
                  </div>
                </div>
              )}

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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#121620] flex items-center justify-between text-xs text-slate-400">
          <div>
            Last active: {new Date(warrior.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && onInspectOnMainGrid && (
              <button
                type="button"
                onClick={() => {
                  onInspectOnMainGrid(warrior);
                  onClose();
                }}
                className="sm:hidden px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition-colors cursor-pointer"
              >
                Inspect on Grid
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
