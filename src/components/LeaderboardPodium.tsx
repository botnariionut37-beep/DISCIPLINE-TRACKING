import React from 'react';
import { Crown, Trophy, Medal, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { LeaderboardEntry } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  onSelectWarrior: (warrior: LeaderboardEntry) => void;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  entries,
  currentUserId,
  onSelectWarrior,
}) => {
  if (entries.length === 0) return null;

  const first = entries[0];
  const second = entries.length > 1 ? entries[1] : null;
  const third = entries.length > 2 ? entries[2] : null;

  const getRankMeta = (entry: LeaderboardEntry) => {
    return RANK_TIERS.find(r => r.index === entry.rankIndex) || RANK_TIERS[0];
  };

  const renderPodiumCard = (
    entry: LeaderboardEntry | null,
    position: 1 | 2 | 3
  ) => {
    if (!entry) return null;

    const rankMeta = getRankMeta(entry);
    const isMe = currentUserId === entry.userId;

    const config = {
      1: {
        order: 'order-1 md:order-2',
        height: 'h-64 sm:h-72',
        border: 'border-amber-400/50 hover:border-amber-300',
        bg: 'bg-gradient-to-b from-amber-500/15 via-[#16130B]/90 to-[#0C0E12]',
        badgeBg: 'bg-amber-400 text-black',
        icon: <Crown className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />,
        shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
        label: '1st Champion',
        scale: 'scale-105 z-10',
      },
      2: {
        order: 'order-2 md:order-1',
        height: 'h-56 sm:h-64',
        border: 'border-slate-300/40 hover:border-slate-200',
        bg: 'bg-gradient-to-b from-slate-400/10 via-[#13161C]/90 to-[#0C0E12]',
        badgeBg: 'bg-slate-300 text-black',
        icon: <Trophy className="w-4 h-4 text-slate-300" />,
        shadow: 'shadow-[0_0_20px_rgba(203,213,225,0.15)]',
        label: '2nd Runner-up',
        scale: 'scale-100',
      },
      3: {
        order: 'order-3 md:order-3',
        height: 'h-52 sm:h-60',
        border: 'border-amber-700/40 hover:border-amber-600',
        bg: 'bg-gradient-to-b from-amber-800/10 via-[#151210]/90 to-[#0C0E12]',
        badgeBg: 'bg-amber-700 text-amber-100',
        icon: <Medal className="w-4 h-4 text-amber-500" />,
        shadow: 'shadow-[0_0_20px_rgba(180,83,9,0.15)]',
        label: '3rd Place',
        scale: 'scale-95',
      },
    }[position];

    return (
      <div
        onClick={() => onSelectWarrior(entry)}
        className={`flex-1 flex flex-col justify-end items-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 ${config.order} ${config.scale}`}
      >
        {/* Crown / Trophy Floating Pill */}
        <div className="flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full bg-[#1A1F2C] border border-white/10 shadow-lg text-xs font-semibold">
          {config.icon}
          <span className="text-white/90">{config.label}</span>
          {isMe && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
              YOU
            </span>
          )}
        </div>

        {/* Podium Block Card */}
        <div
          className={`w-full rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-between border backdrop-blur-md ${config.border} ${config.bg} ${config.shadow} ${config.height}`}
        >
          {/* Avatar and Rank Ring */}
          <div className="relative group">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden p-0.5 shadow-xl transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${rankMeta.accentColor}, #111622)`,
              }}
            >
              {entry.photoURL ? (
                <img
                  src={entry.photoURL}
                  alt={entry.displayName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full bg-[#13161F] flex items-center justify-center font-bold text-lg text-white">
                  {entry.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Rank Position Badge */}
            <div
              className={`absolute -bottom-2 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs shadow-md ${config.badgeBg}`}
            >
              #{position}
            </div>
          </div>

          {/* Name & Tier Title */}
          <div className="text-center mt-3 w-full px-1">
            <h4 className="font-bold text-white text-sm sm:text-base truncate">
              {entry.customAlias || entry.displayName}
            </h4>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                style={{
                  color: rankMeta.accentColor,
                  borderColor: `${rankMeta.accentColor}40`,
                  backgroundColor: `${rankMeta.accentColor}15`,
                }}
              >
                {rankMeta.name}
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="w-full pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Discipline</div>
              <div className="font-black text-emerald-400 flex items-center gap-1 text-sm">
                <Flame className="w-3.5 h-3.5" />
                {entry.disciplineScore}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Qualifying</div>
              <div className="font-bold text-white flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                {entry.qualifyingWeeks} wks
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Champions of the Arena
          </h3>
          <p className="text-xs text-slate-400">
            Top ranked warriors leading by discipline tier and weekly execution
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end justify-center gap-4 sm:gap-6 pt-6 pb-2">
        {renderPodiumCard(second, 2)}
        {renderPodiumCard(first, 1)}
        {renderPodiumCard(third, 3)}
      </div>
    </div>
  );
};
