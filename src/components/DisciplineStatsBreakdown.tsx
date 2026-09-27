/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, DayOfWeek, DAYS_OF_WEEK, DAY_ABBREVIATIONS, UserRankProgress, WeeklyChecks } from '../types';
import * as LucideIcons from 'lucide-react';
import { Award, Flame, CalendarDays, TrendingUp, Trophy } from 'lucide-react';
import RankBadge from './RankBadge';
import DisciplineTrendChart from './DisciplineTrendChart';

interface DisciplineStatsBreakdownProps {
  categories: Category[];
  checks: Record<string, Record<DayOfWeek, boolean>>;
  allChecks?: WeeklyChecks;
  weekKey: string;
  rankProgress?: UserRankProgress;
  onOpenLadder?: () => void;
  onSelectWeek?: (weekKey: string) => void;
  accountStartDate?: Date | string | null;
}

export default function DisciplineStatsBreakdown({ 
  categories, 
  checks, 
  allChecks,
  weekKey,
  rankProgress,
  onOpenLadder,
  onSelectWeek,
  accountStartDate
}: DisciplineStatsBreakdownProps) {
  // Helper to dynamically render a Lucide icon
  const renderIcon = (iconName: string, className: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Activity;
    return <IconComponent className={className} size={15} />;
  };

  // 1. Compute Category completions
  const categoryStats = categories.map(cat => {
    const catChecks = checks[cat.id] || {};
    const completedDays = DAYS_OF_WEEK.filter(day => catChecks[day]).length;
    const rate = Math.round((completedDays / 7) * 100);

    // Compute current consecutive check streak of the week starting from Mon -> Sun
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
      if (catChecks[DAYS_OF_WEEK[i]]) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    return {
      category: cat,
      completedDays,
      rate,
      streak: maxStreak
    };
  });

  // 2. Compute Day-of-the-Week completions
  const dayStats = DAYS_OF_WEEK.map(day => {
    let completed = 0;
    categories.forEach(cat => {
      if (checks[cat.id]?.[day]) {
        completed++;
      }
    });
    const total = categories.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { day, completed, total, rate };
  });

  // Find the highest completion rate day
  const bestDay = dayStats.reduce(
    (best, curr) => (curr.rate > best.rate ? curr : best), 
    { day: 'None' as DayOfWeek | 'None', rate: 0, completed: 0, total: 0 }
  );

  // Perfect categories count
  const perfectCount = categoryStats.filter(c => c.completedDays === 7).length;

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 text-emerald-400 border-white/5',
    indigo: 'bg-indigo-500 text-indigo-400 border-white/5',
    rose: 'bg-rose-500 text-rose-400 border-white/5',
    blue: 'bg-blue-500 text-blue-400 border-white/5',
    amber: 'bg-amber-500 text-amber-400 border-white/5',
    violet: 'bg-violet-500 text-violet-400 border-white/5',
    orange: 'bg-orange-500 text-orange-400 border-white/5',
    teal: 'bg-teal-500 text-teal-400 border-white/5',
  };

  const ringColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20',
    indigo: 'bg-indigo-500/20',
    rose: 'bg-rose-500/20',
    blue: 'bg-blue-500/20',
    amber: 'bg-amber-500/20',
    violet: 'bg-violet-500/20',
    orange: 'bg-orange-500/20',
    teal: 'bg-teal-500/20',
  };

  return (
    <div className="space-y-6" id="discipline-stats-container">
      {/* 8-Week Discipline Rate Trend Line Chart (Recharts) */}
      <DisciplineTrendChart
        categories={categories}
        allChecks={allChecks || { [weekKey]: checks }}
        currentWeekKey={weekKey}
        onSelectWeek={onSelectWeek}
        accountStartDate={accountStartDate}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visual Category Streaks & Status List */}
        <div className="md:col-span-2 p-6 rounded-3xl border border-white/5 bg-[#0C0E12] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="p-1 px-1.5 rounded-lg bg-white/5 text-emerald-400">
              <TrendingUp size={14} />
            </span>
            <h3 className="text-white font-sans font-medium text-sm">
              Category Breakdown
            </h3>
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
              <p className="text-sm">No statistics to display.</p>
              <p className="text-xs text-gray-600 mt-1">Add a category below to configure habits and begin tracking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryStats.map(({ category, completedDays, rate, streak }) => {
                const colorKey = category.color || 'indigo';
                const colorClass = colorMap[colorKey]?.split(' ')[0] || 'bg-indigo-500';
                const textClass = colorMap[colorKey]?.split(' ')[1] || 'text-indigo-400';

                return (
                  <div key={category.id} className="group relative" id={`stats-row-${category.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-xl ${colorClass}/10 ${textClass}`}>
                          {renderIcon(category.icon, "w-3.5 h-3.5")}
                        </span>
                        <span className="text-sm font-sans font-medium text-gray-300 group-hover:text-white transition-colors">
                          {category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-gray-500">
                          {completedDays}/7 Days ({rate}%)
                        </span>
                        {streak > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                            <Flame size={10} className="fill-amber-400 stroke-amber-400" />
                            {streak}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Fill bar & 7 Dots combined */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`} 
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      
                      {/* Mon -> Sun Small Dots Grid for each Category */}
                      <div className="flex gap-1 shrink-0 ml-1">
                        {DAYS_OF_WEEK.map(day => {
                          const isChecked = checks[category.id]?.[day];
                          return (
                            <div 
                              key={day}
                              className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                                isChecked 
                                  ? `${colorClass} border-transparent scale-110 shadow-xs` 
                                  : 'bg-[#0A0C10] border-white/10'
                              }`}
                              title={`${day}: ${isChecked ? 'Realized' : 'Missed'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Highlights & General Metrics Grid (Best Day, Perfect Count) */}
      <div className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] shadow-xl flex flex-col justify-between">
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="p-1 px-1.5 rounded-lg bg-white/5 text-emerald-400">
                <Award size={14} />
              </span>
              <h3 className="text-white font-sans font-medium text-sm">
                Discipline Insights
              </h3>
            </div>

            <div className="space-y-4">
              {/* Perfect Habit Achievements */}
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-[#0A0C10]">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Award size={18} />
                </span>
                <div>
                  <h4 className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                    Unbroken Habits
                  </h4>
                  <p className="text-sm font-sans font-medium text-white mt-0.5">
                    {perfectCount} {perfectCount === 1 ? 'Category' : 'Categories'} at 100%
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Completed 7/7 days this week
                  </p>
                </div>
              </div>

              {/* Best Day of the Week */}
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-[#0A0C10]">
                <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <h4 className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                    Prime Discipline Day
                  </h4>
                  <p className="text-sm font-sans font-medium text-white mt-0.5">
                    {bestDay.day !== 'None' && bestDay.rate > 0 ? (
                      `${bestDay.day} (${bestDay.rate}%)`
                    ) : (
                      'None Yet'
                    )}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {categories.length === 0 ? (
                      'Awaiting habit configuration.'
                    ) : bestDay.rate > 0 ? (
                      `Accomplished ${bestDay.completed} of ${bestDay.total} habits`
                    ) : (
                      'Perform daily checks to highlight peak focus.'
                    )}
                  </p>
                </div>
              </div>

              {/* Weekly Streak Milestone */}
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-[#0A0C10]">
                <span className="p-2.5 rounded-xl bg-rose-500/10 text-rose-450 shrink-0">
                  <Flame size={18} />
                </span>
                <div>
                  <h4 className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                    Total Weekly Actions
                  </h4>
                  <p className="text-sm font-sans font-medium text-white mt-0.5">
                    {Object.values(checks).reduce((acc, currentCat) => {
                      return acc + Object.values(currentCat).filter(Boolean).length;
                    }, 0)} completed checks
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Keep momentum to reach full consistency
                  </p>
                </div>
              </div>

              {/* Current Discipline Rank Status */}
              {rankProgress && (
                <div 
                  onClick={onOpenLadder}
                  className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/5 bg-[#0A0C10] hover:border-emerald-500/30 transition-all cursor-pointer group"
                  title="Click to view full 12 rank tier ladder"
                >
                  <div className="flex items-center gap-3">
                    <RankBadge rank={rankProgress.currentRank} size="sm" showLabel={false} />
                    <div>
                      <h4 className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                        Current Rank Tier
                      </h4>
                      <p className="text-sm font-sans font-bold text-white mt-0.5 group-hover:text-emerald-400 transition-colors">
                        {rankProgress.currentRank.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Tier {rankProgress.currentRank.index + 1} of 12 • {rankProgress.qualifyingWeeksCount} {rankProgress.qualifyingWeeksCount === 1 ? 'week' : 'weeks'} at ≥80%
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 group-hover:underline">
                    Ladder &rarr;
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <p className="font-mono text-[9px] text-gray-500 text-center uppercase tracking-[0.15em] leading-relaxed">
              "First say to yourself what you would be; and then do what you have to do."
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
