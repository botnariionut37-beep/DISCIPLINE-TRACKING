/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Category, DayOfWeek, WeeklyChecks, RankId, RankDefinition, DAYS_OF_WEEK, DisciplineStats } from './types';
import { getWeekKey, getWeekLabel, getOffsetWeekKey } from './utils/date';
import { chime } from './utils/audio';
import { calculateRankProgress, RANK_TIERS } from './utils/ranks';
import { motion, AnimatePresence } from 'motion/react';

// Components
import MetricCircle from './components/MetricCircle';
import StoicQuoteViewer from './components/StoicQuoteViewer';
import WeeklyGrid from './components/WeeklyGrid';
import DisciplineStatsBreakdown from './components/DisciplineStatsBreakdown';
import CategoryAdmin from './components/CategoryAdmin';
import RankCard from './components/RankCard';
import RankBadge from './components/RankBadge';
import RankLadderModal from './components/RankLadderModal';
import RankUpModal from './components/RankUpModal';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import { LeaderboardTable } from './components/LeaderboardTable';
import { WarriorInspectorModal } from './components/WarriorInspectorModal';
import { LeaderboardSettingsModal } from './components/LeaderboardSettingsModal';
import { ProfilePhotoModal } from './components/ProfilePhotoModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DailyMetricCard } from './components/DailyMetricCard';
import { WorkoutDashboard } from './components/WorkoutDashboard';
import { useTheme } from './context/ThemeContext';
import { 
  subscribeToLeaderboard, 
  publishLeaderboardSnapshot, 
  getLocalLeaderboardSettings, 
  saveLocalLeaderboardSettings 
} from './services/leaderboard';
import { 
  purgeRealtimeLeaderboardByNameOrId, 
  purgeFirestoreLeaderboardByNameOrId 
} from './services/firebase';
import { LeaderboardEntry, LeaderboardSettings } from './types/leaderboard';
import { useAuth } from './context/AuthContext';
import { useCloudSync } from './hooks/useCloudSync';

// Icons
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  FileJson,
  UploadCloud,
  CheckCircle2,
  X,
  Check,
  AppWindow,
  Monitor,
  Trophy,
  Zap,
  Flame,
  LayoutGrid,
  Sun,
  Moon,
  Dumbbell
} from 'lucide-react';

export default function App() {
  const currentRealWeekKey = getWeekKey(new Date());
  const [weekKey, setWeekKey] = useState<string>(currentRealWeekKey);

  const [isPortabilityOpen, setIsPortabilityOpen] = useState(false);
  const [isCompilingOfflineApp, setIsCompilingOfflineApp] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string; title?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PWA (Progressive Web App) Install triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic prompt to allow manual trigger design
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      console.log('App successfully launched and installed in native system!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check for display mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallAppTrigger = async () => {
    if (!deferredPrompt) {
      setImportStatus({
        type: 'error',
        title: 'Browser Sandbox Shield',
        message: "To install this as a standalone system app, you must first click the 'Open in new tab' button (the square with an arrow at the top-right of your preview screen, next to code), and then click 'Install App' inside that new tab!"
      });
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAppInstalled(true);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("Installation triggers encountered a block:", err);
    }
  };

  // Load custom categories from localStorage
  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = localStorage.getItem('discipline_categories');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse categories', e);
      }
    }
    // Sophisticated default categories to provide immediate value
    const defaults: Category[] = [
      { id: 'cat-1', name: 'Early Rise & Routine', icon: 'Clock', color: 'amber', createdAt: Date.now() },
      { id: 'cat-2', name: 'Physical Exercise', icon: 'Dumbbell', color: 'rose', createdAt: Date.now() + 1 },
      { id: 'cat-3', name: 'Study / Stoic Reading', icon: 'BookOpen', color: 'indigo', createdAt: Date.now() + 2 },
      { id: 'cat-4', name: 'Clean Nutrition', icon: 'Apple', color: 'emerald', createdAt: Date.now() + 3 },
      { id: 'cat-5', name: 'Deep Work Session', icon: 'Code', color: 'blue', createdAt: Date.now() + 4 },
    ];
    localStorage.setItem('discipline_categories', JSON.stringify(defaults));
    return defaults;
  });

  // Load checks history map from localStorage
  const [checks, setChecks] = useState<WeeklyChecks>(() => {
    const stored = localStorage.getItem('discipline_checks');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse checks', e);
      }
    }
    return {};
  });

  // Reference to category admin panel for scroll-to action
  const categoryAdminRef = useRef<HTMLDivElement>(null);

  // Reference variable for editing triggers inside the modal
  const [activeEditingCat, setActiveEditingCat] = useState<Category | null>(null);

  // Ranking System State: begins at Bronze; rank up every week with >= 80% discipline rate
  const [rankOverride, setRankOverride] = useState<RankId | null>(() => {
    return (localStorage.getItem('discipline_rank_override') as RankId) || null;
  });
  const [bonusQualifyingWeeks, setBonusQualifyingWeeks] = useState<number>(() => {
    const v = localStorage.getItem('discipline_bonus_weeks');
    return v ? parseInt(v, 10) || 0 : 0;
  });
  const [isRankLadderOpen, setIsRankLadderOpen] = useState(false);
  const [celebrationRank, setCelebrationRank] = useState<RankDefinition | null>(null);

  // User Authentication & Cloud Sync
  const { user, isAdmin, updateUserProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfilePhotoModalOpen, setIsProfilePhotoModalOpen] = useState(false);

  // Theme System
  const { theme, toggleTheme } = useTheme();

  // Navigation Tabs: Habits Matrix, Workout Arena, Leaderboard
  const [activeTab, setActiveTab] = useState<'matrix' | 'workout' | 'leaderboard'>('matrix');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedWarrior, setSelectedWarrior] = useState<LeaderboardEntry | null>(null);
  const [isLeaderboardSettingsOpen, setIsLeaderboardSettingsOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [leaderboardSettings, setLeaderboardSettings] = useState<LeaderboardSettings>(getLocalLeaderboardSettings);

  const { syncStatus, lastSyncedAt, pushToCloud, forceSync } = useCloudSync({
    user,
    categories,
    setCategories,
    checks,
    setChecks,
    bonusQualifyingWeeks,
    setBonusQualifyingWeeks
  });

  // Subscribe to real-time Community Leaderboard updates
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(user?.uid || null, (entries) => {
      setLeaderboardEntries(entries);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Completely delete and purge the "JUST" account locally and remotely
  useEffect(() => {
    purgeRealtimeLeaderboardByNameOrId('JUST');
    purgeFirestoreLeaderboardByNameOrId('JUST');

    const currentAlias = localStorage.getItem('discipline_user_alias');
    if (currentAlias && currentAlias.trim().toLowerCase() === 'just') {
      localStorage.removeItem('discipline_user_alias');
    }
    const localUid = localStorage.getItem('discipline_local_user_id');
    if (localUid && localUid.toLowerCase() === 'just') {
      localStorage.removeItem('discipline_local_user_id');
    }
    const settings = getLocalLeaderboardSettings();
    if (settings.customAlias && settings.customAlias.trim().toLowerCase() === 'just') {
      const clean = { ...settings, customAlias: '' };
      setLeaderboardSettings(clean);
      saveLocalLeaderboardSettings(clean);
    }
    if (selectedWarrior) {
      const name = (selectedWarrior.customAlias || selectedWarrior.displayName).trim().toLowerCase();
      if (name === 'just' || selectedWarrior.userId.toLowerCase() === 'just') {
        setSelectedWarrior(null);
      }
    }
  }, [selectedWarrior]);

  // Compute live scores for the current selected week
  const weekChecks = useMemo(() => {
    return checks[weekKey] || {};
  }, [checks, weekKey]);

  // Account start / first login date for trend origin and score evaluation
  const accountStartDate = useMemo(() => {
    if (user?.metadata?.creationTime) {
      return user.metadata.creationTime;
    }
    const localStored = localStorage.getItem('discipline_account_created_at');
    if (localStored) return localStored;
    const now = new Date().toISOString();
    localStorage.setItem('discipline_account_created_at', now);
    return now;
  }, [user]);

  // Compute live discipline ranking progress: begins at Bronze, advances with weeks >= 80%, downgrades with weeks < 50%
  const rankProgress = useMemo(() => {
    return calculateRankProgress(checks, categories, weekKey, bonusQualifyingWeeks, rankOverride, accountStartDate);
  }, [checks, categories, weekKey, bonusQualifyingWeeks, rankOverride, accountStartDate]);

  // Detect and celebrate rank upgrades OR play feedback on downgrades
  const prevRankIndexRef = useRef<number>(rankProgress.currentRank.index);
  const hasMountedRankRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasMountedRankRef.current) {
      hasMountedRankRef.current = true;
      prevRankIndexRef.current = rankProgress.currentRank.index;
      return;
    }
    if (rankProgress.currentRank.index > prevRankIndexRef.current) {
      setCelebrationRank(rankProgress.currentRank);
      chime.playRankUp();
    } else if (rankProgress.currentRank.index < prevRankIndexRef.current) {
      chime.playRankDown();
    }
    prevRankIndexRef.current = rankProgress.currentRank.index;
  }, [rankProgress.currentRank.index]);

  const handleSelectRankOverride = (tierId: RankId | null) => {
    if (!isAdmin) return;
    setRankOverride(tierId);
    if (tierId) {
      localStorage.setItem('discipline_rank_override', tierId);
      const selectedTier = RANK_TIERS.find(r => r.id === tierId);
      if (selectedTier) {
        setCelebrationRank(selectedTier);
        chime.playRankUp();
      }
    } else {
      localStorage.removeItem('discipline_rank_override');
    }
  };

  const handleAddQualifyingWeek = (amount = 1) => {
    if (!isAdmin) return;
    setBonusQualifyingWeeks(prev => {
      const next = Math.max(0, prev + amount);
      localStorage.setItem('discipline_bonus_weeks', next.toString());
      pushToCloud(categories, checks, next);
      return next;
    });
    if (amount > 0) {
      chime.playCheck();
    } else {
      chime.playRankDown();
    }
  };

  const handleResetRankOverrides = () => {
    if (!isAdmin) return;
    setRankOverride(null);
    setBonusQualifyingWeeks(0);
    localStorage.removeItem('discipline_rank_override');
    localStorage.removeItem('discipline_bonus_weeks');
    pushToCloud(categories, checks, 0);
  };

  const calculatedStats: DisciplineStats = useMemo(() => {
    let completed = 0;
    const categoryCompletions: Record<string, { completed: number; total: number; rate: number; currentStreak: number }> = {};
    
    categories.forEach(cat => {
      const catCheckObj = weekChecks[cat.id] || {};
      let catCompleted = 0;
      DAYS_OF_WEEK.forEach(day => {
        if (catCheckObj[day]) {
          completed++;
          catCompleted++;
        }
      });
      const rate = Math.round((catCompleted / 7) * 100);
      categoryCompletions[cat.id] = {
        completed: catCompleted,
        total: 7,
        rate,
        currentStreak: catCompleted
      };
    });

    const total = categories.length * 7;
    const weeklyRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      weeklyRate,
      completedCount: completed,
      totalPossibleCount: total,
      dayCompletions: {} as any,
      categoryCompletions
    };
  }, [categories, weekChecks]);

  const { completedCount, totalPossibleCount, weeklyRate: disciplineRate } = calculatedStats;

  // Today's real calendar day of week
  const todayName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  }, []);

  // Dedicated Daily Discipline Rate calculation for today
  const dailyStats = useMemo(() => {
    let todayCompleted = 0;
    const activeWeekChecks = checks[currentRealWeekKey] || {};
    categories.forEach((cat) => {
      if (activeWeekChecks[cat.id]?.[todayName]) {
        todayCompleted++;
      }
    });
    const totalCategories = categories.length;
    const dailyRate = totalCategories > 0 ? Math.round((todayCompleted / totalCategories) * 100) : 0;
    return {
      todayCompleted,
      totalCategories,
      dailyRate,
    };
  }, [checks, categories, currentRealWeekKey, todayName]);

  // Find exercise routine category for automatic habit sync
  const exerciseCategory = useMemo(() => {
    return categories.find((c) => {
      const lower = c.name.toLowerCase();
      return (
        lower.includes('exercise') ||
        lower.includes('workout') ||
        lower.includes('push') ||
        lower.includes('gym') ||
        lower.includes('fitness') ||
        lower.includes('physical')
      );
    }) || categories[0] || null;
  }, [categories]);

  const isTodayExerciseChecked = useMemo(() => {
    if (!exerciseCategory) return false;
    const curChecks = checks[currentRealWeekKey] || {};
    return Boolean(curChecks[exerciseCategory.id]?.[todayName]);
  }, [exerciseCategory, checks, currentRealWeekKey, todayName]);

  const handleAutoCheckExerciseHabit = () => {
    let targetCat = exerciseCategory;
    if (!targetCat) {
      targetCat = {
        id: `cat-${Date.now()}`,
        name: 'Physical Exercise',
        icon: 'Dumbbell',
        color: 'rose',
        createdAt: Date.now()
      };
      setCategories((prev) => {
        const next = [...prev, targetCat!];
        localStorage.setItem('discipline_categories', JSON.stringify(next));
        return next;
      });
    }

    setChecks((prev) => {
      const updated = { ...prev };
      const curWeek = updated[currentRealWeekKey] ? { ...updated[currentRealWeekKey] } : {};
      updated[currentRealWeekKey] = curWeek;
      const catObj = curWeek[targetCat!.id] ? { ...curWeek[targetCat!.id] } : {};
      curWeek[targetCat!.id] = catObj;
      catObj[todayName] = true;

      localStorage.setItem('discipline_checks', JSON.stringify(updated));
      pushToCloud(categories, updated, bonusQualifyingWeeks);
      return updated;
    });
  };

  // Auto-publish user progress snapshot to public leaderboard when changes happen
  useEffect(() => {
    const activeUid = user?.uid || localStorage.getItem('discipline_local_user_id') || (() => {
      const generated = `warrior-${Date.now()}`;
      localStorage.setItem('discipline_local_user_id', generated);
      return generated;
    })();

    const timer = setTimeout(() => {
      publishLeaderboardSnapshot(
        activeUid,
        {
          displayName: user?.displayName || localStorage.getItem('discipline_user_alias') || 'Warrior',
          email: user?.email,
          photoURL: user?.photoURL || localStorage.getItem('discipline_profile_photo_url'),
        },
        rankProgress,
        calculatedStats,
        categories,
        leaderboardSettings
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [user, rankProgress, calculatedStats, categories, leaderboardSettings]);

  const handleSaveLeaderboardSettings = (newSettings: LeaderboardSettings) => {
    setLeaderboardSettings(newSettings);
    saveLocalLeaderboardSettings(newSettings);
    if (user) {
      publishLeaderboardSnapshot(
        user.uid,
        {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
        rankProgress,
        calculatedStats,
        categories,
        newSettings
      );
    }
  };

  // Handle checking a day
  const handleToggleCheck = (categoryId: string, day: DayOfWeek) => {
    setChecks(prev => {
      const updated = { ...prev };
      
      const weekData = updated[weekKey] ? { ...updated[weekKey] } : {};
      updated[weekKey] = weekData;
      
      const catChecks = weekData[categoryId] ? { ...weekData[categoryId] } : {};
      weekData[categoryId] = catChecks;

      // Check toggled
      const currentVal = !catChecks[day];
      catChecks[day] = currentVal;

      // Handle complete milestone sound trigger
      let totalThisWeek = 0;
      categories.forEach(cat => {
        const checksForCat = weekData[cat.id] || {};
        Object.values(checksForCat).forEach(v => { if (v) totalThisWeek++; });
      });
      const maxPossible = categories.length * 7;
      if (currentVal && totalThisWeek === maxPossible && maxPossible > 0) {
        // Unbroken week reached! Play completion arpeggio
        setTimeout(() => chime.playCompletion(), 350);
      }

      localStorage.setItem('discipline_checks', JSON.stringify(updated));
      pushToCloud(categories, updated, bonusQualifyingWeeks);
      return updated;
    });
  };

  // Add a new habit category
  const handleAddCategory = (name: string, icon: string, color: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      icon,
      color,
      createdAt: Date.now()
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('discipline_categories', JSON.stringify(updated));
    pushToCloud(updated, checks, bonusQualifyingWeeks);
  };

  // Edit an existing category
  const handleEditCategory = (id: string, name: string, icon: string, color: string) => {
    const updated = categories.map(cat => cat.id === id ? { ...cat, name, icon, color } : cat);
    setCategories(updated);
    localStorage.setItem('discipline_categories', JSON.stringify(updated));
    pushToCloud(updated, checks, bonusQualifyingWeeks);
  };

  // Remove a category & clean corresponding checks to avoid memory leaks
  const handleDeleteCategory = (id: string) => {
    const updatedCats = categories.filter(cat => cat.id !== id);
    setCategories(updatedCats);
    localStorage.setItem('discipline_categories', JSON.stringify(updatedCats));

    setChecks(prev => {
      const updatedChecks = { ...prev };
      Object.keys(updatedChecks).forEach(wKey => {
        if (updatedChecks[wKey][id]) {
          const newWeekData = { ...updatedChecks[wKey] };
          delete newWeekData[id];
          updatedChecks[wKey] = newWeekData;
        }
      });
      localStorage.setItem('discipline_checks', JSON.stringify(updatedChecks));
      pushToCloud(updatedCats, updatedChecks, bonusQualifyingWeeks);
      return updatedChecks;
    });
  };

  // Skip week handlers: non-admins cannot navigate or check past/future days
  const handleNextWeek = () => {
    if (!isAdmin) {
      setImportStatus({
        type: 'error',
        title: 'Access Restricted',
        message: 'Checking and navigating past or future days is locked.'
      });
      return;
    }
    setWeekKey(prev => getOffsetWeekKey(prev, 1));
  };

  const handlePrevWeek = () => {
    if (!isAdmin) {
      setImportStatus({
        type: 'error',
        title: 'Access Restricted',
        message: 'Checking and navigating past or future days is locked.'
      });
      return;
    }
    setWeekKey(prev => getOffsetWeekKey(prev, -1));
  };

  const handleResetToCurrentWeek = () => {
    setWeekKey(currentRealWeekKey);
  };

  // Quick seed data to reset to pristine state is helpful for first-time explore
  const handleLoadDemoValues = () => {
    // Fills current week checks by randomly completing ~60% of checkboxes for high visual fidelity
    setChecks(prev => {
      const updated = { ...prev };
      const weekData = { ...updated[weekKey] };
      
      categories.forEach(cat => {
        const catData: Record<DayOfWeek, boolean> = {} as any;
        const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.forEach(day => {
          // 60% completion odds
          catData[day] = Math.random() < 0.6;
        });
        weekData[cat.id] = catData;
      });

      updated[weekKey] = weekData;
      localStorage.setItem('discipline_checks', JSON.stringify(updated));
      chime.playCompletion();
      return updated;
    });
  };

  const handleClearWeekChecks = () => {
    setChecks(prev => {
      const updated = { ...prev };
      if (updated[weekKey]) {
        updated[weekKey] = {};
      }
      localStorage.setItem('discipline_checks', JSON.stringify(updated));
      return updated;
    });
  };

  // Export active week logs as tabular CSV
  const exportWeeklyCSV = () => {
    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Clean headers
    const csvHeaders = ['"WeekKey"', '"CategoryID"', '"CategoryName"', '"ColorTheme"', '"Monday"', '"Tuesday"', '"Wednesday"', '"Thursday"', '"Friday"', '"Saturday"', '"Sunday"', '"CompletionRate"'];
    const csvRows = [csvHeaders.join(',')];

    categories.forEach(cat => {
      const catChecks = weekChecks[cat.id] || {};
      let completedCount = 0;
      
      const rowCells = [
        `"${weekKey}"`,
        `"${cat.id}"`,
        `"${cat.name.replace(/"/g, '""')}"`,
        `"${cat.color || 'indigo'}"`
      ];

      days.forEach(day => {
        const isChecked = !!catChecks[day];
        if (isChecked) completedCount++;
        rowCells.push(isChecked ? '"Completed"' : '"Missed"');
      });

      const completionRate = Math.round((completedCount / 7) * 100);
      rowCells.push(`"${completionRate}%"`);

      csvRows.push(rowCells.join(','));
    });

    // Append rank metadata summary to the CSV report
    csvRows.unshift(`"# Discipline Ranking: ${rankProgress.currentRank.name} (Tier ${rankProgress.currentRank.index + 1}/12, ${rankProgress.totalXp} XP)"`);

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `discipline_report_${weekKey}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export entire application backup as portable JSON
  const exportBackupJSON = () => {
    const backupObj = {
      version: 2,
      exportedAt: Date.now(),
      categories,
      checks,
      rankOverride,
      bonusQualifyingWeeks,
      currentRank: rankProgress.currentRank.name,
      qualifyingWeeksCount: rankProgress.qualifyingWeeksCount
    };
    
    const jsonContent = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `discipline_backup_${getWeekKey(new Date())}.json`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle restoring database backup JSON
  const handleImportJSON = (file: File) => {
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        setImportStatus({ type: 'error', message: 'Unable to read the backup file.' });
        return;
      }

      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          setImportStatus({ type: 'error', message: 'The uploaded file stands empty or unreadable.' });
          return;
        }

        const hasCategories = Array.isArray(parsed.categories);
        const hasChecks = parsed.checks && typeof parsed.checks === 'object';

        if (!hasCategories && !hasChecks) {
          setImportStatus({ type: 'error', message: 'Invalid format: Make sure the file contains category rosters or habit tracking logs.' });
          return;
        }

        if (hasCategories) {
          setCategories(parsed.categories);
          localStorage.setItem('discipline_categories', JSON.stringify(parsed.categories));
        }

        if (hasChecks) {
          setChecks(parsed.checks);
          localStorage.setItem('discipline_checks', JSON.stringify(parsed.checks));
        }

        if (parsed.rankOverride !== undefined) {
          setRankOverride(parsed.rankOverride);
          if (parsed.rankOverride) {
            localStorage.setItem('discipline_rank_override', parsed.rankOverride);
          } else {
            localStorage.removeItem('discipline_rank_override');
          }
        }

        if (typeof parsed.bonusQualifyingWeeks === 'number') {
          setBonusQualifyingWeeks(parsed.bonusQualifyingWeeks);
          localStorage.setItem('discipline_bonus_weeks', parsed.bonusQualifyingWeeks.toString());
        } else if (typeof parsed.bonusXp === 'number') {
          // Backward compatibility
          const weeks = Math.floor(parsed.bonusXp / 1000);
          setBonusQualifyingWeeks(weeks);
          localStorage.setItem('discipline_bonus_weeks', weeks.toString());
        }

        const finalCats = hasCategories ? parsed.categories : categories;
        const finalChecks = hasChecks ? parsed.checks : checks;
        const finalBonus = typeof parsed.bonusQualifyingWeeks === 'number'
          ? parsed.bonusQualifyingWeeks
          : typeof parsed.bonusXp === 'number'
            ? Math.floor(parsed.bonusXp / 1000)
            : bonusQualifyingWeeks;
        pushToCloud(finalCats, finalChecks, finalBonus);

        setImportStatus({
          type: 'success',
          message: `Backup successfully restored. Synced ${parsed.categories?.length || 0} routine categories and execution grids!`
        });

        chime.playCompletion();
        
        // Auto close or clear status after a moment
        setTimeout(() => {
          setImportStatus(null);
        }, 5000);
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Shattered scheme: The loaded file is not a valid JSON structure.' });
      }
    };
    reader.readAsText(file);
  };

  // Compile and download the entire application as a single-file portable HTML
  const downloadStandaloneApp = async () => {
    try {
      setIsCompilingOfflineApp(true);
      setImportStatus(null);
      
      const response = await fetch('/api/download-app');
      if (!response.ok) {
        throw new Error('Server returned error response: ' + response.statusText);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "Discipline_Tracker.html");
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setImportStatus({
        type: 'success',
        message: 'Masterwork Ready! Standalone file "Discipline_Tracker.html" successfully downloaded. Double click on this file to run it immediately on any local environment!'
      });
      chime.playCompletion();
    } catch (err: any) {
      console.error(err);
      setImportStatus({
        type: 'error',
        message: `Failed to build offline app: ${err.message || err}`
      });
    } finally {
      setIsCompilingOfflineApp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] font-sans text-gray-200 antialiased" id="main-discipline-app">
      {/* Decorative top blur gradient bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 sm:pb-8 space-y-5 sm:space-y-8">
        {/* Crisp Executive Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/5" id="app-header">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Sparkles size={16} />
                </span>
                <h1 className="text-white font-sans font-medium text-2xl tracking-tight">
                  Discipline Tracker
                </h1>
              </div>

              {/* Clickable Header Rank Badge */}
              <RankBadge 
                rank={rankProgress.currentRank}
                size="sm"
                showLabel
                showSubtitle={false}
                stars={rankProgress.eliteMaxStars}
                onClick={() => setIsRankLadderOpen(true)}
                className="cursor-pointer hover:border-emerald-500/40"
              />

              {/* View Switcher: Habit Matrix vs Workout vs Community Leaderboard */}
              <div className="flex items-center p-1 rounded-xl bg-[#0D1017] border border-white/10 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'matrix'
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Habit Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('workout')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'workout'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-extrabold shadow-md shadow-cyan-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Dumbbell size={13} className={activeTab === 'workout' ? 'text-black' : 'text-cyan-400'} />
                  <span>Workout</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                    activeTab === 'workout' ? 'bg-black/20 text-black' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    Vision
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold shadow-md shadow-amber-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Trophy size={13} className={activeTab === 'leaderboard' ? 'text-black' : 'text-amber-400'} />
                  <span>Leaderboard</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                    activeTab === 'leaderboard' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {leaderboardEntries.length || 'Live'}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-gray-500 text-xs font-sans">
              "We must all suffer one of two things: the pain of discipline or the pain of regret."
            </p>
          </div>

          {/* Week Selector Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto" id="week-navigation-controls">
            {/* Nav Indicators */}
            <div className="flex items-center gap-1 bg-[#0C0E12] border border-white/5 p-1 rounded-xl shadow-xs">
              <button
                onClick={handlePrevWeek}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-505 hover:text-white transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="px-3 py-1 flex items-center gap-2 select-none">
                <Calendar size={13} className="text-gray-500" />
                <span className="text-xs font-sans font-medium text-gray-300 whitespace-nowrap">
                  {getWeekLabel(weekKey)}
                </span>
                {weekKey === currentRealWeekKey && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active Calendar Week" />
                )}
              </div>

              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-550 hover:text-white transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Actions (Theme Toggle, Auth, Reset to current, Clear) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Global Dark / High-Contrast Light Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs flex items-center justify-center group"
                title={theme === 'dark' ? 'Switch to High-Contrast Light Mode' : 'Switch to Dark Mode'}
                id="theme-toggle-btn"
              >
                {theme === 'dark' ? (
                  <Sun size={15} className="text-amber-300 group-hover:rotate-45 transition-transform" />
                ) : (
                  <Moon size={15} className="text-indigo-600 group-hover:-rotate-12 transition-transform" />
                )}
              </button>

              {/* User Authentication & Cloud Sync Menu */}
              <UserMenu 
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                syncStatus={syncStatus}
                lastSyncedAt={lastSyncedAt}
                onForceSync={forceSync}
                onOpenLeaderboardSettings={() => setIsLeaderboardSettingsOpen(true)}
                onOpenProfilePhoto={() => setIsProfilePhotoModalOpen(true)}
              />

              {weekKey !== currentRealWeekKey && (
                <button
                  onClick={handleResetToCurrentWeek}
                  className="flex-1 sm:flex-none px-4.5 py-2 rounded-xl text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-sans font-medium transition-all cursor-pointer"
                >
                  Return to Active Week
                </button>
              )}

              {isAdmin && categories.length > 0 && (
                <button
                  onClick={handleClearWeekChecks}
                  className="px-3.5 py-2 rounded-xl border border-dashed border-rose-500/30 hover:border-rose-500/50 bg-rose-500/10 text-rose-300 hover:text-rose-200 text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  title="Admin action: Wipe data for the active week"
                  id="reset-week-ticks-btn"
                >
                  <span>Wipe Week (Admin)</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'leaderboard' ? (
          <section id="leaderboard-section">
            <LeaderboardTable
              entries={leaderboardEntries}
              currentUserId={user?.uid}
              onSelectWarrior={(warrior) => setSelectedWarrior(warrior)}
              onOpenSettings={() => setIsLeaderboardSettingsOpen(true)}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              settings={leaderboardSettings}
            />
          </section>
        ) : activeTab === 'workout' ? (
          <section id="workout-section">
            <WorkoutDashboard
              onAutoCheckExerciseHabit={handleAutoCheckExerciseHabit}
              isTodayExerciseChecked={isTodayExerciseChecked}
              todayName={todayName}
            />
          </section>
        ) : (
          <>
            {/* Dynamic Top Overview Scorecards: Weekly Discipline Rate, Daily Discipline Rate, Rank Progression, and Stoic Guidance */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" id="dashboard-widgets-section">
              {/* Circular Weekly Discipline Percentage meter */}
              <div className="col-span-1">
                <MetricCircle 
                  percentage={disciplineRate} 
                  completed={completedCount} 
                  total={totalPossibleCount} 
                />
              </div>

              {/* Dedicated Today's Daily Discipline Rate Card */}
              <div className="col-span-1">
                <DailyMetricCard
                  percentage={dailyStats.dailyRate}
                  completed={dailyStats.todayCompleted}
                  total={dailyStats.totalCategories}
                  dayName={todayName}
                />
              </div>

              {/* Dedicated Discipline Ranking Hero Card */}
              <div className="col-span-1">
                <RankCard 
                  rankProgress={rankProgress}
                  onOpenLadder={() => setIsRankLadderOpen(true)}
                  onAddQualifyingWeek={handleAddQualifyingWeek}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Stoic Motivation Panel */}
              <div className="col-span-1 flex flex-col justify-start">
                <StoicQuoteViewer currentWeekKey={weekKey} />
              </div>
            </section>

            {/* Core Daily Execution Matrix grid */}
            <section id="grid-matrix-section">
              <WeeklyGrid 
                categories={categories} 
                checks={weekChecks} 
                weekKey={weekKey}
                onToggleCheck={handleToggleCheck}
                isAdmin={isAdmin}
                onEditCategoryTrigger={(cat) => {
                  // Scroll to admin and open edit modal
                  const el = document.getElementById('category-admin-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  // Set a short timeout to let scrolling complete
                  setTimeout(() => {
                    // Find and trigger edit modal button
                    const btn = document.querySelector(`#cat-item-${cat.id} button[title="Edit category"]`) as HTMLButtonElement;
                    btn?.click();
                  }, 400);
                }}
              />
            </section>

            {/* Categorized Progress and Stats Breakdowns */}
            <section id="insights-section">
              <DisciplineStatsBreakdown 
                categories={categories} 
                checks={weekChecks} 
                allChecks={checks}
                weekKey={weekKey}
                rankProgress={rankProgress}
                onOpenLadder={() => setIsRankLadderOpen(true)}
                onSelectWeek={(targetWeekKey) => setWeekKey(targetWeekKey)}
              />
            </section>

            {/* Habits Categories Administration Panel */}
            <section ref={categoryAdminRef}>
              <CategoryAdmin 
                categories={categories}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            </section>
          </>
        )}
      </div>
      
      {/* Portability / Download / Backup Hub Modal */}
      <AnimatePresence>
        {isPortabilityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="portability-modal">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsPortabilityOpen(false);
                setImportStatus(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-xl bg-[#0C0E12] border border-white/5 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Database size={14} />
                    </span>
                    <h3 className="text-base font-sans font-medium text-white">
                      Data Portability & Reports
                    </h3>
                  </div>
                  <p className="text-gray-500 text-xs mt-1 font-sans">
                    Export your discipline statistics as spreadsheet reports or back up your entire trackers offline.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsPortabilityOpen(false);
                    setImportStatus(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close panel"
                  id="close-portability-btn"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Native App Installation Block */}
                <div className="p-5 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-[#0C0E12] via-[#0A0C10] to-[#0E131F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                         <AppWindow size={13} />
                       </span>
                      <h4 className="text-xs font-sans font-medium text-white">
                        Install as Native Desktop / Mobile App
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans font-light max-w-sm">
                      Run the tracker in its own dedicated window separate from browser tabs. Installs a launcher icon on your desktop/dock for double-click startup.
                    </p>
                  </div>
                  {isAppInstalled ? (
                    <div className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-sans font-medium">
                      <Check size={13} className="stroke-[2.5]" />
                      <span>Active as System App</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstallAppTrigger}
                      className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-400 text-black text-xs font-sans font-bold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] cursor-pointer"
                      id="install-system-app-btn"
                    >
                      <Monitor size={13} className="stroke-[2.5]" />
                      <span>Install App</span>
                    </button>
                  )}
                </div>

                {/* Standalone Action Banner */}
                <div className="p-5 rounded-2xl border border-white/5 bg-[#0A0C10] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 animate-pulse">
                        <Sparkles size={12} />
                      </span>
                      <h4 className="text-xs font-sans font-medium text-white">
                        Offline Standalone Web App
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans font-light max-w-sm">
                      Perfect for local execution. Compiles the entire tracker system into a single portable <span className="text-emerald-400 font-mono">.html</span> document. Double-click to track routines offline with no installations or setup needed!
                    </p>
                  </div>
                  <a
                    href="/api/download-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setImportStatus({
                        type: 'success',
                        message: 'Standalone build successfully initiated! The server is compiling your single-file application now. The ready file "Discipline_Tracker.html" will begin downloading automatically in a few seconds.'
                      });
                      chime.playCompletion();
                    }}
                    className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-sans font-semibold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)] cursor-pointer"
                    id="download-offline-standalone-btn"
                  >
                    <Download size={13} className="stroke-[2.5]" />
                    <span>Download Standalone (.html)</span>
                  </a>
                </div>

                {/* 1. File Downloads Row */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] font-medium">
                    Other Available Downloads
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CSV Download Card */}
                    <button
                      onClick={exportWeeklyCSV}
                      className="p-4 rounded-2xl border border-white/5 bg-[#0A0C10] hover:border-emerald-500/20 text-left transition-all duration-300 group cursor-pointer"
                      id="export-weekly-csv-btn"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-sans font-medium text-white">
                            Spreadsheet (CSV)
                          </p>
                          <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">
                            Weekly Report
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-sans font-light group-hover:text-gray-400 transition-colors">
                        Generates a layout of categories, daily statuses, and achievements for {getWeekLabel(weekKey)}. Ideal for Excel, Google Sheets, or Notion trackers.
                      </p>
                    </button>

                    {/* JSON Download Card */}
                    <button
                      onClick={exportBackupJSON}
                      className="p-4 rounded-2xl border border-white/5 bg-[#0A0C10] hover:border-emerald-500/20 text-left transition-all duration-300 group cursor-pointer"
                      id="export-full-backup-btn"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-105 transition-transform">
                          <FileJson size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-sans font-medium text-white">
                            Global Backup (JSON)
                          </p>
                          <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">
                            System Restore Pack
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-sans font-light group-hover:text-gray-400 transition-colors">
                        Saves both your custom list of categories and historical daily checkboxes. Absolute insurance for full routines backup across devices.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Restore Upload Panel */}
                <div className="space-y-3 pt-5 border-t border-white/5">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] font-medium">
                    Restore from Backup File
                  </h4>

                  {/* Drag/Drop Box */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border border-dashed border-white/10 hover:border-emerald-500/30 bg-[#0A0C10]/40 text-center cursor-pointer hover:bg-[#0A0C10]/70 transition-all duration-300"
                    id="dropzone-file-container"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportJSON(file);
                        // Reset input value to allow uploading same file name again
                        e.target.value = '';
                      }} 
                      accept=".json" 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="p-3 rounded-2xl bg-white/5 text-gray-400">
                        <UploadCloud size={20} className="stroke-[1.8]" />
                      </span>
                      <div>
                        <p className="text-sm font-sans font-medium text-gray-300">
                          Select Backup File (.json)
                        </p>
                        <p className="text-[11px] text-gray-505 mt-1 max-w-sm mx-auto font-sans font-light">
                          Choose a previously downloaded backups file to safely restore your customized categories list and check boxes. This replaces current storage.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Status Alert */}
                  {importStatus && (
                    <div 
                      className={`p-4 rounded-xl flex items-start gap-3 border ${
                        importStatus.type === 'success' 
                          ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                          : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                      }`}
                      id="import-feedback-alert"
                    >
                      {importStatus.type === 'success' ? (
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-sans font-semibold">
                          {importStatus.title || (importStatus.type === 'success' ? 'Backup Restored' : 'Restore Operation Failed')}
                        </p>
                        <p className="text-[11px] mt-0.5 opacity-80 leading-relaxed font-sans font-light">
                          {importStatus.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-[#090B0E] flex justify-end">
                <button
                  onClick={() => {
                    setIsPortabilityOpen(false);
                    setImportStatus(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-sans font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
                  id="dismiss-portability-hub-btn"
                >
                  Dismiss Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Humble Footer */}
      <footer className="py-8 border-t border-white/5 text-center" id="app-footer-credit">
        <p className="text-gray-500 text-[9px] font-mono uppercase tracking-[0.2em]">
          Built with raw discipline — Formed by routines
        </p>
      </footer>

      {/* Ranking System Ladder Modal */}
      <RankLadderModal 
        isOpen={isRankLadderOpen}
        onClose={() => setIsRankLadderOpen(false)}
        rankProgress={rankProgress}
        onSelectRankOverride={handleSelectRankOverride}
        onAddQualifyingWeek={handleAddQualifyingWeek}
        onResetRankOverrides={handleResetRankOverrides}
        currentOverrideRankId={rankOverride}
        isAdmin={isAdmin}
      />

      {/* Celebratory Promotion Modal */}
      <RankUpModal 
        unlockedRank={celebrationRank}
        onClose={() => setCelebrationRank(null)}
      />

      {/* Cloud Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Community Warrior Inspector Modal */}
      <WarriorInspectorModal
        isOpen={!!selectedWarrior}
        onClose={() => setSelectedWarrior(null)}
        warrior={selectedWarrior}
        isCurrentUser={selectedWarrior?.userId === user?.uid}
      />

      {/* Leaderboard Settings & Privacy Modal */}
      <LeaderboardSettingsModal
        isOpen={isLeaderboardSettingsOpen}
        onClose={() => setIsLeaderboardSettingsOpen(false)}
        settings={leaderboardSettings}
        onSaveSettings={handleSaveLeaderboardSettings}
        defaultDisplayName={user?.displayName || (user?.email ? user.email.split('@')[0] : 'Warrior')}
        onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
      />

      {/* Email-Verified Delete Account Confirmation Modal */}
      {isDeleteAccountOpen && user && (
        <DeleteAccountModal
          isOpen={isDeleteAccountOpen}
          onClose={() => setIsDeleteAccountOpen(false)}
          userEmail={user.email || 'warrior@discipline.app'}
          userId={user.uid}
          onDeletionSuccess={() => {
            setIsDeleteAccountOpen(false);
            window.location.reload();
          }}
        />
      )}

      {/* Warrior Profile Photo Selection Modal */}
      <ProfilePhotoModal
        isOpen={isProfilePhotoModalOpen}
        onClose={() => setIsProfilePhotoModalOpen(false)}
        currentPhotoURL={user?.photoURL || null}
        displayName={user?.displayName || user?.username || 'Warrior'}
        onSavePhoto={async (newPhotoURL) => {
          await updateUserProfile({ photoURL: newPhotoURL });
          // If user is currently logged in, re-publish snapshot with new avatar to update arena immediately
          if (user?.uid) {
            await publishLeaderboardSnapshot(
              user.uid,
              { ...user, photoURL: newPhotoURL },
              rankProgress,
              calculatedStats,
              categories,
              leaderboardSettings
            );
          }
        }}
      />

      {/* Mobile-Exclusive Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRankLadder={() => setIsRankLadderOpen(true)}
        onScrollToStats={() => {
          const statsEl = document.getElementById('insights-section');
          if (statsEl) {
            statsEl.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenAccount={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            setIsLeaderboardSettingsOpen(true);
          }
        }}
        userRankName={rankProgress.currentRank.name}
        isLoggedIn={Boolean(user)}
      />
    </div>
  );
}
