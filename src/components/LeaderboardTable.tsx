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
  Zap,
  Dumbbell,
  Target
} from 'lucide-react';
import { LeaderboardEntry, LeaderboardSettings } from '../types/leaderboard';
import { RANK_TIERS } from '../utils/ranks';
import { LeaderboardPodium, LeaderboardCategory } from './LeaderboardPodium';

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
  const [category, setCategory] = useState<LeaderboardCategory>('discipline');
  const [boardMode, setBoardMode] = useState<'all-time' | 'weekly'>('all-time');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'elite' | 'prestige' | 'mine'>('all');

  // Sorting according to Category & Sub-mode
  const sortedByModeEntries = useMemo(() => {
    const valid = entries.filter(e => {
      const name = (e.displayName || '').trim().toLowerCase();
      const alias = (e.customAlias || '').trim().toLowerCase();
      const id = (e.userId || '').trim().toLowerCase();
      return name !== 'just' && alias !== 'just' && id !== 'just';
    });

    return [...valid].sort((a, b) => {
      // 1. Daily Push-Ups Category
      if (category === 'daily-pushups') {
        const diffDaily = (b.dailyPushups ?? 0) - (a.dailyPushups ?? 0);
        if (diffDaily !== 0) return diffDaily;
        return b.disciplineScore - a.disciplineScore;
      }

      // 2. All-Time Push-Ups Category
      if (category === 'alltime-pushups') {
        const diffLifetime = (b.allTimePushups ?? 0) - (a.allTimePushups ?? 0);
        if (diffLifetime !== 0) return diffLifetime;
        return b.rankIndex - a.rankIndex;
      }

      // 3. Discipline Category
      if (boardMode === 'all-time') {
        if (b.rankIndex !== a.rankIndex) return b.rankIndex - a.rankIndex;
        if (b.qualifyingWeeks !== a.qualifyingWeeks) return b.qualifyingWeeks - a.qualifyingWeeks;
        if (b.disciplineScore !== a.disciplineScore) return b.disciplineScore - a.disciplineScore;
        return b.weeklyCompletedChecks - a.weeklyCompletedChecks;
      } else {
        if (b.disciplineScore !== a.disciplineScore) return b.disciplineScore - a.disciplineScore;
        if (b.weeklyCompletedChecks !== a.weeklyCompletedChecks) return b.weeklyCompletedChecks - a.weeklyCompletedChecks;
        return b.rankIndex - a.rankIndex;
      }
    });
  }, [entries, category, boardMode]);

  const filteredEntries = useMemo(() => {
    return sortedByModeEntries.filter((entry) => {
      const name = (entry.customAlias || entry.displayName).toLowerCase();
      const rank = entry.rankName.toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || rank.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

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
  }, [sortedByModeEntries, searchQuery, filterTier, currentUserId]);

  const currentUserIndex = useMemo(() => {
    if (!currentUserId) return -1;
    return sortedByModeEntries.findIndex(e => e.userId === currentUserId);
  }, [sortedByModeEntries, currentUserId]);

  const currentUserEntry = currentUserIndex >= 0 ? sortedByModeEntries[currentUserIndex] : null;

  return (
    <div className="w-full space-y-6">
      {/* Top Banner / Hero Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#121622] via-[#0E1118] to-[#121622] border border-white/10 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Community Arena Leaderboard</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Firebase RTDB Live</span>
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {category === 'daily-pushups'
              ? 'Daily Push-Up Arena: Warriors ranked by verified push-ups completed today.'
              : category === 'alltime-pushups'
              ? 'All-Time Push-Up Arena: Warriors ranked by lifetime verified push-up reps completed.'
              : boardMode === 'all-time'
              ? 'All-Time Discipline: Warriors are ranked primarily by their warrior Rank Tier and Qualifying Weeks.'
              : 'Weekly Discipline: Warriors are ranked strictly by current active week Discipline Completion Rate %.'}
          </p>
        </div>

        {/* Board Switcher & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {!currentUserId && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In to Rank</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm cursor-pointer"
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

      {/* Primary Category Selector Tabs (Discipline vs Daily Push-Ups vs All-Time Push-Ups) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          {/* Tab 1: Discipline Matrix */}
          <button
            onClick={() => setCategory('discipline')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              category === 'discipline'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Discipline Matrix</span>
          </button>

          {/* Tab 2: Daily Push-Ups */}
          <button
            onClick={() => setCategory('daily-pushups')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              category === 'daily-pushups'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap size={14} />
            <span>Daily Push-Ups</span>
          </button>

          {/* Tab 3: All-Time Push-Ups */}
          <button
            onClick={() => setCategory('alltime-pushups')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              category === 'alltime-pushups'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-md shadow-cyan-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={14} />
            <span>All-Time Push-Ups</span>
          </button>
        </div>

        {/* Sub-mode Toggle (Only visible under Discipline Matrix) */}
        {category === 'discipline' && (
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/5 self-end sm:self-auto">
            <button
              onClick={() => setBoardMode('all-time')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                boardMode === 'all-time'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All-Time Ranks
            </button>
            <button
              onClick={() => setBoardMode('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                boardMode === 'weekly'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Weekly Rate %
            </button>
          </div>
        )}
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
                  Your Standing ({category === 'daily-pushups' ? 'Daily Push-Ups' : category === 'alltime-pushups' ? 'All-Time Push-Ups' : boardMode === 'all-time' ? 'All-Time' : 'Weekly'})
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                {category === 'daily-pushups' ? (
                  <>
                    <span>Today's Reps: <strong className="text-amber-400 font-bold">{currentUserEntry.dailyPushups ?? 0} reps</strong></span>
                    <span>&bull;</span>
                    <span>Discipline: <strong className="text-emerald-400">{currentUserEntry.disciplineScore}%</strong></span>
                  </>
                ) : category === 'alltime-pushups' ? (
                  <>
                    <span>Lifetime Reps: <strong className="text-amber-400 font-bold">{currentUserEntry.allTimePushups ?? 0} reps</strong></span>
                    <span>&bull;</span>
                    <span>Rank: <strong className="text-white">{currentUserEntry.rankName}</strong></span>
                  </>
                ) : (
                  <>
                    <span>Rank: <strong className="text-white">{currentUserEntry.rankName}</strong></span>
                    <span>&bull;</span>
                    <span>Weekly Rate: <strong className="text-emerald-400">{currentUserEntry.disciplineScore}%</strong></span>
                    <span>&bull;</span>
                    <span>Qualifying: <strong className="text-white">{currentUserEntry.qualifyingWeeks} wks</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Inspect Progress</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Top 3 Champions Podium */}
      {filteredEntries.length > 0 && (
        <LeaderboardPodium
          entries={filteredEntries.slice(0, 3)}
          currentUserId={currentUserId}
          onSelectWarrior={onSelectWarrior}
          mode={boardMode}
          category={category}
        />
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search warriors or ranks..."
            className="w-full bg-[#11141E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'elite', 'prestige', 'mine'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer uppercase tracking-wider text-[10px] ${
                filterTier === tier
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : tier === 'mine' ? 'My Rank' : tier}
            </button>
          ))}
        </div>
      </div>

      {/* Warriors List / Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0C0E12] overflow-hidden shadow-xl">
        {/* Mobile Card List */}
        <div className="block md:hidden divide-y divide-white/5">
          {filteredEntries.map((warrior) => {
            const rankMeta = RANK_TIERS.find(r => r.index === warrior.rankIndex) || RANK_TIERS[0];
            const isMe = warrior.userId === currentUserId;
            const absolutePosition = sortedByModeEntries.findIndex(e => e.userId === warrior.userId) + 1;

            return (
              <div
                key={warrior.userId}
                onClick={() => onSelectWarrior(warrior)}
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  isMe ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs shrink-0 ${
                    absolutePosition === 1 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30' :
                    absolutePosition === 2 ? 'bg-slate-300 text-black' :
                    absolutePosition === 3 ? 'bg-amber-700 text-white' :
                    'bg-white/5 text-slate-400 border border-white/5'
                  }`}>
                    #{absolutePosition}
                  </span>

                  <div 
                    className="w-10 h-10 rounded-xl overflow-hidden p-0.5 shrink-0 shadow"
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
                    <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{warrior.customAlias || warrior.displayName}</span>
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span style={{ color: rankMeta.accentColor }} className="font-semibold">
                        {rankMeta.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {category === 'daily-pushups' ? (
                      <>
                        <span className="font-bold text-amber-400 text-sm flex items-center justify-end gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          <span>{warrior.dailyPushups ?? 0}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">reps today</span>
                      </>
                    ) : category === 'alltime-pushups' ? (
                      <>
                        <span className="font-bold text-amber-400 text-sm flex items-center justify-end gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>{warrior.allTimePushups ?? 0}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">lifetime</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-emerald-400 text-sm flex items-center justify-end gap-0.5">
                          <Flame className="w-3.5 h-3.5" />
                          {warrior.disciplineScore}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {warrior.weeklyCompletedChecks}/{warrior.weeklyTargetChecks}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}

          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No warriors match the current filter or search criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Place</th>
                <th className="py-3 px-4">Warrior</th>
                
                {category === 'daily-pushups' ? (
                  <>
                    <th className="py-3 px-4 text-amber-400 bg-amber-500/10 rounded-t-lg">
                      Today's Push-Ups (Primary)
                    </th>
                    <th className="py-3 px-4">Discipline Rate</th>
                    <th className="py-3 px-4">Rank Tier</th>
                  </>
                ) : category === 'alltime-pushups' ? (
                  <>
                    <th className="py-3 px-4 text-amber-400 bg-amber-500/10 rounded-t-lg">
                      Lifetime Push-Ups (Primary)
                    </th>
                    <th className="py-3 px-4">Rank Tier</th>
                    <th className="py-3 px-4">Discipline Rate</th>
                  </>
                ) : (
                  <>
                    <th className={`py-3 px-4 ${boardMode === 'all-time' ? 'text-amber-400 bg-amber-500/10 rounded-t-lg' : ''}`}>
                      Discipline Tier {boardMode === 'all-time' && '(Primary)'}
                    </th>
                    <th className={`py-3 px-4 ${boardMode === 'weekly' ? 'text-emerald-400 bg-emerald-500/10 rounded-t-lg' : ''}`}>
                      Weekly Rate {boardMode === 'weekly' && '(Primary)'}
                    </th>
                    <th className="py-3 px-4 text-center">Qualifying Wks</th>
                  </>
                )}

                <th className="py-3 px-4">Top Focus Habits</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredEntries.map((warrior) => {
                const rankMeta = RANK_TIERS.find(r => r.index === warrior.rankIndex) || RANK_TIERS[0];
                const isMe = warrior.userId === currentUserId;
                const absolutePosition = sortedByModeEntries.findIndex(e => e.userId === warrior.userId) + 1;

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

                    {/* Category Specific Columns */}
                    {category === 'daily-pushups' ? (
                      <>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-sm">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>{warrior.dailyPushups ?? 0} reps</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {warrior.disciplineScore}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-300">{rankMeta.name}</span>
                        </td>
                      </>
                    ) : category === 'alltime-pushups' ? (
                      <>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-sm">
                            <Trophy className="w-4 h-4 text-cyan-400" />
                            <span>{warrior.allTimePushups ?? 0} reps</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-300">{rankMeta.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {warrior.disciplineScore}%
                        </td>
                      </>
                    ) : (
                      <>
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
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {warrior.disciplineScore}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({warrior.weeklyCompletedChecks}/{warrior.weeklyTargetChecks})
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-300">
                          {warrior.qualifyingWeeks}
                        </td>
                      </>
                    )}

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {warrior.topHabits && warrior.topHabits.length > 0 ? (
                          warrior.topHabits.slice(0, 3).map((h) => (
                            <span 
                              key={h.id}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-slate-400 flex items-center gap-1"
                            >
                              <span>{h.name}</span>
                              <span className="text-emerald-400 font-mono font-bold">{h.rate}%</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">None logged</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
