// ─────────────────────────────────────────────────────────────
// Week-based scoring (lesson = one week, days 1–7)
// ─────────────────────────────────────────────────────────────

export type DayProgress = {
  dayNumber: number;
  completed: boolean;
  /** Actual score 0–100 for this day (optional). Used to determine diamonds. */
  score?: number;
};

export interface WeeklyScoreResult {
  fire: number;
  freeze: number;
  diamonds: number;
  stars: number;
}

/**
 * Calculate week-based score from the progress of individual days.
 *
 * Caller is responsible for passing only the days that were actually
 * unlocked (scheduled or completed). Future days that the student has
 * not yet had access to must be excluded before calling this function –
 * this avoids counting them as freeze in admin/bypass scenarios.
 *
 * @param days - Array of unlocked/completed day records for the lesson week.
 * @returns Weekly score metrics (all values in the 0–7 range).
 */
export function calculateWeeklyScore(days: DayProgress[]): WeeklyScoreResult {
  console.log('[Score] calculateWeeklyScore — DAYS LENGTH:', days.length);

  if (days.length === 0) {
    console.log('[Score] No days provided — returning all zeros.');
    return { fire: 0, freeze: 0, diamonds: 0, stars: 0 };
  }

  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  let fire = 0;
  let freeze = 0;
  let diamonds = 0;

  for (const day of sorted) {
    console.log('[Score] Day:', {
      dayNumber: day.dayNumber,
      completed: day.completed,
      score: day.score ?? '(no score)',
    });
    if (day.completed) {
      fire++;
      if ((day.score ?? 0) === 100) diamonds++;
    } else {
      // Only reached here for days the caller confirmed were unlocked/due.
      freeze++;
    }
  }

  const stars = Math.max(0, fire + diamonds - freeze);
  console.log('[Score] Result:', { fire, freeze, diamonds, stars });
  return { fire, freeze, diamonds, stars };
}

// ─────────────────────────────────────────────────────────────
// Legacy global scoring (kept for reference – not used by UI)
// ─────────────────────────────────────────────────────────────

/** Milliseconds in one day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalise a Date to midnight UTC */
function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Full days between two dates (truncated towards zero) */
function differenceInDays(a: Date, b: Date): number {
  return Math.floor((startOfDay(a) - startOfDay(b)) / MS_PER_DAY);
}

// ─────────────────────────────────────────────────────────────
export interface ScoreResult {
  streak: number;
  freeze: number;
  diamonds: number;
  stars: number;
  activeDays: number;
  totalDays: number;
}

export interface ScoringParams {
  sessionDates: Date[];
  lessonCompletions: { date: Date; score?: number }[];
  startDate: Date;
}

export function calculateScore(params: ScoringParams): ScoreResult {
  const today = new Date();

  // Unique active days (by UTC midnight timestamp)
  const uniqueDays = new Set(params.sessionDates.map(d => startOfDay(d)));
  const sortedDays = Array.from(uniqueDays).sort((a, b) => a - b);

  // Total days elapsed since account creation (inclusive)
  const totalDays = Math.max(1, differenceInDays(today, params.startDate) + 1);
  const activeDays = sortedDays.length;

  // 🔥 STREAK — consecutive days counting backwards from today
  let streak = 0;
  let cursor = startOfDay(today);
  while (uniqueDays.has(cursor)) {
    streak++;
    cursor -= MS_PER_DAY;
  }

  // ❄️ FREEZE — missed days since start
  const freeze = Math.max(0, totalDays - activeDays);

  // 💎 DIAMONDS — lessons completed with perfect score
  const diamonds = params.lessonCompletions.filter(l => (l.score ?? 0) === 100).length;

  // ⭐ STARS — reward formula: activity + perfect lessons, penalised by misses
  const stars = Math.max(0, activeDays + diamonds - freeze);

  return { streak, freeze, diamonds, stars, activeDays, totalDays };
}
