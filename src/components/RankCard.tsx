/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRankProgress } from '../types';
import RankBadge from './RankBadge';
import { Sparkles, Trophy, ChevronRight, Target, CheckCircle2, AlertCircle, Plus, CalendarCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface RankCardProps {
  rankProgress: UserRankProgress;
  onOpenLadder: () => void;
  onAddQualifyingWeek?: (amount?: number) => void;
  isAdmin?: boolean;
}

export default function RankCard({ rankProgress, onOpenLadder, onAddQualifyingWeek, isAdmin = false }: RankCardProps) {
  const { 
    currentRank, 
    nextRank, 
    qualifyingWeeksCount, 
    grossQualifyingWeeksCount,
    downgradedWeeksCount,
    currentWeekRate, 
    currentWeekQualifies, 
    isCurrentWeekAtRisk,
    currentWeekStatus,
    totalChecks,
    eliteMaxStars 
  } = rankProgress;
  
  const isMaxTier = currentRank.id === 'elite_max';

  return (
    <div
      className={`p-6 rounded-3xl border bg-[#0C0E12] shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-500 backdrop-blur-xs ${
        isMaxTier 
          ? 'border-emerald-400/40 shadow-[0_0_35px_rgba(16,185,129,0.15)]' 
          : 'border-white/5'
      }`}
      id="rank-overview-widget"
    >
      {/* Background glow and subtle mesh */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: currentRank.accentColor }}
      />
      <div className="absolute inset-0 opacity-1 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span 
              className="p-1.5 rounded-xl text-xs flex items-center justify-center"
              style={{ backgroundColor: `${currentRank.accentColor}18`, color: currentRank.accentColor }}
            >
              <Trophy size={14} />
            </span>
            <span className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] font-medium">
              Discipline Ranking System
            </span>
          </div>

          <button
            onClick={onOpenLadder}
            className="flex items-center gap-1 text-[11px] font-sans font-medium text-gray-400 hover:text-white transition-colors cursor-pointer group"
            title="View 12 rank tiers & requirements"
          >
            <span>Ladder (12 Ranks)</span>
            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Current Rank Showcase (Begins at Bronze) */}
        <div className="flex items-start gap-4 mb-4">
          <RankBadge rank={currentRank} size="lg" showLabel={false} stars={eliteMaxStars} animated />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-sans font-bold tracking-tight text-white">
                {currentRank.name}
              </h2>
              <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentRank.badgeStyle}`}>
                Tier {currentRank.index + 1}/12
              </span>
              {eliteMaxStars > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-mono font-bold shadow-xs">
                  <span>⭐</span>
                  <span>{eliteMaxStars} {eliteMaxStars === 1 ? 'Star' : 'Stars'}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-sans text-gray-400 mt-0.5">
              {currentRank.title}
            </p>
            <p className="text-[11px] font-sans text-gray-500 mt-0.5">
              {currentRank.requiredWeeks === 0 
                ? 'Starting Rank: Bronze' 
                : `${currentRank.requiredWeeks} net qualifying score (≥80% = +1, <50% = -1)`}
            </p>
          </div>
        </div>

        {/* Weekly Promotion Criterion Banner: 80% / 50% Rule */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-[#08090D] border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-gray-300 font-medium flex items-center gap-1.5">
              <CalendarCheck size={13} className={currentWeekQualifies ? "text-emerald-400" : (isCurrentWeekAtRisk ? "text-rose-400" : "text-amber-400")} />
              This Week: <strong className={currentWeekQualifies ? "text-emerald-400" : (isCurrentWeekAtRisk ? "text-rose-400" : "text-white")}>{currentWeekRate}%</strong>
              <span className="text-gray-500 font-normal">/ 80% target</span>
            </span>

            {currentWeekStatus === 'promotion' ? (
              <span className="font-mono text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <CheckCircle2 size={11} /> 80%+ PROMOTION!
              </span>
            ) : currentWeekStatus === 'downgrade_risk' ? (
              <span className="font-mono text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 animate-pulse">
                <AlertCircle size={11} /> &lt;50% DOWNGRADE RISK
              </span>
            ) : (
              <span className="font-mono text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <span>●</span> SAFE (50%–79%)
              </span>
            )}
          </div>

          {/* Progress bar towards 80% and 50% thresholds */}
          <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
            {/* 50% Downgrade marker line */}
            <div 
              className="absolute top-0 bottom-0 left-[50%] w-[2px] bg-rose-500/70 z-20 pointer-events-none" 
              title="50% Downgrade Threshold"
            />
            {/* 80% Promotion marker line */}
            <div 
              className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-emerald-400/80 z-20 pointer-events-none" 
              title="80% Promotion Threshold"
            />
            
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                currentWeekQualifies
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : isCurrentWeekAtRisk
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${Math.min(100, currentWeekRate)}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, currentWeekRate)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span>≥80% = +1 Rank Up | &lt;50% = -1 Downgrade</span>
            {nextRank ? (
              <span className="text-gray-400">
                Next: <strong className="text-white">{nextRank.name}</strong>
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <Sparkles size={10} /> ELITE MAX (APEX) {eliteMaxStars > 0 && `(⭐ x${eliteMaxStars})`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Details & Action */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-sans text-xs flex items-center gap-1.5">
            <Target size={12} className="text-emerald-400" />
            <strong className="text-white font-mono">{qualifyingWeeksCount}</strong>
            <span className="text-gray-500">
              net score {downgradedWeeksCount > 0 && `(+${grossQualifyingWeeksCount}, -${downgradedWeeksCount})`}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Net score adjustment buttons: ONLY available for administrator accounts */}
          {isAdmin && onAddQualifyingWeek && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-[9px] font-mono text-amber-400 px-1 font-bold">Admin:</span>
              <button
                onClick={() => onAddQualifyingWeek(1)}
                className="px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Admin: Add +1 net score"
              >
                <Plus size={10} />
                <span>+1</span>
              </button>

              <button
                onClick={() => onAddQualifyingWeek(-1)}
                className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Admin: Subtract -1 net score"
              >
                <span>-1</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenLadder}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-sans font-medium transition-all cursor-pointer"
          >
            All 12 Ranks
          </button>
        </div>
      </div>
    </div>
  );
}
