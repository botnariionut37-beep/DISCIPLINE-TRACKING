/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayOfWeek } from '../types';

/**
 * Gets the ISO-8601 week number and year for a given date
 * Returns a string formatted like "YYYY-Www" (e.g., "2026-W24")
 */
export function getWeekKey(date: Date): string {
  const tempDate = new Date(date.getTime());
  // ISO week starts on Monday, so set to nearest Thursday
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.getTime();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - tempDate.getTime()) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Parses a weekKey (e.g. "2026-W24") and returns the Monday of that week
 */
export function getMondayOfKey(weekKey: string): Date {
  const regex = /^(\d{4})-W(\d{2})$/;
  const match = weekKey.match(regex);
  if (!match) return new Date();
  
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  
  // Start with Jan 4 of that year (which is guaranteed to be in week 1)
  const jan4 = new Date(year, 0, 4);
  const isoDayNum = (jan4.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
  const mondayOfW1 = new Date(jan4.getTime() - isoDayNum * 24 * 60 * 60 * 1000);
  
  // Add week offset
  const millisecondOffset = (week - 1) * 7 * 24 * 60 * 60 * 1000;
  return new Date(mondayOfW1.getTime() + millisecondOffset);
}

/**
 * Gets a nicely formatted date range label for a weekKey (e.g., "Jun 8 - Jun 14, 2026")
 */
export function getWeekLabel(weekKey: string): string {
  const monday = getMondayOfKey(weekKey);
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  
  const optionsShort: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const optionsYear: Intl.DateTimeFormatOptions = { year: 'numeric' };
  
  const monStr = monday.toLocaleDateString('en-US', optionsShort);
  const sunStr = sunday.toLocaleDateString('en-US', { ...optionsShort, year: sunday.getFullYear() !== monday.getFullYear() ? 'numeric' : undefined });
  const yearStr = sunday.toLocaleDateString('en-US', optionsYear);
  
  return `${monStr} – ${sunStr}${sunday.getFullYear() === monday.getFullYear() ? `, ${yearStr}` : ''}`;
}

/**
 * Adds or subtracts weeks from a weekKey and returns a new weekKey
 */
export function getOffsetWeekKey(weekKey: string, weekOffset: number): string {
  const currentMon = getMondayOfKey(weekKey);
  const targetMon = new Date(currentMon.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
  return getWeekKey(targetMon);
}

/**
 * Gets individual dates (Day number and name) in order (Mon -> Sun) for a weekKey
 */
export function getDayDates(weekKey: string): { dayName: DayOfWeek; dateStr: string; dateNum: number }[] {
  const monday = getMondayOfKey(weekKey);
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return days.map((dayName, idx) => {
    const d = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
    return {
      dayName,
      dateNum: d.getDate(),
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });
}

/**
 * Gets the current weekday name (Monday through Sunday)
 */
export function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const idx = new Date().getDay();
  return days[idx];
}
