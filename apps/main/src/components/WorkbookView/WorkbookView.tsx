import React from 'react';
import { Lesson, UserProgress } from '../../types';
import { getPedagogicalLessonStatus } from '../../engine/lessonProgressionEngine';

interface WorkbookViewProps {
  workbookId: number;
  lessons: Lesson[];
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  onOpenGrammarOverview?: () => void;
  isAdmin?: boolean;
  // Used to scope lesson completion markers by course language.
  currentLanguage?: string;
  uiLanguage?: 'en' | 'pt' | 'es';
  onBack: () => void;
}

const LESSON_TEST_PREFIX = 'lesson_test_passed_';

function getVisibleLessonNumber(lesson: Lesson, fallbackIndex: number): number {
  const lessonNumberFromTitle = Number((lesson.title || '').match(/^Lesson\s*(\d+)/i)?.[1] ?? NaN);
  if (Number.isFinite(lessonNumberFromTitle)) return lessonNumberFromTitle;

  const wbMatch = (lesson.id || '').match(/_l(\d+)/i);
  if (wbMatch) return Number(wbMatch[1]);

  const lessonNumberFromId = Number((lesson.id || '').match(/lesson(\d+)/i)?.[1] ?? NaN);
  if (Number.isFinite(lessonNumberFromId)) return lessonNumberFromId;

  return fallbackIndex + 1;
}

export const WorkbookView: React.FC<WorkbookViewProps> = ({
  workbookId,
  lessons,
  progress,
  onSelectLesson,
  onOpenGrammarOverview,
  isAdmin = false,
  currentLanguage = 'en',
  uiLanguage = 'en',
  onBack,
}) => {
  const completed = progress.completedActivities || [];
  const totalIslands = workbookId === 1 ? 12 : Math.max(lessons.length, 1);

  const islandSlots = Array.from({ length: totalIslands }, (_, index) => {
    const lesson = lessons[index];
    if (lesson) return lesson;
    return {
      id: `lesson${index + 1}`,
      title: `Lesson ${index + 1}`,
      days: [],
    } as Lesson;
  });

  const langSuffix = currentLanguage !== 'en' ? `${currentLanguage}_` : '';
  const fullPrefix = `${LESSON_TEST_PREFIX}${langSuffix}`;
  const completedLessonSet = new Set(
    completed
      .filter((activityId) => activityId.startsWith(fullPrefix))
      .map((activityId) => Number(activityId.replace(fullPrefix, '')))
      .filter((value) => Number.isFinite(value)),
  );

  const getLessonStatus = (index: number): 'completed' | 'in-progress' | 'locked' => {
    const lesson = islandSlots[index];
    const lessonNumber = lesson ? getVisibleLessonNumber(lesson, index) : index + 1;
    return getPedagogicalLessonStatus(lessonNumber, completedLessonSet, isAdmin);
  };

  const firstUnlockedIndex = islandSlots.findIndex((_, index) => getLessonStatus(index) === 'in-progress');
  const backLabel = uiLanguage === 'pt' ? 'Cursos' : uiLanguage === 'es' ? 'Cursos' : 'Courses';
  const workbookLabel = uiLanguage === 'pt' ? 'Caderno' : uiLanguage === 'es' ? 'Libro' : 'Workbook';

  return (
    <div className="workbook-view min-h-screen w-full overflow-x-hidden bg-slate-900 pb-28">
      <div className="mx-auto w-full max-w-full px-3 pt-6 sm:px-4 sm:pt-8">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-base font-bold text-white"
          aria-label={backLabel}
        >
          &larr; {backLabel}
        </button>

        <div className="mb-6 flex flex-col items-center sm:mb-8">
          <img
            src={`/islands/workbook${workbookId}.gif`}
            alt={`Workbook ${workbookId}`}
            style={{ width: '156px' }}
            className="h-[156px] w-[156px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
          />
          {onOpenGrammarOverview && (
            <button
              onClick={onOpenGrammarOverview}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition-transform active:scale-95"
            >
              <span>Grammar Focus</span>
            </button>
          )}
          <p className="mt-3 text-center text-sm font-black uppercase tracking-[0.24em] text-yellow-300">
            {workbookLabel} {workbookId}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {islandSlots.map((lesson, index) => {
            const status = getLessonStatus(index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const visibleLessonNumber = getVisibleLessonNumber(lesson, index);
            const cleanTitle = lesson.title
              .replace(/^Workbook\s*\d+\s*[:\u2014\u2013-]\s*/i, '')
              .replace(/^Lesson\s*\d+\s*[:\u2014\u2013-]\s*/i, '')
              .trim();
            const displayTitle = /^placeholder$/i.test(cleanTitle) ? '' : cleanTitle;
            const isCurrent = status === 'in-progress' && index === firstUnlockedIndex;
            const lessonLabel = displayTitle ? `Lesson ${visibleLessonNumber} - ${displayTitle}` : `Lesson ${visibleLessonNumber}`;
            const offsetClass = (['ml-[-50px] sm:ml-[-60px]', 'ml-0', 'ml-[50px] sm:ml-[60px]', 'ml-0'] as const)[index % 4];

            return (
              <div key={lesson.id} className={`relative ${offsetClass}`}>
                {index === firstUnlockedIndex && (
                  <img
                    src="/mascot.png"
                    alt="Learnendo Mascot"
                    className="pointer-events-none absolute right-[-80px] top-0 z-10 w-[70px]"
                  />
                )}
                <button
                  onClick={() => {
                    if (isLocked) return;
                    onSelectLesson(lesson.id);
                  }}
                  disabled={isLocked}
                  className={`relative flex h-[70px] w-[70px] flex-col items-center justify-center overflow-hidden rounded-full text-sm font-bold transition-transform active:scale-95 ${
                    isLocked
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-inner'
                      : isCompleted
                        ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                        : 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                  }${isCurrent ? ' animate-pulse' : ''}`}
                >
                  <img
                    src="/islands/ilhaLesson1.png"
                    alt={`Lesson ${visibleLessonNumber}`}
                    className={`absolute inset-0 h-full w-full rounded-full object-cover ${isLocked ? 'opacity-10' : 'opacity-30'}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="relative z-10">
                    {isCompleted ? '✓' : isLocked ? '🔒' : visibleLessonNumber}
                  </span>
                </button>
                <p className={`mt-2 max-w-[140px] text-center text-xs leading-tight ${
                  isLocked ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  {lessonLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
