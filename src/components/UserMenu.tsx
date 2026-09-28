/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SyncStatus } from '../hooks/useCloudSync';
import { 
  Cloud, 
  CloudCheck, 
  CloudAlert, 
  RefreshCw, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Sparkles,
  ChevronDown,
  Trophy,
  Camera
} from 'lucide-react';

interface UserMenuProps {
  onOpenAuthModal: () => void;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  onForceSync?: () => void;
  onOpenLeaderboardSettings?: () => void;
  onOpenProfilePhoto?: () => void;
}

export default function UserMenu({ 
  onOpenAuthModal, 
  syncStatus, 
  lastSyncedAt,
  onForceSync,
  onOpenLeaderboardSettings,
  onOpenProfilePhoto
}: UserMenuProps) {
  const { user, signOut, isAdmin, isSupabaseConfigured } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'W';
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Not yet synced';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAuthModal}
          className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-sans font-medium text-xs transition-all duration-200 cursor-pointer shadow-sm hover:shadow-emerald-500/20"
          title="Sign in to save your habits and rank progress permanently across all devices"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud size={14} className="stroke-[2.2]" />
          <span>Save Progress</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User profile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-[#12151D] hover:bg-[#1A1F2B] border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer"
      >
        {/* User Avatar */}
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-6 h-6 rounded-full object-cover border border-emerald-500/50"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center">
            {getInitials(user.displayName, user.email)}
          </div>
        )}

        {/* Sync Status Icon */}
        <span className="flex items-center gap-1">
          {syncStatus === 'syncing' ? (
            <RefreshCw size={12} className="text-amber-400 animate-spin" />
          ) : syncStatus === 'synced' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
          )}
          <span className="text-xs font-sans text-gray-300 max-w-[100px] truncate hidden sm:inline">
            {user.displayName || user.email?.split('@')[0]}
          </span>
        </span>

        <ChevronDown size={12} className="text-gray-500" />
      </button>

      {/* Profile & Sync Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0C0E12] border border-white/10 rounded-3xl p-4 shadow-2xl backdrop-blur-xl z-50 animate-fade-in">
          {/* User Info Header */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5">
            <div className="relative group">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-11 h-11 rounded-2xl object-cover border border-emerald-500/50 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-sm font-bold flex items-center justify-center shrink-0">
                  {getInitials(user.displayName, user.email)}
                </div>
              )}
              {onOpenProfilePhoto && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenProfilePhoto();
                  }}
                  title="Change profile picture"
                  className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg shadow-md cursor-pointer transition-transform hover:scale-110"
                >
                  <Camera size={11} className="stroke-[2.5]" />
                </button>
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-sans font-bold text-white truncate">
                  {user.displayName || user.username || 'Warrior'}
                </p>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Cloud Sync Status Card */}
          <div className="p-3 rounded-2xl bg-[#12161E] border border-white/5 mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-sans">Cloud Status:</span>
              <div className="flex items-center gap-1.5">
                {syncStatus === 'syncing' && (
                  <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Syncing...</span>
                  </span>
                )}
                {syncStatus === 'synced' && (
                  <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-semibold">
                    <ShieldCheck size={13} />
                    <span>All Progress Saved</span>
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
                    <CloudAlert size={12} />
                    <span>Sync Offline</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
              <span>Last update:</span>
              <span>{formatLastSync(lastSyncedAt)}</span>
            </div>

            {onForceSync && (
              <button
                onClick={() => {
                  onForceSync();
                }}
                className="w-full mt-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={11} />
                <span>Sync Now</span>
              </button>
            )}
          </div>

          {/* Change Profile Photo Button */}
          {onOpenProfilePhoto && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfilePhoto();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-sans font-medium text-xs transition-colors cursor-pointer border border-emerald-500/20"
            >
              <Camera size={13} />
              <span>Change Profile Picture</span>
            </button>
          )}

          {/* Arena Privacy & Alias Button */}
          {onOpenLeaderboardSettings && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenLeaderboardSettings();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-sans font-medium text-xs transition-colors cursor-pointer border border-indigo-500/20"
            >
              <Trophy size={13} className="text-amber-400" />
              <span>Leaderboard Alias & Privacy</span>
            </button>
          )}

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              setIsOpen(false);
              await signOut();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-sans font-medium text-xs transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
