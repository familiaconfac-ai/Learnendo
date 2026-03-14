import React from 'react';
import { UserProgress } from '../../types';

interface DashboardProps {
  progress: UserProgress;
  onNavigate: (section: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ progress, onNavigate }) => {
  const workbooks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="dashboard p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => onNavigate('LESSON', { workbook: progress.currentWorkbook, lesson: progress.currentLesson, day: progress.currentDay })}
      >
        Continue Learning - Workbook {progress.currentWorkbook}, Lesson {progress.currentLesson}, Day {progress.currentDay}
      </button>
      <div>
        <h2 className="text-xl mb-2">Workbooks</h2>
        <div className="grid grid-cols-2 gap-2">
          {workbooks.map(wb => (
            <button 
              key={wb} 
              className={`p-2 border rounded ${wb <= progress.currentWorkbook ? 'bg-green-200' : wb === progress.currentWorkbook ? 'bg-blue-200' : 'bg-gray-200'}`}
              onClick={() => onNavigate('WORKBOOK', { id: wb })}
              disabled={wb > progress.currentWorkbook}
            >
              Workbook {wb} {wb < progress.currentWorkbook ? '✔' : wb === progress.currentWorkbook ? '→' : '🔒'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};