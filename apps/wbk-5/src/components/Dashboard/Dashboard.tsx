import React from 'react';
import { Course, UserProgress, SectionType } from '../../types';

interface DashboardProps {
  progress: UserProgress;
  currentCourse?: Course | null;
  isAdmin?: boolean;
  onNavigate: (section: SectionType, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ progress, currentCourse, isAdmin = false, onNavigate }) => {
  const workbooks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="dashboard p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: progress.currentWorkbook })}
      >
        Continue Learning - Workbook {progress.currentWorkbook}, Lesson {progress.currentLesson}
      </button>
      <div>
        <h2 className="text-xl mb-2">Workbooks</h2>
        <div className="grid grid-cols-2 gap-2">
          {workbooks.map(wb => {
            const canOpen = isAdmin || wb <= progress.currentWorkbook;
            return (
              <button
                key={wb}
                className={`p-2 border rounded ${canOpen ? (wb < progress.currentWorkbook ? 'bg-green-200' : wb === progress.currentWorkbook ? 'bg-blue-200' : 'bg-white') : 'bg-gray-200'}`}
                onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: wb })}
                disabled={!canOpen}
              >
                Workbook {wb} {canOpen ? (wb < progress.currentWorkbook ? '✔' : wb === progress.currentWorkbook ? '→' : '→') : '🔒'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};