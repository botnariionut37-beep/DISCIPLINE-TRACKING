/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RankDefinition, RankId, UserRankProgress } from '../types';
import { RANK_TIERS } from '../utils/ranks';
import RankBadge from './RankBadge';
import { 
  X, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  RotateCcw,
  CalendarCheck,
  Plus,
  Minus,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RankLadderModalProps {
  isOpen: boolean;
  onClose: () => void;
  rankProgress: UserRankProgress;
  onSelectRankOverride: (rankId: RankId | null) => void;
  onAddQualifyingWeek: (amount?: number) => void;
  onResetRankOverrides: () => void;
  currentOverrideRankId?: RankId | null;
  isAdmin?: boolean;
}

export default function RankLadderModal({
  isOpen,
  onClose,
  rankProgress,
  onSelectRankOverride,
  onAddQualifyingWeek,
  onResetRankOverrides,
  currentOverrideRankId,
  isAdmin = false
}: RankLadderModalProps) {
  if (!isOpen) return null;

  const { currentRank, qualifyingWeeksCount, currentWeekRate, currentWeekQualifies, eliteMaxStars } = rankProgress;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="rank-ladder-modal">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0C10] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/5 bg-[#0C0E12] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Trophy size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-sans font-bold text-white tracking-tight">
                    Discipline Ranking Ladder
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    ≥80% Promotion • &lt;50% Downgrade
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-sans mt-0.5">
                  Begins at <strong className="text-amber-500 font-semibold">Bronz</strong>. Achieve <strong className="text-emerald-400 font-semibold">≥80%</strong> discipline in a week to rank up (+1). Scoring <strong className="text-rose-400 font-semibold">&lt;50%</strong> in a week downgrades your score by 1 (-1).
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Close ladder"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Status & Testing Toolbar */}
          <div className="px-5 py-3 bg-[#08090D] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-gray-400 font-mono text-[11px]">Current Rank:</span>
              <RankBadge rank={currentRank} size="sm" showLabel showSubtitle={false} />
              <span className="font-mono text-gray-400 ml-1 text-[11px]">
                (Net Score: <strong className="text-white">{qualifyingWeeksCount}</strong>)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                currentWeekQualifies 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : (currentWeekRate < 50)
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                This Week: {currentWeekRate}% {currentWeekQualifies ? '(Promoting)' : (currentWeekRate < 50 ? '(Downgrade Risk)' : '(Safe)')}
              </span>
            </div>

            {/* Admin-only testing toolbar */}
            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap p-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 text-[10px] font-mono uppercase tracking-wider font-bold px-1">Admin Tools:</span>
                <button
                  onClick={() => onAddQualifyingWeek(1)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                  title="Admin: Simulate completing another week with >= 80% discipline (+1 score)"
                >
                  <Plus size={11} /> +1 Week (80%+)
                </button>

                <button
                  onClick={() => onAddQualifyingWeek(-1)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                  title="Admin: Simulate week with < 50% discipline (-1 downgrade)"
                >
                  <Minus size={11} /> -1 Week (&lt;50%)
                </button>

                <button
                  onClick={() => onSelectRankOverride('elite_max')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                  title="Admin: Preview ELITE MAX tier directly"
                >
                  <Sparkles size={11} /> ELITE MAX
                </button>

                {(currentOverrideRankId || qualifyingWeeksCount > 0) && (
                  <button
                    onClick={onResetRankOverrides}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/10 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                    title="Admin: Reset overrides"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 12 Ranks List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 divide-y divide-white/5">
            {RANK_TIERS.map((tier) => {
              const isCurrent = currentRank.id === tier.id;
              const isUnlocked = qualifyingWeeksCount >= tier.requiredWeeks;

              return (
                <div
                  key={tier.id}
                  className={`pt-3.5 first:pt-0 p-4 rounded-2xl transition-all duration-300 border ${
                    isCurrent
                      ? `bg-[#0E131F] border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30`
                      : isUnlocked
                      ? 'bg-[#0C0E12] border-white/5 hover:border-white/15'
                      : 'bg-[#090A0D]/60 border-white/5 opacity-75 hover:opacity-100'
                  }`}
                  id={`ladder-rank-${tier.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Rank Badge & Names */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="relative">
                        <RankBadge rank={tier} size="md" showLabel={false} />
                        {isCurrent && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0A0C10] animate-ping" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-sans font-bold text-white tracking-wide">
                            {tier.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                            Tier {tier.index + 1}/12
                          </span>
                          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${tier.badgeStyle}`}>
                            {tier.tierCategory}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-400 text-black flex items-center gap-1 shadow-xs">
                              <CheckCircle2 size={10} /> ACTIVE RANK
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-sans text-gray-400 mt-0.5">
                          {tier.title}
                        </p>
                        <p className="text-[11px] font-sans italic text-gray-500 mt-1">
                          "{tier.quote}"
                        </p>
                      </div>
                    </div>

                    {/* Requirements: 80% weekly achievement */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5 font-mono text-xs">
                          {isUnlocked ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 size={13} /> Unlocked
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <Lock size={12} /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-1 sm:justify-end">
                          <CalendarCheck size={11} className="text-emerald-400" />
                          {tier.requiredWeeks === 0 
                            ? 'Starting Rank (Bronze)' 
                            : `${tier.requiredWeeks} week${tier.requiredWeeks === 1 ? '' : 's'} at ≥80% discipline`}
                        </p>
                      </div>

                      {/* Select / Test Rank Button (Admin only) or Status Pill */}
                      {isAdmin ? (
                        <button
                          onClick={() => onSelectRankOverride(tier.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                          }`}
                          title={`Select or test ${tier.name}`}
                        >
                          <span>{isCurrent ? 'Current' : 'Select / Test'}</span>
                          <ChevronRight size={13} />
                        </button>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-sans font-medium ${
                          isCurrent 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold' 
                            : isUnlocked 
                            ? 'text-gray-400' 
                            : 'text-gray-600'
                        }`}>
                          {isCurrent ? 'Active' : isUnlocked ? 'Achieved' : 'Locked'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier Perks & Requirements */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Perks:</span>
                    {tier.perks.map((perk, pIdx) => (
                      <span
                        key={pIdx}
                        className="text-[10px] font-sans px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-[#0C0E12] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 font-sans">
            <span>
              💡 <strong>Promotion Rule:</strong> Complete any week with <strong>80% or more discipline rate</strong> to rank up to the next tier!
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
