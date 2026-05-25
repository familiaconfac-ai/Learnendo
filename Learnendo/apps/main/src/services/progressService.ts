import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
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
    await setDoc(
      doc(db, 'progress', userId),
      {
        lastLesson: lessonId,
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sessions: increment(1),
        daysCompleted: increment(1),
        totalAttempts: increment(totalQuestions),
        totalCorrect: increment(correctAnswers),

        [`lessons.${lessonId}`]: {
          completed: true,
          score,
          totalQuestions,
          correctAnswers,
          accuracy,
          completedAt: serverTimestamp(),
        },
      },
      { merge: true },
    );

    console.log('[progressService] ✅ Progress write completed for', userId, lessonId, `score=${score}%`);
  } catch (error) {
    console.error('[progressService] ❌ Firestore write failed:', error);
  }
}
