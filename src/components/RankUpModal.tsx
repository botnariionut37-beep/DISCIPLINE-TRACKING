/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { RankDefinition } from '../types';
import RankBadge from './RankBadge';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RankUpModalProps {
  unlockedRank: RankDefinition | null;
  onClose: () => void;
}

export default function RankUpModal({ unlockedRank, onClose }: RankUpModalProps) {
  useEffect(() => {
    if (unlockedRank) {
      // Fire confetti bursts!
      try {
        const duration = 2.5 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#10B981', '#F59E0B', '#6366F1', '#EC4899', '#38BDF8']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10B981', '#F59E0B', '#6366F1', '#EC4899', '#38BDF8']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } catch (e) {
        console.warn('Confetti animation suppressed or unsupported', e);
      }
    }
  }, [unlockedRank]);

  if (!unlockedRank) return null;

  const isEliteMax = unlockedRank.id === 'elite_max';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="rank-up-modal">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-lg bg-[#0C0E12] border rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden z-10 ${
            isEliteMax 
              ? 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/50' 
              : 'border-white/10'
          }`}
        >
          {/* Ambient colored backdrop aura */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ backgroundColor: unlockedRank.accentColor }}
          />

          {/* Top Banner Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-6">
            <Sparkles size={13} />
            <span>Discipline Promotion</span>
          </div>

          {/* Big Emblem */}
          <div className="relative my-2">
            <RankBadge rank={unlockedRank} size="xl" showLabel={false} animated />
            <motion.div
              className="absolute -inset-4 rounded-full border border-emerald-400/30 pointer-events-none"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.25, opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>

          {/* Title and Rank Name */}
          <h2 className="text-3xl font-sans font-black tracking-tight text-white mt-4">
            {unlockedRank.name}
          </h2>
          <p className="text-sm font-sans font-medium text-gray-300 mt-1">
            {unlockedRank.title}
          </p>

          <p className="text-xs font-sans italic text-gray-400 max-w-sm mt-3 leading-relaxed">
            "{unlockedRank.quote}"
          </p>

          {/* Unlocked Perks Card */}
          <div className="w-full mt-6 p-4 rounded-2xl bg-[#080A0E] border border-white/5 text-left">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-semibold mb-2 flex items-center gap-1.5">
              <Trophy size={11} className="text-amber-400" />
              <span>Tier Privileges Unlocked</span>
            </h4>
            <div className="space-y-1.5">
              {unlockedRank.perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                  <Check size={12} className="text-emerald-400 shrink-0 stroke-[3]" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Close / Claim Button */}
          <button
            onClick={onClose}
            className={`w-full mt-6 py-3.5 px-6 rounded-2xl font-sans font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isEliteMax
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/25 hover:shadow-emerald-500/40'
                : 'bg-white hover:bg-gray-100 text-black shadow-white/10 hover:shadow-white/20'
            }`}
          >
            <span>Claim Rank & Continue</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
