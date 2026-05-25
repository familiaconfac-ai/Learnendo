import { UserProgress } from '../types';

/**
 * Returns the first day number that has NOT been completed.
 * completedDays = [1,2,3] → 4
 * completedDays = [1,3]   → 2  (gap)
 * completedDays = []       → 1
 */
export function getNextAvailableDay(completedDays: number[]): number {
  let day = 1;
  const sorted = [...completedDays].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== day) {
      return day;
    }
    day++;
  }
  return day;
}

/**
 * Returns true only when dayNumber is exactly the next required day
 * (i.e. the first incomplete day in sequential order).
 * Optional todayIndex adds a time-based ceiling without breaking progression.
 */
export function canAccessDay(
  dayNumber: number,
  completedDays: number[],
  todayIndex?: number
): boolean {
  const nextDay = getNextAvailableDay(completedDays);
  if (dayNumber !== nextDay) return false;
  if (todayIndex !== undefined && dayNumber > todayIndex) return false;
  return true;
}

/**
 * Converts an absolute start date into a 1-based day index for today.
 * Day 1 = startDate, Day 2 = startDate + 1 day, etc.
 */
export function getTodayIndex(startDate: Date): number {
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff + 1;
}

// Kept for backward compatibility — these stub methods are not called in production.
export class UnlockEngine {
  static isDayUnlocked(_progress: UserProgress, _dayId: string): boolean {
    return true;
  }

  static getNextUnlockTime(_progress: UserProgress): Date | null {
    return null;
  }
}