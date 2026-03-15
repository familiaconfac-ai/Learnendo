import React from 'react';
import { Day, Lesson, UserProgress } from '../../types';

interface WorkbookViewProps {
  workbookId: number;
  lessons: Lesson[];
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  onStartFirstDay: (day: Day, lessonId: string) => void;
  onBack: () => void;
}

export const WorkbookView: React.FC<WorkbookViewProps> = ({ workbookId, lessons, progress, onSelectLesson, onStartFirstDay, onBack }) => {
  const completed = progress.completedActivities || [];

  const getLessonStatus = (lesson: Lesson, index: number): 'completed' | 'in-progress' | 'locked' => {
    const allDaysComplete = lesson.days.every(d => completed.includes(d.id));
    if (allDaysComplete) return 'completed';

    // First lesson is always accessible
    if (index === 0) return 'in-progress';

    // Unlock this lesson only when every day in the previous lesson is done
    const prevLesson = lessons[index - 1];
    const prevAllDone = prevLesson.days.every(d => completed.includes(d.id));
    return prevAllDone ? 'in-progress' : 'locked';
  };

  const firstUnlockedIndex = lessons.findIndex((lesson, index) => getLessonStatus(lesson, index) === 'in-progress');

  return (
    <div className="workbook-view min-h-screen bg-blue-50 pb-32">
      <div className="max-w-[420px] mx-auto px-4 pt-6">
        <button onClick={onBack} className="mb-4 text-blue-500 font-semibold">← Back</button>
        <h1 className="text-xl font-bold mb-8 text-center text-blue-900">Workbook {workbookId}</h1>

        {/* Island path */}
        <div className="flex flex-col items-center gap-8">
          {lessons.map((lesson, index) => {
            const status = getLessonStatus(lesson, index);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';

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
                    const nextDay = lesson.days.find(d => !completed.includes(d.id)) ?? lesson.days[0];
                    if (nextDay) onStartFirstDay(nextDay, lesson.id);
                  }}
                  disabled={isLocked}
                  className={`w-[70px] h-[70px] rounded-full flex flex-col items-center justify-center font-bold text-sm transition-transform active:scale-95 ${
                    isLocked
                      ? 'bg-slate-200 text-slate-400 shadow-inner cursor-not-allowed'
                      : isCompleted
                      ? 'bg-green-400 text-white shadow-[0_4px_0_0_#16a34a]'
                      : 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                  }${index === firstUnlockedIndex ? ' animate-pulse' : ''}`}
                >
                  {isCompleted ? '✓' : isLocked ? '🔒' : index + 1}
                </button>
                <p className={`text-center text-xs mt-2 max-w-[90px] leading-tight ${
                  isLocked ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {lesson.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};