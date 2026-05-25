import React from 'react';
import { Lesson, UserProgress } from '../../types';

interface WorkbookViewProps {
  workbookId: number;
  lessons: Lesson[];
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  isAdmin?: boolean;
  onBack: () => void;
}

const LESSON_TEST_PREFIX = 'lesson_test_passed_';

export const WorkbookView: React.FC<WorkbookViewProps> = ({ workbookId, lessons, progress, onSelectLesson, isAdmin = false, onBack }) => {
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

  const completedLessonSet = new Set(
    completed
      .filter((activityId) => activityId.startsWith(LESSON_TEST_PREFIX))
      .map((activityId) => Number(activityId.replace(LESSON_TEST_PREFIX, '')))
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

  return (
    <div className="workbook-view min-h-screen bg-blue-50 pb-28 w-full overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
        <button onClick={onBack} className="mb-4 text-blue-500 font-semibold text-sm" aria-label="Back">←</button>

        {/* Workbook island */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src={`/islands/workbook${workbookId}.gif`}
            alt={`Workbook ${workbookId}`}
            style={{ width: '108px' }}
            className="w-[108px] h-[108px] object-contain"
          />
        </div>

        {/* Island path */}
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {islandSlots.map((lesson, index) => {
            const status = getLessonStatus(index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const lessonNumber = index + 1;
            const cleanTitle = lesson.title
              .replace(/^Workbook\s*\d+\s*[:\u2014\u2013-]\s*/i, '')
              .replace(/^Lesson\s*\d+\s*[:\u2014\u2013-]\s*/i, '')
              .trim();
            const isCurrent = status === 'in-progress' && index === firstUnlockedIndex;
            const lessonLabel = cleanTitle ? `Lesson ${lessonNumber} - ${cleanTitle}` : `Lesson ${lessonNumber}`;

            // Stagger: left → center → right → center to create a curved path feel
            const offsetClass = (['ml-[-50px] sm:ml-[-60px]', 'ml-0', 'ml-[50px] sm:ml-[60px]', 'ml-0'] as const)[index % 4];

            return (
              <div key={lesson.id} className={`relative ${offsetClass}`}>
                {index === firstUnlockedIndex && (
                  <img
                    src="/mascot.png"
                    alt="Learnendo Mascot"
                    className="absolute right-[-80px] top-0 w-[70px] z-10 pointer-events-none"
                  />
                )}
                <button
                  onClick={() => {
                    if (isLocked) return;
                    onSelectLesson(lesson.id);
                  }}
                  disabled={isLocked}
                  className={`relative overflow-hidden w-[70px] h-[70px] rounded-full flex flex-col items-center justify-center font-bold text-sm transition-transform active:scale-95 ${
                        isLocked
                          ? 'bg-slate-200 text-slate-400 shadow-inner cursor-not-allowed'
                          : isCompleted
                          ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                          : 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                      }${isCurrent ? ' animate-pulse' : ''}`}
                >
                  <img
                    src={`/islands/ilhaLesson1.png`}
                    alt={`Lesson ${lessonNumber}`}
                    className={`absolute inset-0 w-full h-full object-cover ${isLocked ? 'opacity-10' : 'opacity-30'} rounded-full`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="relative z-10">
                    {isCompleted ? '✓' : isLocked ? '🔒' : lessonNumber}
                  </span>
                </button>
                <p className={`text-center text-xs mt-2 max-w-[140px] leading-tight ${
                  isLocked ? 'text-slate-400' : 'text-slate-600'
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
