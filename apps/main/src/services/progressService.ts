import { doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
}: {
  userId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}): Promise<void> {
  if (!userId || !db) return;

  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  console.log('🔥 FIREBASE WRITE START', { userId, lessonId, score, correctAnswers, totalQuestions, accuracy });

  try {
    const reference = doc(db, 'progress', userId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data() ?? {};
      const existing = data.lessons?.[lessonId] ?? data[`lessons.${lessonId}`];
      const firstCompletion = existing?.completed !== true;
      transaction.set(reference, {
        lastLesson: lessonId,
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(firstCompletion ? {
          sessions: increment(1),
          daysCompleted: increment(1),
          totalAttempts: increment(totalQuestions),
          totalCorrect: increment(correctAnswers),
        } : {}),
        lessons: {
          [lessonId]: {
            completed: true,
            score,
            totalQuestions,
            correctAnswers,
            accuracy,
            completedAt: existing?.completedAt ?? serverTimestamp(),
          },
        },
      }, { merge: true });
    });

    console.log('[progressService] ✅ Progress write completed for', userId, lessonId, `score=${score}%`);
  } catch (error) {
    console.error('[progressService] ❌ Firestore write failed:', error);
  }
}
