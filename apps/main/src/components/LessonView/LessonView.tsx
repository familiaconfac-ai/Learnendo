import React from 'react';
import { Day, Lesson, UserProgress } from '../../types';

interface LessonViewProps {
  lesson: Lesson;
  progress: UserProgress;
  onStartDay: (day: Day) => void;
  onBack: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ lesson, progress, onStartDay, onBack }) => {
  const completed = progress.completedActivities || [];

  const getDayStatus = (dayId: string, index: number): 'completed' | 'in-progress' | 'locked' => {
    if (completed.includes(dayId)) return 'completed';
    // First day is always accessible
    if (index === 0) return 'in-progress';
    // Unlock this day only when the previous day is done
    const prevDay = lesson.days[index - 1];
    return completed.includes(prevDay.id) ? 'in-progress' : 'locked';
  };

  const firstUnlockedIndex = lesson.days.findIndex((day, index) => getDayStatus(day.id, index) === 'in-progress');

  return (
    <div className="lesson-view p-4">
      <button onClick={onBack} className="mb-4 text-blue-500">← Back</button>
      <h1 className="text-2xl font-bold mb-6">{lesson.title}</h1>
      <div className="grid grid-cols-1 gap-4">
        {lesson.days.map((day, index) => {
          const status = getDayStatus(day.id, index);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';

          return (
            <div key={day.id} className="relative">
              {index === firstUnlockedIndex && (
                <img
                  src="/mascot.png"
                  alt="Learnendo Mascot"
                  className="absolute right-[-70px] top-[10px] w-[90px] z-10 pointer-events-none"
                />
              )}
              <button
                onClick={() => !isLocked && onStartDay(day)}
                disabled={isLocked}
                className={`w-full p-4 rounded-lg border text-left ${
                  isLocked ? 'bg-gray-200 text-gray-500' :
                  isCompleted ? 'bg-green-100 border-green-300' :
                  'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Day {index + 1}</h2>
                    <p className="text-sm text-gray-600 capitalize">{day.type} · {day.exercises.length} exercises</p>
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