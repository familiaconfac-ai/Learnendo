import type { EngagementProfile, DailyActivity, RewardSnapshot } from '../../types';
import { getGuestId } from '../../services/guestSession';
import { getStorage } from '../../services/storage';
import { DIAMONDS_PER_EXERCISE, MAX_HISTORY_DAYS } from './config';
import { todayISO, getCycleDay, buildCycleDays, countMissedDaysInCompletedCycles } from './cycle';
import { computeStars } from './rewards';

// ─── Persistence ──────────────────────────────────────────────────────────────

function emptyProfile(): EngagementProfile {
  const today = todayISO();
  return {
    guestId: getGuestId(),
    anchorDate: today,
    fire: 0,
    ice: 0,
    diamonds: 0,
    stars: 0,
    activeDays: [],
    totalExercises: 0,
    history: [],
    lastUpdated: Date.now(),
  };
}

export function getEngagementProfile(): EngagementProfile {
  return getStorage().getEngagement(getGuestId()) ?? emptyProfile();
}

export function saveEngagementProfile(profile: EngagementProfile): void {
  getStorage().setEngagement(profile);
}

// ─── Derived snapshot ─────────────────────────────────────────────────────────

export function getRewardSnapshot(profile?: EngagementProfile): RewardSnapshot {
  const p = profile ?? getEngagementProfile();
  const today = todayISO();
  return {
    fire: p.fire,
    ice: p.ice,
    diamonds: p.diamonds,
    stars: p.stars,
    currentCycleDay: getCycleDay(p.anchorDate, today),
    currentCycleDays: buildCycleDays(p.anchorDate, p.activeDays, today),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Call after any study session completes.
 * Awards fire (once per day), diamonds, and recalculates ice + stars.
 *
 * @param exerciseCount – number of exercise sessions completed this call
 */
export function recordActivity(exerciseCount: number): EngagementProfile {
  const profile = getEngagementProfile();
  const today = todayISO();

  // ── Update history entry for today ──────────────────────────────────────────
  const diamonds = exerciseCount * DIAMONDS_PER_EXERCISE;
  const existing = profile.history.find((h) => h.date === today);
  if (existing) {
    existing.exercisesCompleted += exerciseCount;
    existing.diamondsEarned += diamonds;
  } else {
    const entry: DailyActivity = {
      date: today,
      exercisesCompleted: exerciseCount,
      diamondsEarned: diamonds,
    };
    profile.history.push(entry);
    // cap history length
    if (profile.history.length > MAX_HISTORY_DAYS) {
      profile.history = profile.history.slice(-MAX_HISTORY_DAYS);
    }
  }

  // ── Award fire (once per day) ────────────────────────────────────────────────
  const alreadyActive = profile.activeDays.includes(today);
  if (!alreadyActive) {
    profile.activeDays.push(today);
    profile.activeDays.sort();
    profile.fire += 1;
  }

  // ── Award diamonds ───────────────────────────────────────────────────────────
  profile.diamonds += diamonds;
  profile.totalExercises += exerciseCount;

  // ── Recalculate ice (missed days in fully elapsed cycles) ────────────────────
  profile.ice = countMissedDaysInCompletedCycles(profile.anchorDate, profile.activeDays, today);

  // ── Recalculate stars ────────────────────────────────────────────────────────
  profile.stars = computeStars(profile.fire, profile.ice, profile.diamonds);

  profile.lastUpdated = Date.now();
  saveEngagementProfile(profile);
  return profile;
}
