import React from 'react';
import { Day, Lesson, UserProgress, LessonLanguageCode } from '../../types';
import { canAccessDay } from '../../engine/unlockEngine';
import { LessonProgress } from '../../engine/courseProgressEngine';

interface LessonViewProps {
  lesson: Lesson;
  lessonNumber: number;
  progress: UserProgress;
  /** Live courseProgress data for this lesson, passed in from App.tsx. When
   *  provided, day status is driven by Firestore data (date-based unlocks &
   *  real completion flags).  Falls back to local completedActivities when null. */
  lessonProgress?: LessonProgress | null;
  currentLanguage?: LessonLanguageCode;
  isAdmin?: boolean;
  onStartDay: (day: Day) => void;
  onStartWeeklyTest: (day: Day) => void;
  onSkipToSavedProgress?: () => void;
  testCompleted?: boolean;
  testScore?: number;
  testPassed?: boolean;
  onBack: () => void;
}

const LESSON_TEST_PREFIX = 'lesson_test_passed_';

/** YYYY-MM-DD in local time */
function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  lessonNumber,
  progress,
  lessonProgress,
  currentLanguage = 'en',
  isAdmin = false,
  onStartDay,
  onStartWeeklyTest,
  onSkipToSavedProgress,
  testCompleted = false,
  testScore,
  testPassed = false,
  onBack,
}) => {
  const completed = progress.completedActivities || [];
  const lessonDays = lesson.days || [];
  const firstSixDays = Array.from({ length: 6 }, (_, index) => lessonDays[index] ?? null);
  const daySeven = lessonDays[6] ?? null;
  const testMarker = `${LESSON_TEST_PREFIX}${lessonNumber}`;
  const hasPassedTest = testPassed || completed.includes(testMarker);

  /**
   * Determine day status using Firestore data when available.
   *
   * Priority (highest → lowest):
   *   1. lessonProgress (Firestore) — date-based unlock + real completion flag
   *   2. local completedActivities array — falls back when Firestore unavailable
   */
  const getDayStatus = (dayId: string | null, index: number): 'completed' | 'in-progress' | 'locked' => {
    if (!dayId) return 'locked';

    if (lessonProgress) {
      const entry = lessonProgress.days[index];
      if (!entry) return 'locked';
      // ── DIAGNOSTIC: log the lessonProgress source for each day ──
      const result = entry.completed ? 'completed'
        : isAdmin ? 'in-progress'
        : index === 0 ? 'in-progress'
        : (lessonProgress.days[index - 1]?.completed ? 'in-progress' : 'locked');
      console.log('[DAY RENDER] using lessonProgress (courseProgressEngine path)', {
        source: 'lessonProgress — users/{uid}/courseProgress/{courseId}_{bookNumber}',
        lessonNumber,
        dayIndex: index,
        dayId,
        lessonProgressStartedAt: lessonProgress.startedAt,
        entryDay: entry.day,
        entryCompleted: entry.completed,
        entryCompletedAt: entry.completedAt ?? null,
        entryScore: entry.score ?? null,
        resolvedStatus: result,
        language: currentLanguage,
        '--- STALE? ---': lessonProgress.startedAt
          ? `If startedAt does not match today's lesson, this is STALE state from previous session`
          : 'unknown',
      });
      return result;
    }

    // ── Fallback: local state ──
    const localResult = completed.includes(dayId) ? 'completed'
      : isAdmin ? 'in-progress'
      : (canAccessDay(index + 1, firstSixDays
          .map((d, i) => (d && completed.includes(d.id) ? i + 1 : null))
          .filter((n): n is number => n !== null))
        ? 'in-progress' : 'locked');
    console.log('[DAY RENDER] FALLBACK to completedActivities (no lessonProgress)', {
      source: 'progress.completedActivities',
      lessonNumber,
      dayIndex: index,
      dayId,
      dayIdInCompletedActivities: completed.includes(dayId),
      resolvedStatus: localResult,
      language: currentLanguage,
    });
    return localResult;
  };

  const firstUnlockedIndex = firstSixDays.findIndex((day, index) => getDayStatus(day?.id || null, index) === 'in-progress');

  // Day 7 (test) unlocks when all 6 practice days are completed
  const firstSixComplete = lessonProgress
    ? lessonProgress.days.slice(0, 6).every(d => d.completed)
    : firstSixDays.every(day => day && completed.includes(day.id));

  const testUnlocked = (isAdmin || firstSixComplete) && !!daySeven;
  const lessonFullyCompleted = hasPassedTest && !isAdmin;

  // ── DIAGNOSTIC: log render context on every render ──
  console.log('[LESSONVIEW RENDER]', {
    lessonNumber,
    language: currentLanguage,
    lessonProgressPresent: !!lessonProgress,
    lessonProgressStartedAt: lessonProgress?.startedAt ?? null,
    lessonProgressDaysCompleted: lessonProgress
      ? lessonProgress.days.filter(d => d.completed).map(d => `day${d.day}`)
      : '(no lessonProgress — using completedActivities)',
    completedActivitiesCount: completed.length,
    completedActivitiesHasDayIds: completed.filter(id => /^l\d+_d\d+$/.test(id) || /^d\d+$/.test(id)),
    warning: lessonProgress && lessonProgress.days.some(d => d.completed)
      ? '⚠️ lessonProgress has completed days — verify these are for THIS lesson, not a stale previous lesson'
      : null,
  });

  return (
    <div className="lesson-view min-h-screen bg-blue-50 pb-28 w-full overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
        <button onClick={onBack} className="mb-4 text-blue-500 font-semibold text-sm" aria-label="Back">Back</button>
        <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center text-blue-900">{lesson.title}</h1>
        <p className="text-center text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8">Day Islands</p>
        {onSkipToSavedProgress && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={onSkipToSavedProgress}
              className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
              type="button"
            >
              Ir para progresso salvo
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {firstSixDays.map((day, index) => {
            const status = getDayStatus(day?.id || null, index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const dayNumber = index + 1;
            const offsetClass = (['ml-[-40px] sm:ml-[-50px]', 'ml-0', 'ml-[40px] sm:ml-[50px]', 'ml-0'] as const)[index % 4];

            return (
              <div key={day?.id || `day-slot-${dayNumber}`} className={`relative ${offsetClass}`}>
                {index === firstUnlockedIndex && (
                  <img
                    src="/mascot.png"
                    alt="Learnendo Mascot"
                    className="absolute right-[-75px] top-0 w-[70px] z-10 pointer-events-none"
                  />
                )}
                <button
                  onClick={() => {
                    if (isLocked || lessonFullyCompleted || !day) return;
                    onStartDay(day);
                  }}
                  disabled={isLocked || lessonFullyCompleted}
                  className={`relative overflow-hidden w-[72px] h-[72px] rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-95 ${
                    isLocked
                      ? 'bg-slate-200 text-slate-400 shadow-inner cursor-not-allowed'
                      : isCompleted
                      ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                      : 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                  }`}
                >
                  <img
                    src={`/islands/days/day${dayNumber}.png`}
                    alt={`Day ${dayNumber}`}
                    className={`absolute inset-0 w-full h-full object-cover rounded-full ${isLocked ? 'opacity-10' : 'opacity-30'}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="relative z-10">
                    {isCompleted ? 'Done' : isLocked ? 'Lock' : dayNumber}
                  </span>
                </button>
                <p className={`text-center text-xs mt-2 leading-tight ${isLocked ? 'text-slate-400' : 'text-slate-600'}`}>
                  {`Day ${dayNumber}`}
                </p>
              </div>
            );
          })}

          <div className="relative ml-0">
            <button
              onClick={() => {
                if (!testUnlocked || hasPassedTest || !daySeven) return;
                onStartWeeklyTest(daySeven);
              }}
              disabled={!testUnlocked || hasPassedTest}
              className={`relative overflow-hidden w-[78px] h-[78px] rounded-full flex items-center justify-center text-center font-bold text-xs transition-transform active:scale-95 ${
                !testUnlocked
                  ? 'bg-slate-200 text-slate-400 shadow-inner cursor-not-allowed'
                  : hasPassedTest
                  ? 'bg-green-500 text-white shadow-[0_4px_0_0_#15803d]'
                  : 'bg-amber-500 text-white shadow-[0_4px_0_0_#b45309]'
              }`}
            >
              <img
                src="/islands/days/day7.png"
                alt="Day 7"
                className={`absolute inset-0 w-full h-full object-cover rounded-full ${!testUnlocked || hasPassedTest ? 'opacity-10' : 'opacity-30'}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="relative z-10">
                {hasPassedTest ? 'Done' : 'Test'}
              </span>
            </button>
            <p className={`text-center text-xs mt-2 leading-tight ${!testUnlocked || hasPassedTest ? 'text-slate-400' : 'text-slate-700'}`}>
              Day 7 (Final Test)
            </p>
          </div>
        </div>

        {testCompleted && typeof testScore === 'number' && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-800">Score: {testScore}%</p>
            <p className="mt-2 text-sm text-slate-600">{testScore === 100 ? 'Lesson Complete' : 'Try again'}</p>
            {testScore < 100 && (
              <button
                type="button"
                onClick={() => {
                  if (!daySeven) return;
                  onStartWeeklyTest(daySeven);
                }}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_0_#1d4ed8] active:translate-y-0.5"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};




