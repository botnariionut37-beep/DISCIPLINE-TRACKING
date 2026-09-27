/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RankDefinition } from '../types';
import * as LucideIcons from 'lucide-react';
import { motion } from 'motion/react';

interface RankBadgeProps {
  rank: RankDefinition;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showSubtitle?: boolean;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function RankBadge({
  rank,
  size = 'md',
  showLabel = true,
  showSubtitle = false,
  animated = false,
  onClick,
  className = ''
}: RankBadgeProps) {
  // Dynamic Lucide icon lookup
  const IconComponent = (LucideIcons as any)[rank.iconName] || LucideIcons.Award;

  const isEliteMax = rank.id === 'elite_max';
  const isElite = rank.tierCategory === 'Elite';
  const isAdvanced = rank.tierCategory === 'Advanced';

  // Size mapping
  const sizeMap = {
    xs: {
      iconSize: 11,
      badgeBox: 'w-5 h-5 rounded-md',
      text: 'text-[10px]',
      padding: 'px-1.5 py-0.5 gap-1.5',
      emblemPad: 'p-1'
    },
    sm: {
      iconSize: 13,
      badgeBox: 'w-6 h-6 rounded-lg',
      text: 'text-xs',
      padding: 'px-2 py-1 gap-1.5',
      emblemPad: 'p-1.5'
    },
    md: {
      iconSize: 16,
      badgeBox: 'w-8 h-8 rounded-xl',
      text: 'text-sm font-medium',
      padding: 'px-3 py-1.5 gap-2.5',
      emblemPad: 'p-2'
    },
    lg: {
      iconSize: 22,
      badgeBox: 'w-12 h-12 rounded-2xl',
      text: 'text-base font-semibold',
      padding: 'px-4 py-2.5 gap-3',
      emblemPad: 'p-3'
    },
    xl: {
      iconSize: 32,
      badgeBox: 'w-18 h-18 rounded-3xl',
      text: 'text-2xl font-bold tracking-tight',
      padding: 'px-6 py-4 gap-4',
      emblemPad: 'p-4'
    }
  };

  const config = sizeMap[size];

  // Specific custom gradients for the requested ranks
  const getBadgeGradient = () => {
    switch (rank.id) {
      case 'bronz':
        return 'bg-gradient-to-br from-amber-600/30 via-orange-800/20 to-amber-950/40 text-amber-500 border border-amber-600/40 shadow-[0_0_12px_rgba(217,119,6,0.2)]';
      case 'gold':
        return 'bg-gradient-to-br from-yellow-400/30 via-amber-500/20 to-yellow-950/40 text-yellow-400 border border-yellow-400/50 shadow-[0_0_18px_rgba(250,204,21,0.3)]';
      case 'platinum':
        return 'bg-gradient-to-br from-slate-200/30 via-slate-400/20 to-slate-900/40 text-slate-100 border border-slate-300/50 shadow-[0_0_18px_rgba(226,232,240,0.3)]';
      case 'diamond':
        return 'bg-gradient-to-br from-cyan-400/30 via-sky-500/20 to-blue-950/40 text-cyan-300 border border-cyan-400/60 shadow-[0_0_22px_rgba(56,189,248,0.4)]';
      case 'advanced_1':
        return 'bg-gradient-to-br from-indigo-500/30 via-blue-600/20 to-indigo-950/40 text-indigo-300 border border-indigo-400/50 shadow-[0_0_18px_rgba(99,102,241,0.35)]';
      case 'advanced_2':
        return 'bg-gradient-to-br from-purple-500/30 via-fuchsia-600/20 to-purple-950/40 text-purple-300 border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]';
      case 'advanced_3':
        return 'bg-gradient-to-br from-pink-500/30 via-rose-600/20 to-pink-950/40 text-pink-300 border border-pink-400/60 shadow-[0_0_22px_rgba(236,72,153,0.4)]';
      case 'elite_1':
        return 'bg-gradient-to-br from-rose-500/30 via-red-600/25 to-rose-950/50 text-rose-300 border border-rose-400/60 shadow-[0_0_24px_rgba(244,63,94,0.45)]';
      case 'elite_2':
        return 'bg-gradient-to-br from-red-500/35 via-orange-600/25 to-red-950/50 text-red-200 border border-red-400/70 shadow-[0_0_26px_rgba(239,68,68,0.5)]';
      case 'elite_3':
        return 'bg-gradient-to-br from-orange-500/35 via-amber-600/25 to-orange-950/50 text-orange-200 border border-orange-400/70 shadow-[0_0_28px_rgba(249,115,22,0.55)]';
      case 'elite_4':
        return 'bg-gradient-to-br from-red-600/40 via-pink-600/30 to-red-950/60 text-white border border-red-400/80 shadow-[0_0_32px_rgba(220,38,38,0.65)]';
      case 'elite_max':
        return 'bg-gradient-to-r from-amber-500/30 via-emerald-400/30 to-purple-500/30 text-white border-2 border-emerald-400 shadow-[0_0_36px_rgba(16,185,129,0.7)]';
      default:
        return 'bg-white/10 text-white border border-white/20';
    }
  };

  const badgeContent = (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${config.padding} rounded-2xl bg-[#0C0E12] border transition-all duration-300 ${
        isEliteMax 
          ? 'border-emerald-400/50 hover:border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]' 
          : isElite
          ? 'border-rose-500/30 hover:border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
          : isAdvanced
          ? 'border-indigo-500/30 hover:border-indigo-400/60'
          : 'border-white/10 hover:border-white/20'
      } ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${className}`}
      title={`${rank.name} — ${rank.title}`}
    >
      {/* Visual Rank Insignia */}
      <div className={`relative flex items-center justify-center shrink-0 ${config.badgeBox} ${getBadgeGradient()}`}>
        {isEliteMax && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-400 to-purple-400 opacity-20 animate-pulse pointer-events-none" />
        )}
        <IconComponent size={config.iconSize} className="relative z-10 shrink-0" />
      </div>

      {/* Label and Subtitle */}
      {showLabel && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-sans font-bold tracking-wide ${rank.textColor} ${config.text}`}>
              {rank.name}
            </span>
            {isEliteMax && (
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-black uppercase tracking-widest bg-emerald-400 text-black rounded-sm shadow-xs">
                APEX
              </span>
            )}
          </div>
          {showSubtitle && (
            <span className="text-[10px] text-gray-400 font-sans font-normal truncate">
              {rank.title}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {badgeContent}
      </motion.div>
    );
  }

  return badgeContent;
}
