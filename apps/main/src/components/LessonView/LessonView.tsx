import { useUiLanguage } from '../../i18n/UiLanguageContext';
import { getUiLabels, curricularLessonTitle } from '../../i18n/uiLabels';
import React from 'react';
import { Day, Lesson, UserProgress, LessonLanguageCode } from '../../types';
import { LessonProgress } from '../../engine/courseProgressEngine';
import { getUnitNumberFromLessonNumber } from '../../utils/workbookUnits';

interface LessonViewProps {
  lesson: Lesson;
  lessonNumber: number;
  progress: UserProgress;
  /** Accumulated unique word count up to and including this lesson. Displayed
   *  below the lesson subtitle as a discrete progress indicator. */
  wordCount?: number;
  /** Live courseProgress data for this lesson, passed in from App.tsx. When
   *  provided, day status is driven by Firestore data (date-based unlocks &
   *  real completion flags).  Falls back to local completedActivities when null. */
  lessonProgress?: LessonProgress | null;
  currentLanguage?: LessonLanguageCode;
  isAdmin?: boolean;
  canAccessAllDays?: boolean;
  onStartDay: (day: Day) => void;
  onStartWeeklyTest: (day: Day) => void;
  testCompleted?: boolean;
  testScore?: number;
  testPassed?: boolean;
  onBack: () => void;
  onGrammar?: () => void;
}

const LESSON_TEST_PREFIX = 'lesson_test_passed_';

export const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  lessonNumber,
  progress,
  wordCount,
  lessonProgress,
  currentLanguage = 'en',
  isAdmin = false,
  canAccessAllDays = false,
  onStartDay,
  onStartWeeklyTest,
  testCompleted = false,
  testScore,
  testPassed = false,
  onBack,
  onGrammar,
}) => {
  const { uiLanguage } = useUiLanguage();
  const ui = getUiLabels(uiLanguage);
  const unitNumber = getUnitNumberFromLessonNumber(lessonNumber);
  const completed = progress.completedActivities || [];
  const completedFromMap = Object.keys(progress.days ?? {}).filter((id) => progress.days?.[id] === true);
  const completedExerciseSet = new Set([...completed, ...completedFromMap]);
  const lessonDays = lesson.days || [];
  const firstSixDays = Array.from({ length: 6 }, (_, index) => lessonDays[index] ?? null);
  const daySeven = lessonDays[6] ?? null;
  // Build a course-qualified marker so English 'lesson_test_passed_1' never
  // appears as completed when viewing the PT or ES course, and vice-versa.
  const langSuffix = currentLanguage !== 'en' ? `${currentLanguage}_` : '';
  const testMarker = `${LESSON_TEST_PREFIX}${langSuffix}${lessonNumber}`;
  const hasPassedTest = testPassed || completed.includes(testMarker);

  const isExerciseCompleted = (dayId: string | null, index: number): boolean => {
    if (!dayId) return false;
    const completedByMainProgress = completedExerciseSet.has(dayId);
    const completedByLessonProgress = !!lessonProgress?.days[index]?.completed;
    return completedByMainProgress || completedByLessonProgress;
  };

  const isDefaultFirstExercise = (index: number): boolean => lessonNumber === 1 && index === 0;

  const isUnlockedByPreviousCompletion = (index: number): boolean => {
    if (index === 0) return true;
    const previousDay = firstSixDays[index - 1];
    if (!previousDay) return false;
    return isExerciseCompleted(previousDay.id, index - 1);
  };

  const canOpenExercise = (dayId: string | null, index: number): boolean => {
    if (!dayId) return false;
    if (isAdmin || canAccessAllDays) return true;
    if (isExerciseCompleted(dayId, index)) return true;
    if (isDefaultFirstExercise(index)) return true;
    return isUnlockedByPreviousCompletion(index);
  };

  const getDayStatus = (dayId: string | null, index: number): 'completed' | 'in-progress' | 'locked' => {
    if (!dayId) return 'locked';
    if (isExerciseCompleted(dayId, index)) return 'completed';
    return canOpenExercise(dayId, index) ? 'in-progress' : 'locked';
  };

  const firstUnlockedIndex = firstSixDays.findIndex((day, index) => !day ? false : canOpenExercise(day.id, index) && !isExerciseCompleted(day.id, index));

  // Exercise 7 (test) unlocks when all 6 practice exercises are completed.
  // Uses merged completion sources so late lessonProgress cannot hide saved progress.
  const firstSixComplete = firstSixDays.every((day, index) => !!day && isExerciseCompleted(day.id, index));

  const testUnlocked = (isAdmin || canAccessAllDays || firstSixComplete) && !!daySeven;

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
    <div className="lesson-view min-h-screen bg-slate-900 pb-28 w-full overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
        <button onClick={onBack} className="mb-4 text-white font-bold text-base flex items-center gap-1" aria-label={ui.back}>← {ui.back}</button>
        {onGrammar && (
          <button
            onClick={onGrammar}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition-transform active:scale-95"
          >
            <span>📖</span>
            <span>{ui.grammar}</span>
          </button>
        )}
        {(() => {
          const mainTitle = curricularLessonTitle(lesson.title);
          return (
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300 mb-2">{ui.unit} {unitNumber}</p>
              <p className="text-lg sm:text-xl font-black text-yellow-400 leading-tight">{ui.lesson} {lessonNumber}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">{mainTitle}</h1>
              {!!wordCount && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  🦉 {wordCount} {ui.words}
                </p>
              )}
            </div>
          );
        })()}
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
                    if (isLocked || !day) return;
                    onStartDay(day);
                  }}
                  disabled={isLocked}
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
                    alt={`${ui.exercise} ${dayNumber}`}
                    className={`absolute inset-0 w-full h-full object-cover rounded-full ${isLocked ? 'opacity-10' : 'opacity-30'}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="relative z-10">
                    {isCompleted ? ui.done : isLocked ? '🔒' : dayNumber}
                  </span>
                </button>
                <p className={`text-center text-xs mt-2 leading-tight ${isLocked ? 'text-slate-600' : 'text-slate-300'}`}>
                  {`${ui.exercise} ${dayNumber}`}
                </p>
              </div>
            );
          })}

          <div className="relative ml-0">
            <button
              onClick={() => {
                if (!testUnlocked || !daySeven) return;
                onStartWeeklyTest(daySeven);
              }}
              disabled={!testUnlocked}
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
                alt={`${ui.exercise} 7`}
                className={`absolute inset-0 w-full h-full object-cover rounded-full ${!testUnlocked || hasPassedTest ? 'opacity-10' : 'opacity-30'}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="relative z-10">
                {hasPassedTest ? ui.done : `${ui.test} ${lessonNumber}`}
              </span>
            </button>
            <p className={`text-center text-xs mt-2 leading-tight ${!testUnlocked || hasPassedTest ? 'text-slate-600' : 'text-slate-300'}`}>
              {`${ui.test} ${lessonNumber}`}
            </p>
          </div>
        </div>

        {testCompleted && typeof testScore === 'number' && (
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-center shadow-sm">
            <p className="text-lg font-bold text-white">{ui.score}: {testScore}%</p>
            <p className="mt-2 text-sm text-slate-400">{testScore === 100 ? ui.lessonComplete : ui.tryAgain}</p>
            {testScore < 100 && (
              <button
                type="button"
                onClick={() => {
                  if (!daySeven) return;
                  onStartWeeklyTest(daySeven);
                }}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_0_#1d4ed8] active:translate-y-0.5"
              >
                {ui.tryAgain}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
