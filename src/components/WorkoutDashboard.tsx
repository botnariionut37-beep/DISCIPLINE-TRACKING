/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Camera, 
  Flame, 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Target, 
  Activity, 
  ChevronRight,
  ShieldAlert,
  Info,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Check,
  Sliders,
  PlayCircle
} from 'lucide-react';
import { PushUpCameraModal } from './PushUpCameraModal';

interface WorkoutDashboardProps {
  onAutoCheckExerciseHabit: () => void;
  isTodayExerciseChecked: boolean;
  todayName: string;
}

export interface CameraDiagnosticInfo {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'error';
  permissionError?: string;
  isIframe: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  userAgent: string;
}

export const WorkoutDashboard: React.FC<WorkoutDashboardProps> = ({
  onAutoCheckExerciseHabit,
  isTodayExerciseChecked,
  todayName,
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [requireCalibration, setRequireCalibration] = useState(true);
  const [diagnosticInfo, setDiagnosticInfo] = useState<CameraDiagnosticInfo | null>(null);

  const [lifetimePushups, setLifetimePushups] = useState<number>(() => {
    return parseInt(localStorage.getItem('discipline_lifetime_pushups') || '0', 10);
  });
  const [todayPushups, setTodayPushups] = useState<number>(() => {
    const todayKey = `discipline_pushups_${new Date().toISOString().slice(0, 10)}`;
    return parseInt(localStorage.getItem(todayKey) || '0', 10);
  });
  const [justCompletedToast, setJustCompletedToast] = useState<string | null>(null);

  // Perform pre-flight device & permission inspection
  const runCameraPreflightCheck = async (): Promise<CameraDiagnosticInfo> => {
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
    const hasMediaDevices = !!(navigator && navigator.mediaDevices);
    const hasGetUserMedia = !!(hasMediaDevices && navigator.mediaDevices.getUserMedia);

    let permissionState: CameraDiagnosticInfo['permissionState'] = 'unsupported';
    let permissionError: string | undefined = undefined;

    // Check navigator.permissions.query safely
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'camera' as any });
        permissionState = status.state as any;
      } catch (err: any) {
        permissionError = err?.message || String(err);
        permissionState = isIOS ? 'unsupported' : 'error';
      }
    }

    const diag: CameraDiagnosticInfo = {
      isSecureContext: isSecure,
      hasMediaDevices,
      hasGetUserMedia,
      permissionState,
      permissionError,
      isIframe,
      isMobile,
      isIOS,
      isAndroid,
      userAgent: ua,
    };

    console.group('📷 [WorkoutDashboard] Camera Pre-Flight Diagnostic');
    console.log('Secure Context (HTTPS):', isSecure);
    console.log('Running Inside Iframe:', isIframe);
    console.log('Mobile Device:', isMobile ? (isIOS ? 'iOS' : 'Android') : 'Desktop');
    console.log('Permissions Status:', permissionState);
    console.groupEnd();

    setDiagnosticInfo(diag);
    return diag;
  };

  useEffect(() => {
    runCameraPreflightCheck();
  }, []);

  const handleLaunchCamera = async () => {
    await runCameraPreflightCheck();
    setIsCameraModalOpen(true);
  };

  const handleWorkoutCompleted = (reps: number) => {
    if (reps > 0) {
      const newLifetime = lifetimePushups + reps;
      const newToday = todayPushups + reps;
      
      setLifetimePushups(newLifetime);
      setTodayPushups(newToday);
      
      localStorage.setItem('discipline_lifetime_pushups', newLifetime.toString());
      const todayKey = `discipline_pushups_${new Date().toISOString().slice(0, 10)}`;
      localStorage.setItem(todayKey, newToday.toString());
      window.dispatchEvent(new CustomEvent('discipline_leaderboard_updated'));

      if (reps >= 10 || newToday >= 10) {
        onAutoCheckExerciseHabit();
        setJustCompletedToast(
          `Logged ${reps} push-ups! Today's physical exercise habit has been automatically verified and marked completed.`
        );
      } else {
        setJustCompletedToast(`Logged ${reps} push-ups! Keep building discipline.`);
      }

      setTimeout(() => {
        setJustCompletedToast(null);
      }, 6000);
    }
  };

  return (
    <div className="space-y-6" id="workout-training-section">
      {/* Toast Notification */}
      {justCompletedToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-sans flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{justCompletedToast}</span>
          </div>
          <button
            onClick={() => setJustCompletedToast(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Training Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-white/5 bg-[#0C0E12] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400">
              <Flame size={14} />
              <span>Physical Discipline Arena</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Vision Workout Tracker
            </h2>
            <p className="text-sm text-gray-400">
              Transform your daily execution into physical power. Live computer vision tracks your joint angles and rep counts automatically with pre-workout calibration.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                Today's Reps
              </span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {todayPushups}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {isTodayExerciseChecked ? 'Habit Checked' : 'Pending today'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                Lifetime Push-ups
              </span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {lifetimePushups}
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Total reps recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Workout Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: PUSH-UP AI VISION (FEATURED & ACTIVE) */}
        <div className="md:col-span-2 p-6 sm:p-7 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-[#0C0E12] to-[#0A0C10] shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Activity size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-lg">Push-Up Tracker</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    Calibrated Vision Ready
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time floor hand placement & plank alignment verification before counting starts
                </p>
              </div>
            </div>

            <span className="p-2 rounded-xl bg-white/5 text-gray-400">
              <Camera size={18} />
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed mb-4">
            Place your camera at floor or desk height. Before the counter starts, an automated visual calibration verifies your hands are placed flat on the floor and your spine is in a genuine horizontal or knee plank.
          </p>

          {/* Pre-Workout Calibration Protocol Steps */}
          <div className="mb-5 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>Pre-Workout Calibration Protocol</span>
              </span>
              <button
                type="button"
                onClick={() => setRequireCalibration(!requireCalibration)}
                className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Toggle calibration requirement"
              >
                <span>Verification:</span>
                <strong className={requireCalibration ? 'text-emerald-400' : 'text-gray-500'}>
                  {requireCalibration ? 'Enforced' : 'Bypassed'}
                </strong>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                  1
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Hand Placement</span>
                  <span className="text-[11px] text-gray-400 leading-tight block mt-0.5">
                    Hands planted flat on floor beneath chest line
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                  2
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Plank Alignment</span>
                  <span className="text-[11px] text-gray-400 leading-tight block mt-0.5">
                    Spine elongated in toe or knee plank (no crouching)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                  3
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Lockout Countdown</span>
                  <span className="text-[11px] text-gray-400 leading-tight block mt-0.5">
                    Hold top lockout for 3 seconds to unlock counter
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic & Camera Status Pill */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-400">
            <span className="flex items-center gap-1.5 text-gray-300">
              <Smartphone size={13} className="text-cyan-400" />
              <span>{diagnosticInfo?.isMobile ? (diagnosticInfo?.isIOS ? 'iPhone (iOS)' : 'Android Phone') : 'Desktop Browser'}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span>
              Camera: <strong className={
                (typeof localStorage !== 'undefined' && localStorage.getItem('workout_camera_authorized') === 'true')
                  ? 'text-emerald-400'
                  : diagnosticInfo?.permissionState === 'granted'
                  ? 'text-emerald-400'
                  : 'text-cyan-400'
              }>
                {(typeof localStorage !== 'undefined' && localStorage.getItem('workout_camera_authorized') === 'true')
                  ? 'Remembered & Auto-Start ⚡'
                  : diagnosticInfo?.permissionState || 'Ready'}
              </strong>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-amber-400 font-bold">Push Up Arena Engine</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <Target size={14} className="text-emerald-400" />
              <span>Target: <strong>20 Reps</strong> (Auto-verifies today's habit)</span>
            </div>

            <button
              type="button"
              onClick={handleLaunchCamera}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-102 cursor-pointer"
            >
              <PlayCircle size={16} />
              <span>Start Calibrated Push-Up Session</span>
            </button>
          </div>
        </div>

        {/* Card 2: UPCOMING EXERCISES (PLANK, SQUATS, CHIN-UPS) */}
        <div className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Dumbbell size={20} />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 uppercase">
                Calisthenics
              </span>
            </div>
            <h4 className="text-white font-bold text-base mb-1">Bodyweight Mastery</h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Push-ups are your primary daily physical discipline anchor. Calibrated tracking guarantees 100% genuine rep execution.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/5 text-xs text-gray-400">
            <div className="flex items-center justify-between py-1">
              <span>Primary Exercise:</span>
              <span className="font-mono text-emerald-400 font-bold">Standard Push-Up</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Calibration Gate:</span>
              <span className="font-mono text-emerald-400 font-bold">3-Point Visual Check</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Automatic Habit Sync:</span>
              <span className="font-mono text-emerald-400 font-bold">Enabled (10+ Reps)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Push-Up Camera Modal with Pre-Workout Calibration */}
      <PushUpCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCompleteWorkout={handleWorkoutCompleted}
        targetReps={20}
        requireCalibration={requireCalibration}
      />
    </div>
  );
};
