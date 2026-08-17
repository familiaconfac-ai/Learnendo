import { doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { clearPedagogicalAppBadge } from './appBadge';
import { closeObsoleteInactivityNotifications } from './persistentNotifications';
import { LAST_PEDAGOGICAL_ACTIVITY_FIELD } from '../engine/dashboardMetrics';

/**
 * Atomically records a day/lesson completion in the flat /progress/{userId} doc.
 *
 * This write is independent of completeCourseDay so it always fires even when
 * the broader stats pipeline fails. Uses increment() so sessions accumulate
 * correctly across calls instead of being overwritten.
 */
export async function trackLessonCompletion({
  userId,
  lessonId,
  score,
  totalQuestions,
  correctAnswers,
  attempts,
  errors,
  courseId,
  languageCode,
  currentWorkbook,
  currentLesson,
  currentDay,
}: {
  userId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  attempts?: number;
  errors?: number;
  courseId?: string;
  languageCode?: string;
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
}): Promise<void> {
  if (!userId || !db) return;

  const answerAttempts = Math.max(0, attempts ?? totalQuestions);
  const answerErrors = Math.min(answerAttempts, Math.max(0, errors ?? answerAttempts - correctAnswers));
  const answerCorrect = Math.min(answerAttempts, Math.max(0, answerAttempts - answerErrors));
  const accuracy = answerAttempts > 0 ? answerCorrect / answerAttempts : 0;

  console.log('🔥 FIREBASE WRITE START', { userId, lessonId, score, correctAnswers, totalQuestions, accuracy });

  try {
    const reference = doc(db, 'progress', userId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data() ?? {};
      const existing = data.lessons?.[lessonId] ?? data[`lessons.${lessonId}`];
      const firstCompletion = existing?.completed !== true;
      const previousAttempts = Math.max(0, existing?.attempts ?? existing?.totalQuestions ?? 0);
      const previousCorrect = Math.max(0, existing?.correctAnswers ?? 0);
      const previousErrors = Math.max(0, existing?.errors ?? previousAttempts - previousCorrect);
      const nextAttempts = previousAttempts + answerAttempts;
      const nextCorrect = previousCorrect + answerCorrect;
      const nextErrors = previousErrors + answerErrors;
      const activeCourse = courseId ? {
        ...(data.courses?.[courseId] ?? {}),
        courseId,
        ...(languageCode ? { languageCode } : {}),
        lastActivityAt: serverTimestamp(),
        ...(currentWorkbook !== undefined ? { currentWorkbook } : {}),
        ...(currentLesson !== undefined ? { currentLesson } : {}),
        ...(currentDay !== undefined ? { currentDay } : {}),
      } : null;
      transaction.set(reference, {
        lastLesson: lessonId,
        [LAST_PEDAGOGICAL_ACTIVITY_FIELD]: serverTimestamp(),
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(courseId ? { courseId } : {}),
        ...(languageCode ? { languageCode } : {}),
        ...(currentWorkbook !== undefined ? { currentWorkbook } : {}),
        ...(currentLesson !== undefined ? { currentLesson } : {}),
        ...(currentDay !== undefined ? { currentDay } : {}),
        ...(activeCourse ? { courses: { ...(data.courses ?? {}), [courseId!]: activeCourse } } : {}),
        ...(firstCompletion ? {
          sessions: increment(1),
          daysCompleted: increment(1),
        } : {}),
        totalAttempts: increment(answerAttempts),
        totalCorrect: increment(answerCorrect),
        totalErrors: increment(answerErrors),
        lessons: {
          [lessonId]: {
            completed: true,
            score: firstCompletion ? score : (existing?.score ?? score),
            totalQuestions,
            attempts: nextAttempts,
            correctAnswers: nextCorrect,
            errors: nextErrors,
            accuracy: nextAttempts > 0 ? nextCorrect / nextAttempts : accuracy,
            completedAt: existing?.completedAt ?? serverTimestamp(),
            lastActivityAt: serverTimestamp(),
          },
        },
      }, { merge: true });
    });

    // Chrome/Android derives its launcher badge from persistent notifications.
    // Remove only obsolete inactivity reminders after the activity is durable.
    await closeObsoleteInactivityNotifications().catch((error) => {
      console.warn('[Notifications] Could not close obsolete inactivity notifications:', error);
    });
    await clearPedagogicalAppBadge();

    console.log('[progressService] ✅ Progress write completed for', userId, lessonId, `score=${score}%`);
  } catch (error) {
    console.error('[progressService] ❌ Firestore write failed:', error);
  }
}
