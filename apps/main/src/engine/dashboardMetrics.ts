type DashboardProgress = Record<string, any>;
export const DASHBOARD_TIME_ZONE = 'America/Sao_Paulo';
export const LAST_PEDAGOGICAL_ACTIVITY_FIELD = 'lastPedagogicalActivityAt';

const COURSE_LANGUAGE_CODES: Record<string, string> = {
  english: 'en',
  portuguese_foreigners: 'pt',
  portuguese_native: 'pt',
  spanish: 'es',
  greek_koine: 'el',
  hebrew_biblical: 'he',
};

/** The active course is authoritative when a legacy language field disagrees. */
export function resolveDashboardLanguageCode(courseId: unknown, ...fallbacks: unknown[]): string | undefined {
  if (typeof courseId === 'string' && COURSE_LANGUAGE_CODES[courseId]) return COURSE_LANGUAGE_CODES[courseId];
  return fallbacks.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}

export type CompletedActivityRecord = {
  id: string;
  completedAt?: unknown;
  lastActivityAt?: unknown;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  attempts?: number;
  errors?: number;
  accuracy?: number;
};

function activityRecord(id: string, value: unknown): CompletedActivityRecord | null {
  if (!value || typeof value !== 'object' || (value as { completed?: unknown }).completed !== true) return null;
  return { id, ...(value as Omit<CompletedActivityRecord, 'id'>) };
}

/**
 * Reads both the canonical `lessons` map and the legacy literal fields written
 * by setDoc payloads such as `lessons.wb1_l3_d4`.
 */
export function getCompletedActivityRecords(raw?: DashboardProgress): CompletedActivityRecord[] {
  if (!raw) return [];
  const records = new Map<string, CompletedActivityRecord>();
  const lessons = raw.lessons;
  if (lessons && typeof lessons === 'object') {
    Object.entries(lessons).forEach(([id, value]) => {
      const record = activityRecord(id, value);
      if (record) records.set(id, record);
    });
  }
  Object.entries(raw).forEach(([field, value]) => {
    if (!field.startsWith('lessons.')) return;
    const id = field.slice('lessons.'.length);
    const record = activityRecord(id, value);
    if (record && !records.has(id)) records.set(id, record);
  });
  return Array.from(records.values());
}

function normalizedAccuracy(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.min(100, value <= 1 ? value * 100 : value);
}

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

function calendarDayNumber(value: unknown): number | null {
  const millis = timestampMillis(value);
  if (millis === null) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(millis));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return Math.floor(Date.UTC(part('year'), part('month') - 1, part('day')) / 86_400_000);
}

export function getDaysWithoutActivity(value: unknown, now = new Date()): number | null {
  const activityDay = calendarDayNumber(value);
  const currentDay = calendarDayNumber(now);
  return activityDay === null || currentDay === null ? null : Math.max(0, currentDay - activityDay);
}

export function formatLastPedagogicalActivityLabel(value: unknown, now = new Date()): string {
  const days = getDaysWithoutActivity(value, now);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day without activity';
  return `${days} days without activity`;
}

export function getLatestTimestamp(values: Iterable<unknown>): unknown | null {
  let latest: { value: unknown; millis: number } | null = null;
  for (const value of values) {
    const millis = timestampMillis(value);
    if (millis !== null && (!latest || millis > latest.millis)) latest = { value, millis };
  }
  return latest?.value ?? null;
}

type PedagogicalResponseEvent = {
  userId?: unknown;
  answer?: unknown;
  createdAt?: unknown;
};

/**
 * Resolves the latest durable Live answer event for each student. A response
 * counts only when it has an owner, a non-empty answer and its own timestamp;
 * class/session update timestamps are intentionally ignored.
 */
export function getLatestResponseActivityByStudent(
  responses: Iterable<PedagogicalResponseEvent>,
): Map<string, unknown> {
  const candidates = new Map<string, unknown[]>();
  for (const response of responses) {
    const userId = typeof response.userId === 'string' ? response.userId.trim() : '';
    const answer = typeof response.answer === 'string' ? response.answer.trim() : '';
    if (!userId || !answer || timestampMillis(response.createdAt) === null) continue;
    const values = candidates.get(userId) ?? [];
    values.push(response.createdAt);
    candidates.set(userId, values);
  }

  return new Map(
    Array.from(candidates, ([userId, values]) => [userId, getLatestTimestamp(values)]),
  );
}

/**
 * Resolves the latest timestamp written by a durable learning event. The
 * explicit marker is canonical; event-level fields remain as legacy fallbacks.
 * `progress.lastActivity` is intentionally excluded because older app versions
 * stamped it on login.
 */
export function getLastPedagogicalActivity(
  raw?: DashboardProgress,
  additionalCandidates: Iterable<unknown> = [],
): unknown | null {
  if (!raw) return null;
  const candidates: unknown[] = [...additionalCandidates];
  if (raw[LAST_PEDAGOGICAL_ACTIVITY_FIELD]) candidates.push(raw[LAST_PEDAGOGICAL_ACTIVITY_FIELD]);
  if (raw.lastActive) candidates.push(raw.lastActive); // trackLessonCompletion

  if (raw.lessons && typeof raw.lessons === 'object') {
    Object.values(raw.lessons).forEach((lesson) => {
      if (lesson && typeof lesson === 'object' && (lesson as { completed?: unknown }).completed === true) {
        candidates.push((lesson as { completedAt?: unknown }).completedAt);
        candidates.push((lesson as { lastActivityAt?: unknown }).lastActivityAt);
      }
    });
  }

  getCompletedActivityRecords(raw).forEach((activity) => {
    candidates.push(activity.completedAt);
    candidates.push(activity.lastActivityAt);
  });

  if (raw.courses && typeof raw.courses === 'object') {
    Object.values(raw.courses).forEach((course) => {
      if (course && typeof course === 'object') {
        candidates.push((course as { lastActivityAt?: unknown }).lastActivityAt);
      }
    });
  }

  return getLatestTimestamp(candidates);
}

/**
 * Returns the latest persisted pedagogical event from a civil day before the
 * canonical last-study day. Multiple actions on the same study day therefore
 * do not masquerade as separate study sessions in reports.
 */
export function getPreviousPedagogicalActivity(
  raw?: DashboardProgress,
  lastActivity: unknown = raw?.[LAST_PEDAGOGICAL_ACTIVITY_FIELD],
): unknown | null {
  if (!raw) return null;
  const lastDay = calendarDayNumber(lastActivity);
  if (lastDay === null) return null;

  const candidates: unknown[] = [];
  getCompletedActivityRecords(raw).forEach((activity) => {
    candidates.push(activity.completedAt, activity.lastActivityAt);
  });

  const previousMarker = raw.previousPedagogicalActivityAt;
  if (previousMarker) candidates.push(previousMarker);

  return getLatestTimestamp(candidates.filter((candidate) => {
    const candidateDay = calendarDayNumber(candidate);
    return candidateDay !== null && candidateDay < lastDay;
  }));
}

export function getUniqueCompletedActivityCount(raw?: DashboardProgress): number {
  const canonicalCompleted = raw?.lessons && typeof raw.lessons === 'object'
    ? Object.values(raw.lessons).filter((value) =>
        Boolean(value) && typeof value === 'object' && (value as { completed?: boolean }).completed === true).length
    : 0;
  if (canonicalCompleted > 0) return canonicalCompleted;
  const uniqueCompleted = getCompletedActivityRecords(raw).length;
  const aggregateCompleted = typeof raw?.daysCompleted === 'number' ? Math.max(0, raw.daysCompleted) : 0;
  return Math.max(uniqueCompleted, aggregateCompleted);
}

export function deriveDashboardRewardMetrics(raw?: DashboardProgress) {
  const activities = getCompletedActivityRecords(raw);
  const recordedDiamonds = activities.filter((activity) => activity.score === 100).length;
  const totalFire = typeof raw?.totalFire === 'number' ? Math.max(0, raw.totalFire) : 0;
  const totalDiamonds = typeof raw?.totalDiamonds === 'number' && raw.totalDiamonds > 0
    ? raw.totalDiamonds
    : recordedDiamonds;
  const totalStars = typeof raw?.totalStars === 'number' && raw.totalStars > 0
    ? raw.totalStars
    : totalFire + totalDiamonds;
  return { totalFire, totalDiamonds, totalStars };
}

export function deriveDashboardAnswerMetrics(raw?: DashboardProgress) {
  const activities = getCompletedActivityRecords(raw);
  const storedAttempts = typeof raw?.totalAttempts === 'number' ? Math.max(0, raw.totalAttempts) : 0;
  if (activities.length > 0 && storedAttempts === 0) {
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalErrors = 0;
    const accuracies: number[] = [];
    activities.forEach((activity) => {
      const attempts = Math.max(0, activity.attempts ?? activity.totalQuestions ?? 0);
      const correct = Math.min(attempts, Math.max(0, activity.correctAnswers ?? Math.round(
        attempts * ((normalizedAccuracy(activity.accuracy) ?? 0) / 100),
      )));
      const errors = Math.min(attempts, Math.max(0, activity.errors ?? attempts - correct));
      totalAttempts += attempts;
      totalCorrect += correct;
      totalErrors += errors;
      const accuracy = normalizedAccuracy(activity.accuracy)
        ?? (attempts > 0 ? (correct / attempts) * 100 : null);
      if (accuracy !== null) accuracies.push(accuracy);
    });
    return {
      totalAttempts,
      totalErrors,
      avgAccuracy: accuracies.length
        ? Math.round(accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length)
        : totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    };
  }
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
