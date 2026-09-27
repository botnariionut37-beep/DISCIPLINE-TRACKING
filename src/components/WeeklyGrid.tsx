/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, DayOfWeek, DAYS_OF_WEEK } from '../types';
import * as LucideIcons from 'lucide-react';
import { Check, Edit3, Sparkles, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { getDayDates, getWeekKey } from '../utils/date';
import { chime } from '../utils/audio';

interface WeeklyGridProps {
  categories: Category[];
  checks: Record<string, Record<DayOfWeek, boolean>>;
  weekKey: string;
  onToggleCheck: (categoryId: string, day: DayOfWeek) => void;
  onEditCategoryTrigger: (cat: Category) => void;
  isAdmin: boolean;
}

export default function WeeklyGrid({
  categories,
  checks,
  weekKey,
  onToggleCheck,
  onEditCategoryTrigger,
  isAdmin,
}: WeeklyGridProps) {
  // Get calendar dates for this week key
  const dayDates = getDayDates(weekKey);
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const currentWeekKey = getWeekKey(new Date());

  const renderIcon = (iconName: string, className: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Activity;
    return <IconComponent className={className} size={15} />;
  };

  const colorMap: Record<string, { bg: string; text: string; ring: string; lightBg: string; border: string }> = {
    emerald: {
      bg: 'bg-emerald-500 hover:bg-emerald-400',
      text: 'text-emerald-400',
      ring: 'focus:ring-emerald-400',
      lightBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    indigo: {
      bg: 'bg-indigo-500 hover:bg-indigo-400',
      text: 'text-indigo-400',
      ring: 'focus:ring-indigo-400',
      lightBg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    rose: {
      bg: 'bg-rose-500 hover:bg-rose-450',
      text: 'text-rose-400',
      ring: 'focus:ring-rose-450',
      lightBg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    },
    blue: {
      bg: 'bg-blue-500 hover:bg-blue-400',
      text: 'text-blue-400',
      ring: 'focus:ring-blue-400',
      lightBg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    amber: {
      bg: 'bg-amber-500 hover:bg-amber-400',
      text: 'text-amber-400',
      ring: 'focus:ring-amber-400',
      lightBg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    violet: {
      bg: 'bg-violet-500 hover:bg-violet-400',
      text: 'text-violet-400',
      ring: 'focus:ring-violet-400',
      lightBg: 'bg-violet-500/10',
      border: 'border-violet-500/20'
    },
    orange: {
      bg: 'bg-orange-500 hover:bg-orange-400',
      text: 'text-orange-400',
      ring: 'focus:ring-orange-400',
      lightBg: 'bg-orange-500/10',
      border: 'border-orange-500/20'
    },
    teal: {
      bg: 'bg-teal-500 hover:bg-teal-400',
      text: 'text-teal-400',
      ring: 'focus:ring-teal-400',
      lightBg: 'bg-teal-500/10',
      border: 'border-teal-500/20'
    },
  };

  const handleToggleWrapper = (categoryId: string, day: DayOfWeek, currentState: boolean) => {
    onToggleCheck(categoryId, day);
    if (!currentState) {
      // Checked! Play sweet crystal chord
      chime.playCheck();
    } else {
      // Unchecked! Play descending soft buzz
      chime.playUncheck();
    }
  };

  // Compute active week completion rate for the 80% promotion rule
  let completedThisWeek = 0;
  categories.forEach(cat => {
    const catData = checks[cat.id] || {};
    DAYS_OF_WEEK.forEach(d => {
      if (catData[d]) completedThisWeek++;
    });
  });
  const totalPossible = categories.length * 7;
  const currentWeekRate = totalPossible > 0 ? Math.round((completedThisWeek / totalPossible) * 100) : 0;
  const qualifiesForPromotion = currentWeekRate >= 80;

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] shadow-xl overflow-hidden" id="weekly-discipline-table">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/5 text-emerald-400">
              <Sparkles size={14} />
            </span>
            <h3 className="text-white font-sans font-medium text-sm">
              Daily Execution Matrix
            </h3>
          </div>

          {/* 80% Promotion Rule Tracker */}
          {categories.length > 0 && (
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 border transition-all ${
              qualifiesForPromotion 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${qualifiesForPromotion ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span>
                {qualifiesForPromotion 
                  ? `★ 80%+ Achieved (${currentWeekRate}%) • Rank Up Qualified!`
                  : `Week Rate: ${currentWeekRate}% / 80% target to rank up`}
              </span>
            </div>
          )}
        </div>
        <div className="hidden sm:flex gap-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <Lock size={10} aria-hidden="true" />
            {isAdmin ? 'Admin: all days editable' : 'Only today editable'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-white/10 bg-[#0A0C10]" />
            Unchecked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Completed
          </span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <p className="text-gray-400 font-sans font-semibold text-sm">Create categories to begin tracking discipline.</p>
          <p className="text-gray-500 text-xs mt-1">Select "Add Custom Category" below to list daily goals.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-[700px]">
            {/* Grid Columns Definition */}
            {/* 1 Row for Headers */}
            <div className="grid grid-cols-10 gap-2 items-center text-center pb-3 border-b border-white/5">
              {/* Habits Column occupies 3 parts */}
              <div className="col-span-3 text-left pl-2">
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] font-medium">
                  Discipline Category
                </span>
              </div>

              {/* Day of the week columns: occupy 1 part each (total 7) */}
              {dayDates.map(({ dayName, dateNum }) => {
                const isToday = dayName === todayName && weekKey === currentWeekKey;
                return (
                  <div key={dayName} className="col-span-1 flex flex-col items-center py-1.5 rounded-xl">
                    <span className={`text-[10px] font-mono uppercase tracking-[0.2em] font-semibold ${
                      isToday ? 'text-white font-bold' : 'text-gray-500'
                    }`}>
                      {dayName.slice(0, 3)}
                    </span>
                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono mt-1 rounded-full ${
                      isToday 
                        ? 'bg-emerald-500 text-white font-bold shadow-xs scale-102' 
                        : 'text-gray-400 hover:text-white transition-colors'
                    }`}>
                      {dateNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Habit Grid Rows */}
            <div className="divide-y divide-white/5">
              {categories.map((cat) => {
                const colors = colorMap[cat.color] || colorMap.indigo;
                const catChecks = checks[cat.id] || {};
                
                // Calculate success metrics
                const completedCount = DAYS_OF_WEEK.filter(d => catChecks[d]).length;
                const percentage = Math.round((completedCount / 7) * 100);

                return (
                  <div key={cat.id} className="grid grid-cols-10 gap-2 items-center py-4 group animate-fade-in" id={`grid-row-${cat.id}`}>
                    {/* Habit Info Column */}
                    <div className="col-span-3 flex items-center justify-between pr-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`p-2 rounded-xl shrink-0 ${colors.lightBg} ${colors.text} border ${colors.border}`}>
                          {renderIcon(cat.icon, "w-4 h-4")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-sans font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                            {cat.name}
                          </p>
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                            {completedCount}/7 Days ({percentage}%)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onEditCategoryTrigger(cat)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        title="Modify habits"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>

                    {/* Day cells (interactive toggles) */}
                    {DAYS_OF_WEEK.map((day) => {
                      const isChecked = !!catChecks[day];
                      const isToday = day === todayName && weekKey === currentWeekKey;
                      const editable = isAdmin || isToday;

                      return (
                        <div key={day} className="col-span-1 flex justify-center">
                          <motion.button
                            onClick={() => {
                              if (!editable) return;
                              handleToggleWrapper(cat.id, day, isChecked);
                            }}
                            disabled={!editable}
                            aria-disabled={!editable}
                            whileTap={editable ? { scale: 0.92 } : undefined}
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 relative focus:outline-hidden ${colors.ring} ${
                              editable ? 'cursor-pointer' : 'cursor-not-allowed'
                            } ${
                              isChecked
                                ? `${colors.bg} border-transparent text-white shadow-lg shadow-emerald-500/5 ${editable ? '' : 'opacity-60'}`
                                : isToday
                                ? 'border-white/25 hover:border-white/40 bg-white/[0.02]'
                                : editable
                                ? 'border-white/10 hover:border-white/20 bg-[#0A0C10]'
                                : 'border-white/5 bg-[#0A0C10] opacity-50'
                            }`}
                            id={`check-${cat.id}-${day}`}
                            title={
                              editable
                                ? `Mark ${cat.name} as ${isChecked ? 'uncompleted' : 'completed'} for ${day}`
                                : `Locked: only today can be checked`
                            }
                          >
                            {editable && (
                              <span className="absolute inset-0 bg-white/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity" />
                            )}
                            
                            {/* Visual toggle feedback */}
                            {!editable && !isChecked ? (
                              <Lock size={11} className="text-gray-600" aria-hidden="true" />
                            ) : isChecked ? (
                              <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check size={14} className="stroke-[3.5]" />
                              </motion.div>
                            ) : (
                              <span className="text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                DONE
                              </span>
                            )}
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
