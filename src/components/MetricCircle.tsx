/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface MetricCircleProps {
  percentage: number;
  completed: number;
  total: number;
}

export default function MetricCircle({ percentage, completed, total }: MetricCircleProps) {
  // SVG circular properties
  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Compute color based on performance
  const getColorScheme = (p: number) => {
    if (p < 40) return {
      stroke: 'stroke-rose-500', 
      text: 'text-rose-400', 
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Struggling'
    };
    if (p < 70) return {
      stroke: 'stroke-amber-500', 
      text: 'text-amber-400', 
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'Building'
    };
    if (p < 90) return {
      stroke: 'stroke-teal-500', 
      text: 'text-teal-400', 
      badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      label: 'Disciplined'
    };
    return {
      stroke: 'stroke-emerald-400', 
      text: 'text-emerald-400', 
      badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
      label: 'Stoic Mastery'
    };
  };

  const scheme = getColorScheme(percentage);

  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-xs relative overflow-hidden" id="metric-gauge-card">
      {/* Decorative subtle background grid accent */}
      <div className="absolute inset-0 opacity-1 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      
      <h3 className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-4">Discipline Rate</h3>

      <div className="relative flex items-center justify-center w-52 h-52">
        {/* Glow behind the gauge */}
        <div className={`absolute w-32 h-32 rounded-full blur-3xl opacity-5 transition-all duration-500 ${
          percentage < 40 ? 'bg-rose-500' : percentage < 70 ? 'bg-amber-500' : percentage < 90 ? 'bg-teal-500' : 'bg-emerald-400'
        }`} />

        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx="104"
            cy="104"
            r={radius}
            className="stroke-white/5"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Foreground circle path */}
          <motion.circle
            cx="104"
            cy="104"
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

        {/* Center label content */}
        <div className="absolute flex flex-col items-center text-center">
          <motion.span 
            className="text-5xl font-sans font-light tracking-tight text-white leading-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={percentage}
          >
            {Math.round(percentage)}
            <span className="text-xl font-light text-gray-500 ml-0.5">%</span>
          </motion.span>
          <span className={`text-[9px] font-mono uppercase tracking-widest font-semibold mt-3 px-2 py-0.5 rounded-full border ${scheme.badge}`}>
            {scheme.label}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-sans font-medium text-gray-300">
          {completed} of {total} completed
        </p>
        <p className="font-mono text-[9px] text-gray-500 mt-1 uppercase tracking-wider">
          {total === 0 ? "Add categories to begin" : "Real-time accuracy based on checks"}
        </p>
      </div>
    </div>
  );
}
