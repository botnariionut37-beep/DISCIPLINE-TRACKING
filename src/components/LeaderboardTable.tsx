import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Search, 
  Flame, 
  CheckCircle2, 
  ChevronRight, 
  SlidersHorizontal, 
  User, 
  ShieldCheck, 
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { LeaderboardEntry, LeaderboardSettings } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';
import { LeaderboardPodium } from './LeaderboardPodium';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  onSelectWarrior: (warrior: LeaderboardEntry) => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  settings: LeaderboardSettings;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentUserId,
  onSelectWarrior,
  onOpenSettings,
  onOpenAuth,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'elite' | 'prestige' | 'mine'>('all');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search
      const name = (entry.customAlias || entry.displayName).toLowerCase();
      const rank = entry.rankName.toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || rank.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter
      if (filterTier === 'elite') {
        return entry.tierCategory === 'Elite' || entry.tierCategory === 'Apex';
      }
      if (filterTier === 'prestige') {
        return entry.tierCategory === 'Prestige' || entry.tierCategory === 'Advanced';
      }
      if (filterTier === 'mine') {
        return entry.userId === currentUserId;
      }
      return true;
    });
  }, [entries, searchQuery, filterTier, currentUserId]);

  const currentUserIndex = useMemo(() => {
    if (!currentUserId) return -1;
    return entries.findIndex(e => e.userId === currentUserId);
  }, [entries, currentUserId]);

  const currentUserEntry = currentUserIndex >= 0 ? entries[currentUserIndex] : null;

  return (
    <div className="w-full space-y-6">
      
      {/* Top Banner / Hero Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#121622] via-[#0E1118] to-[#121622] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Community Arena Leaderboard</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                Verified Accounts Only
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real registered warriors ranked by Discipline Rank Tier, Qualifying Weeks, and Weekly Execution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {!currentUserId && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In to Rank</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Alias & Privacy</span>
            {!settings.isPublic && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-bold">
                Private
              </span>
            )}
          </button>
        </div>
      </div>

      {/* User's Personal Standing Bar (if authenticated) */}
      {currentUserEntry && (
        <div 
          onClick={() => onSelectWarrior(currentUserEntry)}
          className="cursor-pointer p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between hover:bg-emerald-950/30 transition-all shadow-md group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/40">
              #{currentUserIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {currentUserEntry.customAlias || currentUserEntry.displayName}
                </span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Your Standing
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>Rank: <strong className="text-white">{currentUserEntry.rankName}</strong></span>
                <span>&bull;</span>
                <span>Weekly Rate: <strong className="text-emerald-400">{currentUserEntry.disciplineScore}%</strong></span>
                <span>&bull;</span>
                <span>Qualifying: <strong className="text-white">{currentUserEntry.qualifyingWeeks} wks</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Inspect Progress</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Top 3 Champions Podium (if we have entries) */}
      {entries.length > 0 ? (
        <LeaderboardPodium
          entries={entries.slice(0, 3)}
          currentUserId={currentUserId}
          onSelectWarrior={onSelectWarrior}
        />
      ) : (
        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-b from-[#131722] to-[#0A0C10] border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Arena Ready for Registered Warriors
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All simulated bots have been removed. This leaderboard exclusively features authentic, registered accounts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!currentUserId ? (
              onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In & Claim Your Rank</span>
                </button>
              )
            ) : !settings.isPublic ? (
              <button
                onClick={onOpenSettings}
                className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Enable Public Visibility in Settings</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Your profile is registered and publishing to the Arena</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warriors or ranks..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#121622] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTier === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Warriors ({entries.length})
            </button>
            <button
              onClick={() => setFilterTier('elite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTier === 'elite'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Elite & Apex
            </button>
            <button
              onClick={() => setFilterTier('prestige')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTier === 'prestige'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Prestige & Advanced
            </button>
            {currentUserEntry && (
              <button
                onClick={() => setFilterTier('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterTier === 'mine'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                My Entry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Rankings List */}
      {entries.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0E1118]/80 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Warrior</th>
                <th className="py-3 px-4">Discipline Tier</th>
                <th className="py-3 px-4">This Week</th>
                <th className="py-3 px-4 text-center">Qualifying Wks</th>
                <th className="py-3 px-4">Top Focus Habits</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredEntries.map((warrior, idx) => {
                const rankMeta = RANK_TIERS.find(r => r.index === warrior.rankIndex) || RANK_TIERS[0];
                const isMe = warrior.userId === currentUserId;
                const absolutePosition = entries.findIndex(e => e.userId === warrior.userId) + 1;

                return (
                  <tr 
                    key={warrior.userId}
                    onClick={() => onSelectWarrior(warrior)}
                    className={`cursor-pointer transition-colors group ${
                      isMe 
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30' 
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${
                        absolutePosition === 1 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30' :
                        absolutePosition === 2 ? 'bg-slate-300 text-black' :
                        absolutePosition === 3 ? 'bg-amber-700 text-white' :
                        'bg-white/5 text-slate-400 border border-white/5'
                      }`}>
                        #{absolutePosition}
                      </span>
                    </td>

                    {/* Warrior Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl overflow-hidden p-0.5 flex-shrink-0 shadow"
                          style={{ background: `linear-gradient(135deg, ${rankMeta.accentColor}, #1A202C)` }}
                        >
                          {warrior.photoURL ? (
                            <img 
                              src={warrior.photoURL} 
                              alt={warrior.displayName} 
                              className="w-full h-full object-cover rounded-[9px]" 
                            />
                          ) : (
                            <div className="w-full h-full bg-[#131722] flex items-center justify-center font-bold text-white text-xs">
                              {warrior.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white group-hover:text-indigo-300 transition-colors truncate flex items-center gap-1.5">
                            <span className="truncate">{warrior.customAlias || warrior.displayName}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Active {new Date(warrior.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Discipline Rank Tier */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                        style={{
                          color: rankMeta.accentColor,
                          borderColor: `${rankMeta.accentColor}35`,
                          backgroundColor: `${rankMeta.accentColor}12`,
                        }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{rankMeta.name}</span>
                        {rankMeta.id === 'elite_max' && warrior.qualifyingWeeks > 11 && (
                          <span className="text-amber-400 font-mono font-bold">
                            ⭐x{warrior.qualifyingWeeks - 11}
                          </span>
                        )}
                        <span className="text-[10px] opacity-70">({rankMeta.tierCategory})</span>
                      </div>
                    </td>

                    {/* Weekly Rate */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 w-28">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            {warrior.disciplineScore}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {warrior.weeklyCompletedChecks}/{warrior.weeklyTargetChecks}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              warrior.disciplineScore >= 80 
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, warrior.disciplineScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Qualifying Weeks */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] text-white font-bold text-xs">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        {warrior.qualifyingWeeks} wks
                      </span>
                    </td>

                    {/* Top Focus Habits */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        {(warrior.topHabits || []).slice(0, 2).map((habit) => (
                          <span
                            key={habit.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-slate-300 truncate max-w-[120px]"
                            title={`${habit.name}: ${habit.rate}%`}
                          >
                            <span className="truncate">{habit.name}</span>
                            <strong className={habit.rate >= 80 ? 'text-emerald-400' : 'text-slate-400'}>
                              {habit.rate}%
                            </strong>
                          </span>
                        ))}
                        {(warrior.topHabits?.length || 0) > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{(warrior.topHabits?.length || 0) - 2} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Inspect Link */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors text-xs font-medium">
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No warriors match the current filter or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-[#0E1118]/80 p-12 text-center text-slate-400 space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">The Arena is Ready</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All artificial bots have been removed. Sign in or complete your habit checks to claim the #1 spot on the community leaderboard!
            </p>
          </div>
          {!currentUserId && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Sign In & Claim Your Rank</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
