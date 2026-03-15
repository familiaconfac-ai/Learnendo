import React from 'react';
import { Course, UserProgress, SectionType } from '../../types';

interface DashboardProps {
  progress: UserProgress;
  currentCourse?: Course | null;
  onNavigate: (section: SectionType, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ progress, currentCourse, onNavigate }) => {
  const workbooks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="dashboard p-4">
      {/* Course banner */}
      {currentCourse && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentCourse.flag}</span>
            <span className="font-bold text-blue-900">{currentCourse.title}</span>
          </div>
          <button
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-95"
            onClick={() => onNavigate(SectionType.COURSES)}
          >
            Switch Course
          </button>
        </div>
      )}

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
          {workbooks.map(wb => (
            <button 
              key={wb} 
              className={`p-2 border rounded ${wb <= progress.currentWorkbook ? 'bg-green-200' : wb === progress.currentWorkbook ? 'bg-blue-200' : 'bg-gray-200'}`}
              onClick={() => onNavigate(SectionType.WORKBOOK, { workbookId: wb })}
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