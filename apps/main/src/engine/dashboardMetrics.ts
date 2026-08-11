type DashboardProgress = Record<string, any>;

function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  if (typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const millis = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  const millis = new Date(value as string | number | Date).getTime();
  return Number.isFinite(millis) ? millis : null;
}

/**
 * Returns only timestamps written by learning events. `progress.lastActivity`
 * is intentionally excluded because older app versions stamped it on login.
 */
export function getLastPedagogicalActivity(raw?: DashboardProgress): unknown | null {
  if (!raw) return null;
  const candidates: unknown[] = [];
  if (raw.lastActive) candidates.push(raw.lastActive); // trackLessonCompletion

  if (raw.lessons && typeof raw.lessons === 'object') {
    Object.values(raw.lessons).forEach((lesson) => {
      if (lesson && typeof lesson === 'object' && (lesson as { completed?: unknown }).completed === true) {
        candidates.push((lesson as { completedAt?: unknown }).completedAt);
      }
    });
  }

  if (raw.courses && typeof raw.courses === 'object') {
    Object.values(raw.courses).forEach((course) => {
      if (course && typeof course === 'object') {
        candidates.push((course as { lastActivityAt?: unknown }).lastActivityAt);
      }
    });
  }

  let latest: { value: unknown; millis: number } | null = null;
  candidates.forEach((value) => {
    const millis = timestampMillis(value);
    if (millis !== null && (!latest || millis > latest.millis)) latest = { value, millis };
  });
  return latest?.value ?? null;
}

export function getUniqueCompletedActivityCount(raw?: DashboardProgress): number {
  const lessons = raw?.lessons;
  if (lessons && typeof lessons === 'object') {
    const uniqueCompleted = Object.values(lessons).filter((value) =>
      Boolean(value) && typeof value === 'object' && (value as { completed?: boolean }).completed === true).length;
    if (uniqueCompleted > 0) return uniqueCompleted;
  }
  return typeof raw?.daysCompleted === 'number' ? Math.max(0, raw.daysCompleted) : 0;
}

export function deriveDashboardAnswerMetrics(raw?: DashboardProgress) {
  const totalAttempts = typeof raw?.totalAttempts === 'number' ? Math.max(0, raw.totalAttempts) : 0;
  const totalCorrect = typeof raw?.totalCorrect === 'number' ? Math.max(0, raw.totalCorrect) : null;
  const totalErrors = typeof raw?.totalErrors === 'number'
    ? Math.max(0, raw.totalErrors)
    : totalCorrect !== null
      ? Math.max(0, totalAttempts - totalCorrect)
      : 0;
  const avgAccuracy = typeof raw?.avgAccuracy === 'number' && raw.avgAccuracy > 0
    ? raw.avgAccuracy
    : totalCorrect !== null && totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;
  return { totalAttempts, totalErrors, avgAccuracy };
}
