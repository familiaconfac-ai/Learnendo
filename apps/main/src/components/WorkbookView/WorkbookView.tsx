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

const getLessonNumberFromId = (lessonId: string) => {
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

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
  const currentLessonNumber = Math.min(Math.max(progress.currentLesson || 1, 1), totalIslands);

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
    <div className="workbook-view min-h-screen bg-blue-50 pb-32">
      <div className="max-w-[420px] mx-auto px-4 pt-6">
        <button onClick={onBack} className="mb-4 text-blue-500 font-semibold" aria-label="Back">←</button>
        <h1 className="text-xl font-bold mb-8 text-center text-blue-900">Workbook {workbookId}</h1>

        {/* Island path */}
        <div className="flex flex-col items-center gap-8">
          {islandSlots.map((lesson, index) => {
            const status = getLessonStatus(index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const lessonNumber = index + 1;
            const cleanTitle = lesson.title
              .replace(/^Lesson\s*\d+\s*[:\u2014\u2013-]\s*/i, '')
              .trim();
            const isCurrent = lessonNumber === currentLessonNumber && !isCompleted;

            // Stagger: left → center → right → center to create a curved path feel
            const offsetClass = (['ml-[-60px]', 'ml-0', 'ml-[60px]', 'ml-0'] as const)[index % 4];

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
                  className={`w-[70px] h-[70px] rounded-full flex flex-col items-center justify-center font-bold text-sm transition-transform active:scale-95 ${
                    isLocked
                      ? 'bg-slate-200 text-slate-400 shadow-inner cursor-not-allowed'
                      : isCompleted
                      ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                      : 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                  }${isCurrent ? ' animate-pulse' : ''}`}
                >
                  {isCompleted ? '✓' : isLocked ? '🔒' : lessonNumber}
                </button>
                <p className={`text-center text-xs mt-2 max-w-[90px] leading-tight ${
                  isLocked ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {`Lesson ${lessonNumber}`}
                  {cleanTitle && cleanTitle !== lesson.title && (
                    <span className="block text-[10px] leading-snug mt-0.5 opacity-80">{cleanTitle}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};