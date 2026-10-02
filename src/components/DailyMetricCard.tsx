/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sun, CheckCircle2, Target, Flame } from 'lucide-react';

interface DailyMetricCardProps {
  percentage: number;
  completed: number;
  total: number;
  dayName: string;
}

export const DailyMetricCard: React.FC<DailyMetricCardProps> = ({
  percentage,
  completed,
  total,
  dayName,
}) => {
  const radius = 72;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColorScheme = (p: number) => {
    if (p < 40) return {
      stroke: 'stroke-rose-500',
      text: 'text-rose-400',
      glow: 'bg-rose-500',
      label: 'Needs Focus'
    };
    if (p < 80) return {
      stroke: 'stroke-amber-400',
      text: 'text-amber-400',
      glow: 'bg-amber-400',
      label: 'In Progress'
    };
    return {
      stroke: 'stroke-cyan-400',
      text: 'text-cyan-400',
      glow: 'bg-cyan-400',
      label: 'Daily Mastery'
    };
  };

  const scheme = getColorScheme(percentage);
  const qualifiesToday = percentage >= 80;

  return (
    <div 
      className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden h-full shadow-xl"
      id="daily-metric-gauge-card"
    >
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-3">
        <Sun size={13} className="text-cyan-400" />
        <h3 className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.2em] font-medium">
          Daily Discipline Rate
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
          {dayName.slice(0, 3)}
        </span>
      </div>

      <div className="relative flex items-center justify-center w-44 h-44 my-1">
        {/* Glow */}
        <div className={`absolute w-24 h-24 rounded-full blur-2xl opacity-15 transition-all duration-500 ${scheme.glow}`} />

        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            className="stroke-white/5"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx="88"
            cy="88"
            r={radius}
            className={`${scheme.stroke} transition-all duration-300`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute flex flex-col items-center text-center">
          <motion.span 
            className="text-4xl font-sans font-light tracking-tight text-white leading-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={percentage}
          >
            {Math.round(percentage)}
            <span className="text-lg font-light text-gray-400 ml-0.5">%</span>
          </motion.span>
          <span className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">
            Today
          </span>
        </div>
      </div>

      {/* Completion Counter & Status */}
      <div className="flex flex-col items-center gap-1.5 mt-2 text-center">
        <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
          <CheckCircle2 size={13} className={qualifiesToday ? "text-cyan-400" : "text-gray-500"} />
          <strong className="text-white font-bold">{completed}</strong> of {total} habits completed
        </span>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
          qualifiesToday 
            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
            : 'bg-white/5 text-gray-400 border-white/5'
        }`}>
          {qualifiesToday ? '★ 80% Daily Goal Met' : `${Math.max(0, Math.ceil(total * 0.8) - completed)} left for 80% goal`}
        </span>
      </div>
    </div>
  );
};
