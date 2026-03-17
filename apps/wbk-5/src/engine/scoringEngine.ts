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
