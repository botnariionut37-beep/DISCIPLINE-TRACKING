/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CheckSquare, 
  Trophy, 
  Shield, 
  BarChart3, 
  User, 
  Dumbbell 
} from 'lucide-react';
import { chime } from '../utils/audio';

interface MobileBottomNavProps {
  activeTab: 'matrix' | 'workout' | 'leaderboard';
  setActiveTab: (tab: 'matrix' | 'workout' | 'leaderboard') => void;
  onOpenRankLadder: () => void;
  onScrollToStats: () => void;
  onOpenAccount: () => void;
  userRankName?: string;
  isLoggedIn?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenRankLadder,
  onScrollToStats,
  onOpenAccount,
  userRankName,
  isLoggedIn,
}) => {
  const handleNavClick = (action: () => void) => {
    chime.playTick();
    action();
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 block sm:hidden bg-[#0A0D14]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-bottom shadow-[0_-8px_25px_rgba(0,0,0,0.7)]"
    >
      <div className="grid grid-cols-5 items-center justify-around gap-1 max-w-md mx-auto">
        {/* 1. Habits / Tracker */}
        <button
          type="button"
          onClick={() => handleNavClick(() => {
            setActiveTab('matrix');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          })}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'matrix' 
              ? 'text-emerald-400 bg-emerald-500/10 font-bold' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5 stroke-[2]" />
            {activeTab === 'matrix' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-sans mt-1 tracking-tight">Habits</span>
        </button>

        {/* 2. Workout Section */}
        <button
          type="button"
          onClick={() => handleNavClick(() => {
            setActiveTab('workout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          })}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'workout' 
              ? 'text-cyan-400 bg-cyan-500/10 font-bold' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Dumbbell className="w-5 h-5 stroke-[2]" />
            {activeTab === 'workout' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-sans mt-1 tracking-tight">Workout</span>
        </button>

        {/* 3. Arena / Leaderboard */}
        <button
          type="button"
          onClick={() => handleNavClick(() => {
            setActiveTab('leaderboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          })}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'leaderboard' 
              ? 'text-amber-400 bg-amber-500/10 font-bold' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Trophy className="w-5 h-5 stroke-[2]" />
            {activeTab === 'leaderboard' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-sans mt-1 tracking-tight">Arena</span>
        </button>

        {/* 4. Rank Ladder */}
        <button
          type="button"
          onClick={() => handleNavClick(onOpenRankLadder)}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-[10px] font-sans mt-0.5 tracking-tight truncate max-w-[55px]">
            {userRankName || 'Ranks'}
          </span>
        </button>

        {/* 5. Account / Profile */}
        <button
          type="button"
          onClick={() => handleNavClick(onOpenAccount)}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <div className="relative">
            <User className="w-5 h-5 stroke-[2]" />
            {isLoggedIn && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </div>
          <span className="text-[10px] font-sans mt-1 tracking-tight">
            {isLoggedIn ? 'Profile' : 'Sign In'}
          </span>
        </button>
      </div>
    </nav>
  );
};
