import { CYCLE_LENGTH } from './config';

/** Return today's ISO date string 'YYYY-MM-DD' */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Return the number of complete days elapsed between two ISO dates.
 * Positive if `to` is after `from`.
 */
export function daysBetween(from: string, to: string): number {
  const msPerDay = 86_400_000;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / msPerDay);
}

/**
 * Given an anchorDate and today's ISO date, return which day of the
 * current 7-day cycle it is (1-based, 1–7).
 */
export function getCycleDay(anchorDate: string, today: string = todayISO()): number {
  const elapsed = daysBetween(anchorDate, today);
  return (elapsed % CYCLE_LENGTH) + 1;
}

/**
 * Return the ISO start date of the current cycle .
 */
export function getCycleStart(anchorDate: string, today: string = todayISO()): string {
  const elapsed = daysBetween(anchorDate, today);
  const cycleOffset = elapsed % CYCLE_LENGTH;
  const startMs = new Date(today).getTime() - cycleOffset * 86_400_000;
  return new Date(startMs).toISOString().slice(0, 10);
}

/**
 * Build a 7-element array representing each day of the current cycle.
 *  - true  → had activity
 *  - false → missed (in the past, no activity)
 *  - null  → today or in the future
 */
export function buildCycleDays(
  anchorDate: string,
  activeDays: string[],
  today: string = todayISO(),
): (boolean | null)[] {
  const cycleStart = getCycleStart(anchorDate, today);
  const active = new Set(activeDays);

  return Array.from({ length: CYCLE_LENGTH }, (_, i) => {
    const dayMs = new Date(cycleStart).getTime() + i * 86_400_000;
    const dateStr = new Date(dayMs).toISOString().slice(0, 10);
    if (dateStr > today) return null;   // future
    if (dateStr === today) return null; // today — not yet determined
    return active.has(dateStr);
  });
}

/**
 * Count how many days in a completed cycle (all 7 days strictly before today)
 * were inactive — these generate ice tokens.
 */
export function countMissedDaysInCompletedCycles(
  anchorDate: string,
  activeDays: string[],
  today: string = todayISO(),
): number {
  const elapsed = daysBetween(anchorDate, today);
  const completedCycles = Math.floor(elapsed / CYCLE_LENGTH);
  const active = new Set(activeDays);
  let missed = 0;

  for (let c = 0; c < completedCycles; c++) {
    for (let d = 0; d < CYCLE_LENGTH; d++) {
      const dayIndex = c * CYCLE_LENGTH + d;
      const dayMs = new Date(anchorDate).getTime() + dayIndex * 86_400_000;
      const dateStr = new Date(dayMs).toISOString().slice(0, 10);
      if (!active.has(dateStr)) missed++;
    }
  }

  return missed;
}
