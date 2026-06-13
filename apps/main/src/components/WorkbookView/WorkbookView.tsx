import React from 'react';
import { Lesson, UserProgress } from '../../types';

interface WorkbookViewProps {
  workbookId: number;
  lessons: Lesson[];
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  availableWorkbookIds?: number[];
  isAdmin?: boolean;
  // Used to scope lesson completion markers by course language.
  currentLanguage?: string;
  onSelectWorkbook?: (workbookId: number) => void;
  onOpenWorkbookList?: () => void;
  onOpenPdfLanding?: () => void;
  uiLanguage?: 'en' | 'pt' | 'es';
  onBack: () => void;
}

const LESSON_TEST_PREFIX = 'lesson_test_passed_';

export const WorkbookView: React.FC<WorkbookViewProps> = ({
  workbookId,
  lessons,
  progress,
  onSelectLesson,
  availableWorkbookIds = [],
  isAdmin = false,
  currentLanguage = 'en',
  onSelectWorkbook,
  onOpenWorkbookList,
  onOpenPdfLanding,
  uiLanguage = 'en',
  onBack,
}) => {
  const completed = progress.completedActivities || [];
  const totalIslands = workbookId === 1 ? 12 : Math.max(lessons.length, 1);
  const sortedWorkbookIds = [...availableWorkbookIds].sort((a, b) => a - b);
  const hasWorkbookSwitcher = sortedWorkbookIds.length > 1;

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
    const lessonNumber = index + 1;
    if (completedLessonSet.has(lessonNumber)) return 'completed';
    if (isAdmin) return 'in-progress';
    if (lessonNumber === 1) return 'in-progress';
    if (completedLessonSet.has(lessonNumber - 1)) return 'in-progress';
    return 'locked';
  };

  const firstUnlockedIndex = islandSlots.findIndex((_, index) => getLessonStatus(index) === 'in-progress');
  const backLabel = uiLanguage === 'pt' ? 'Cursos' : uiLanguage === 'es' ? 'Cursos' : 'Courses';
  const workbookLabel = uiLanguage === 'pt' ? 'Caderno' : uiLanguage === 'es' ? 'Libro' : 'Workbook';
  const tracksLabel = uiLanguage === 'pt' ? 'Trilhas' : uiLanguage === 'es' ? 'Rutas' : 'Tracks';
  const switcherLabel = uiLanguage === 'pt' ? 'Escolha o caderno' : uiLanguage === 'es' ? 'Elige el libro' : 'Choose your workbook';
  const switcherHint = uiLanguage === 'pt'
    ? 'Toque em outro livro para trocar sem sair desta tela.'
    : uiLanguage === 'es'
      ? 'Toca otro libro para cambiar sin salir de esta pantalla.'
      : 'Tap another workbook to switch without leaving this screen.';
  const listLabel = uiLanguage === 'pt' ? 'Ver todos os cadernos' : uiLanguage === 'es' ? 'Ver todos los libros' : 'View all workbooks';

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
          <p className="mt-3 text-center text-sm font-black uppercase tracking-[0.24em] text-yellow-300">
            {workbookLabel} {workbookId}
          </p>
          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-slate-800/90 p-1 shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#ca8a04]"
              aria-pressed="true"
            >
              {tracksLabel}
            </button>
            <button
              type="button"
              onClick={onOpenPdfLanding}
              className="rounded-full px-5 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
            >
              PDF
            </button>
          </div>
          {hasWorkbookSwitcher && (
            <div className="mt-4 w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/80 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.35)]">
              <p className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-300">
                {switcherLabel}
              </p>
              <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">
                {switcherHint}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {sortedWorkbookIds.map((id) => {
                  const isCurrentWorkbook = id === workbookId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectWorkbook?.(id)}
                      className={`min-w-[112px] rounded-full border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                        isCurrentWorkbook
                          ? 'border-yellow-300 bg-yellow-400 text-slate-950 shadow-[0_4px_0_0_#ca8a04]'
                          : 'border-slate-500 bg-slate-700 text-slate-100 hover:border-slate-300'
                      }`}
                      aria-pressed={isCurrentWorkbook}
                    >
                      {workbookLabel} {id}
                    </button>
                  );
                })}
              </div>
              {onOpenWorkbookList && (
                <button
                  type="button"
                  onClick={onOpenWorkbookList}
                  className="mx-auto mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:text-cyan-200"
                >
                  {listLabel}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {islandSlots.map((lesson, index) => {
            const status = getLessonStatus(index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const lessonNumber = index + 1;
            const lessonNumberFromId = Number((lesson.id || '').match(/lesson(\d+)/i)?.[1] ?? NaN);
            const lessonNumberFromTitle = Number((lesson.title || '').match(/^Lesson\s*(\d+)/i)?.[1] ?? NaN);
            const visibleLessonNumber = Number.isFinite(lessonNumberFromTitle)
              ? lessonNumberFromTitle
              : Number.isFinite(lessonNumberFromId)
                ? lessonNumberFromId
                : lessonNumber;
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
                    alt={`Lesson ${lessonNumber}`}
                    className={`absolute inset-0 h-full w-full rounded-full object-cover ${isLocked ? 'opacity-10' : 'opacity-30'}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="relative z-10">
                    {isCompleted ? '✓' : isLocked ? '🔒' : lessonNumber}
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
