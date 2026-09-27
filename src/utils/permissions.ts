import type { User } from 'firebase/auth';
import { DayOfWeek, WeeklyChecks } from '../types';
import { getCurrentDayName, getWeekKey } from './date';

export const ADMIN_EMAILS = ['ibotnari589@gmail.com', 'botnariionut37@gmail.com'];

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user?.email || !user.emailVerified) return false;
  return ADMIN_EMAILS.includes(user.email.trim().toLowerCase());
}

export function isToday(weekKey: string, day: DayOfWeek): boolean {
  return weekKey === getWeekKey(new Date()) && day === getCurrentDayName();
}

export function canEditDay(weekKey: string, day: DayOfWeek, isAdmin: boolean): boolean {
  return isAdmin || isToday(weekKey, day);
}

/**
 * Returns `base` with only today's check values taken from `incoming`.
 * Used so non-admins can never introduce changes to past or future days.
 */
export function applyTodayOnly(base: WeeklyChecks, incoming: WeeklyChecks): WeeklyChecks {
  const todayWeek = getWeekKey(new Date());
  const today = getCurrentDayName();
  const incomingWeek = incoming[todayWeek];
  if (!incomingWeek) return base;

  const result: WeeklyChecks = { ...base, [todayWeek]: { ...(base[todayWeek] || {}) } };
  Object.keys(incomingWeek).forEach(catId => {
    const value = incomingWeek[catId]?.[today];
    if (value === undefined) return;
    result[todayWeek][catId] = { ...(result[todayWeek][catId] || {}), [today]: value } as Record<DayOfWeek, boolean>;
  });
  return result;
}
