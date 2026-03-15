import React from 'react';
import { Lesson, UserProgress } from '../../types';

interface WorkbookViewProps {
  workbookId: number;
  lessons: Lesson[];
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  onBack: () => void;
}

export const WorkbookView: React.FC<WorkbookViewProps> = ({ workbookId, lessons, progress, onSelectLesson, onBack }) => {
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
    <div className="workbook-view p-4">
      <button onClick={onBack} className="mb-4 text-blue-500">← Back</button>
      <h1 className="text-2xl font-bold mb-6">Workbook {workbookId}</h1>
      <div className="grid grid-cols-1 gap-4">
        {lessons.map((lesson, index) => {
          const status = getLessonStatus(lesson, index);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';

          return (
            <div key={lesson.id} className="relative">
              {index === firstUnlockedIndex && (
                <img
                  src="/mascot.png"
                  alt="Learnendo Mascot"
                  className="absolute right-[-70px] top-[10px] w-[90px] z-10 pointer-events-none"
                />
              )}
              <button
                onClick={() => !isLocked && onSelectLesson(lesson.id)}
                disabled={isLocked}
                className={`w-full p-4 rounded-lg border text-left ${
                  isLocked ? 'bg-gray-200 text-gray-500' :
                  isCompleted ? 'bg-green-100 border-green-300' :
                  'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{lesson.title}</h2>
                    <p className="text-sm text-gray-600">
                      {isCompleted ? '✓ Completed' : isLocked ? '🔒 Locked' : '→ Start'}
                    </p>
                  </div>
                  <div className="text-2xl">
                    {isCompleted ? '✓' : isLocked ? '🔒' : '→'}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};