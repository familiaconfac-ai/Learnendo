import React from 'react';
import { Lesson, UserProgress } from '../../types';

interface LessonViewProps {
  lesson: Lesson;
  progress: UserProgress;
  onBack: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ lesson, progress, onBack }) => {
  const getDayStatus = (dayId: string) => {
    // Simple logic based on progress
    const lessonProgress = progress.lessonData?.[lesson.id];
    if (lessonProgress && lessonProgress.islandScores && lessonProgress.islandScores[dayId] !== undefined) {
      return lessonProgress.islandScores[dayId] >= 100 ? 'completed' : 'in-progress';
    }
    return 'locked';
  };

  return (
    <div className="lesson-view p-4">
      <button onClick={onBack} className="mb-4 text-blue-500">← Back</button>
      <h1 className="text-2xl font-bold mb-6">{lesson.title}</h1>
      <div className="grid grid-cols-1 gap-4">
        {lesson.days.map((day, index) => {
          const status = getDayStatus(day.id);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          const isCurrent = status === 'in-progress';

          return (
            <button
              key={day.id}
              onClick={() => !isLocked && console.log('Start day', day.id)}
              disabled={isLocked}
              className={`p-4 rounded-lg border text-left ${
                isLocked ? 'bg-gray-200 text-gray-500' :
                isCompleted ? 'bg-green-100 border-green-300' :
                isCurrent ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Day {index + 1}</h2>
                  <p className="text-sm text-gray-600 capitalize">{day.type}</p>
                  <p className="text-sm text-gray-600">
                    {isCompleted ? '✓ Completed' : isCurrent ? '→ In Progress' : '🔒 Locked'}
                  </p>
                </div>
                <div className="text-2xl">
                  {isCompleted ? '✓' : isCurrent ? '→' : '🔒'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};