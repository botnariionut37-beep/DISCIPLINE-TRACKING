/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { Category, WeeklyChecks, DAYS_OF_WEEK } from '../types';
import { getOffsetWeekKey, getMondayOfKey, getWeekKey } from '../utils/date';
import { TrendingUp, Sparkles, AlertTriangle, ShieldCheck, Calendar, Activity } from 'lucide-react';

interface DisciplineTrendChartProps {
  categories: Category[];
  allChecks: WeeklyChecks;
  currentWeekKey: string;
  onSelectWeek?: (weekKey: string) => void;
  accountStartDate?: Date | string | null;
}

interface TrendDataPoint {
  key: string;
  label: string;
  shortDate: string;
  rate: number;
  completed: number;
  total: number;
  status: 'promotion' | 'neutral' | 'downgrade';
  isCurrent: boolean;
}

export default function DisciplineTrendChart({
  categories,
  allChecks,
  currentWeekKey,
  onSelectWeek,
  accountStartDate
}: DisciplineTrendChartProps) {
  // Determine account origin date
  const originDate = useMemo(() => {
    if (accountStartDate) {
      try {
        const d = new Date(accountStartDate);
        if (!isNaN(d.getTime())) return d;
      } catch {
        // fallback to now
      }
    }
    return new Date();
  }, [accountStartDate]);

  const originWeekKey = useMemo(() => getWeekKey(originDate), [originDate]);
  
  // Is this the very first week since the account was created/logged in?
  const isFirstWeek = originWeekKey === currentWeekKey;

  // View mode toggle: 'daily' (day-by-day progression) or 'weekly'
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>(() => {
    return isFirstWeek ? 'daily' : 'weekly';
  });

  // Calculate day-by-day progression within the current week starting from account origin day
  const dailyData: TrendDataPoint[] = useMemo(() => {
    const totalCategories = categories.length;
    if (totalCategories === 0) return [];

    const weekData = allChecks[currentWeekKey] || {};
    const originDayIdx = originDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const originDayMonIdx = originDayIdx === 0 ? 6 : originDayIdx - 1; // 0=Mon, 6=Sun

    const monday = getMondayOfKey(currentWeekKey);
    const points: TrendDataPoint[] = [];

    DAYS_OF_WEEK.forEach((dayName, idx) => {
      const date = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
      const shortDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      let dayCompleted = 0;
      categories.forEach(cat => {
        if (weekData[cat.id]?.[dayName]) {
          dayCompleted++;
        }
      });

      const dailyRate = Math.round((dayCompleted / totalCategories) * 100);
      const isOriginDay = isFirstWeek && idx === originDayMonIdx;
      
      const status: 'promotion' | 'neutral' | 'downgrade' = 
        dailyRate >= 80 ? 'promotion' : (dailyRate < 50 ? 'downgrade' : 'neutral');

      points.push({
        key: `day-${dayName}`,
        label: isOriginDay ? `${dayName.slice(0, 3)} (Login)` : dayName.slice(0, 3),
        shortDate,
        rate: dailyRate,
        completed: dayCompleted,
        total: totalCategories,
        status,
        isCurrent: idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
      });
    });

    return points;
  }, [categories, allChecks, currentWeekKey, originDate, isFirstWeek]);

  // Calculate weekly progression beginning strictly at originWeekKey up to currentWeekKey (max 12 weeks)
  const weeklyData: TrendDataPoint[] = useMemo(() => {
    const points: TrendDataPoint[] = [];
    const totalCategories = categories.length;
    const totalPossible = totalCategories * 7;
    if (totalCategories === 0) return [];

    // Find the offset between originWeekKey and currentWeekKey
    const currentMonday = getMondayOfKey(currentWeekKey);
    const originMonday = getMondayOfKey(originWeekKey);
    
    // Weeks difference
    const diffWeeks = Math.round((currentMonday.getTime() - originMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const startOffset = -Math.min(12, Math.max(0, diffWeeks));

    for (let offset = startOffset; offset <= 0; offset++) {
      const targetWeekKey = getOffsetWeekKey(currentWeekKey, offset);
      const weekData = allChecks[targetWeekKey] || {};

      let completed = 0;
      categories.forEach(cat => {
        const catChecks = weekData[cat.id] || {};
        DAYS_OF_WEEK.forEach(day => {
          if (catChecks[day]) completed++;
        });
      });

      const rate = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0;
      const monday = getMondayOfKey(targetWeekKey);
      const shortDate = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const weekNum = targetWeekKey.split('-W')[1] || '';
      const isCurrent = targetWeekKey === currentWeekKey;
      const isOrigin = targetWeekKey === originWeekKey;

      const status: 'promotion' | 'neutral' | 'downgrade' = 
        rate >= 80 ? 'promotion' : (rate < 50 ? 'downgrade' : 'neutral');

      points.push({
        key: targetWeekKey,
        label: isOrigin && isCurrent 
          ? 'Login Week' 
          : isOrigin 
          ? `W${weekNum} (Start)` 
          : isCurrent 
          ? 'Active Week' 
          : `W${weekNum}`,
        shortDate,
        rate,
        completed,
        total: totalPossible,
        status,
        isCurrent
      });
    }

    return points;
  }, [categories, allChecks, currentWeekKey, originWeekKey]);

  // Current active data set according to viewMode
  const data = viewMode === 'daily' ? dailyData : weeklyData;

  // Compute average discipline rate over visible points
  const averageRate = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.rate, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const promotionsCount = useMemo(() => {
    return data.filter(d => d.status === 'promotion').length;
  }, [data]);

  const downgradesCount = useMemo(() => {
    return data.filter(d => d.status === 'downgrade').length;
  }, [data]);

  // Custom sleek tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point: TrendDataPoint = payload[0].payload;
      return (
        <div className="bg-[#0C0E12] border border-white/10 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md min-w-[210px]">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5">
            <span className="text-xs font-mono font-bold text-white">
              {point.label} ({point.shortDate})
            </span>
            {point.isCurrent && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                Today
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-sans">Discipline Rate:</span>
              <span className={`font-mono font-bold ${
                point.status === 'promotion' 
                  ? 'text-emerald-400' 
                  : point.status === 'downgrade' 
                  ? 'text-rose-400' 
                  : 'text-amber-400'
              }`}>
                {point.rate}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-sans">Checks Completed:</span>
              <span className="font-mono text-gray-200">
                {point.completed} / {point.total}
              </span>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-sans uppercase">Score Impact:</span>
              {point.status === 'promotion' && (
                <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Sparkles size={11} /> +1 Promotes
                </span>
              )}
              {point.status === 'neutral' && (
                <span className="text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1">
                  <ShieldCheck size={11} /> Maintained
                </span>
              )}
              {point.status === 'downgrade' && (
                <span className="text-[11px] font-mono font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={11} /> -1 Downgraded
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formattedOriginDate = useMemo(() => {
    return originDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [originDate]);

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] shadow-xl relative overflow-hidden backdrop-blur-xs" id="discipline-trend-chart">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 px-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={14} />
            </span>
            <h3 className="text-white font-sans font-bold text-base tracking-tight">
              Discipline Progression Trend
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              Origin: {formattedOriginDate}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-sans">
            Tracking begins on the day your account logged in. 80%+ awards +1 rank, less than 50% downgrades by 1.
          </p>
        </div>

        {/* View Switcher: Daily vs Weekly */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#08090D] border border-white/10 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity size={12} />
            <span>Daily View</span>
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'weekly'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar size={12} />
            <span>Weekly Trend</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 relative z-10">
        <div className="p-3 rounded-2xl bg-[#08090D] border border-white/5">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Average Rate</span>
          <span className="text-lg font-mono font-bold text-white mt-0.5 block">{averageRate}%</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#08090D] border border-white/5">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Trend Beginning</span>
          <span className="text-xs font-mono font-semibold text-emerald-400 mt-1 block truncate">
            {formattedOriginDate}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#08090D] border border-white/5">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Promotion Weeks (≥80%)</span>
          <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
            <Sparkles size={14} /> +{promotionsCount}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#08090D] border border-white/5">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Downgrades (&lt;50%)</span>
          <span className="text-lg font-mono font-bold text-rose-400 mt-0.5 flex items-center gap-1">
            <AlertTriangle size={14} /> -{downgradesCount}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

            <XAxis
              dataKey="label"
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              tick={{ fill: '#9CA3AF' }}
              dy={6}
            />

            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 80, 100]}
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#9CA3AF' }}
            />

            {/* 80% Rank-Up Promotion Threshold Reference Line */}
            <ReferenceLine
              y={80}
              stroke="#10B981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '80% Promotion (+1)',
                position: 'insideTopRight',
                fill: '#10B981',
                fontSize: 10,
                fontFamily: 'monospace',
                offset: 5
              }}
            />

            {/* 50% Downgrade Threshold Reference Line */}
            <ReferenceLine
              y={50}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '50% Downgrade (-1)',
                position: 'insideBottomRight',
                fill: '#EF4444',
                fontSize: 10,
                fontFamily: 'monospace',
                offset: 5
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="rate"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isCur = payload.isCurrent;
                const status = payload.status;
                const fillColor = status === 'promotion' ? '#10B981' : (status === 'downgrade' ? '#EF4444' : '#F59E0B');
                const strokeColor = isCur ? '#FFFFFF' : fillColor;

                return (
                  <circle
                    key={`dot-${payload.key}`}
                    cx={cx}
                    cy={cy}
                    r={isCur ? 6 : 4}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isCur ? 2.5 : 1.5}
                    className="cursor-pointer transition-all duration-300 hover:scale-125"
                    onClick={() => {
                      if (viewMode === 'weekly' && onSelectWeek) {
                        onSelectWeek(payload.key);
                      }
                    }}
                  />
                );
              }}
              activeDot={{
                r: 7,
                fill: '#10B981',
                stroke: '#FFFFFF',
                strokeWidth: 2.5
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend with Explanations */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 font-sans relative z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-gray-300 font-mono">≥80% (+1 Promotion)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-gray-400 font-mono">50%–79% (Maintained)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px] text-rose-400 font-mono">&lt;50% (-1 Downgrade)</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-gray-500">
          Account Origin: {formattedOriginDate}
        </span>
      </div>
    </div>
  );
}
