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
  const getLessonStatus = (lessonId: string) => {
    // Simple logic: if lesson data exists and has scores, it's completed
    const lessonProgress = progress.lessonData?.[lessonId];
    if (lessonProgress && lessonProgress.islandScores) {
      const totalScore = Object.values(lessonProgress.islandScores).reduce((sum: number, score: any) => sum + (score as number), 0) as number;
      const totalMax = lessons.find(l => l.id === lessonId)?.days.length || 1;
      if (totalScore >= totalMax * 100) return 'completed';
      return 'in-progress';
    }
    return 'locked';
  };

  return (
    <div className="workbook-view p-4">
      <button onClick={onBack} className="mb-4 text-blue-500">← Back</button>
      <h1 className="text-2xl font-bold mb-6">Workbook {workbookId}</h1>
      <div className="grid grid-cols-1 gap-4">
        {lessons.map((lesson, index) => {
          const status = getLessonStatus(lesson.id);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          const isCurrent = status === 'in-progress';

          return (
            <button
              key={lesson.id}
              onClick={() => !isLocked && onSelectLesson(lesson.id)}
              disabled={isLocked}
              className={`p-4 rounded-lg border text-left ${
                isLocked ? 'bg-gray-200 text-gray-500' :
                isCompleted ? 'bg-green-100 border-green-300' :
                isCurrent ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{lesson.title}</h2>
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