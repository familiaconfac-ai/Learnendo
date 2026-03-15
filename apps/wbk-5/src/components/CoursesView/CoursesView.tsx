import React from 'react';
import { Course } from '../../types';

interface CoursesViewProps {
  courses: Course[];
  currentCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  onLogoClick?: () => void;
}

type CategoryKey = 'modern' | 'biblical' | 'track';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  modern: 'Modern Languages',
  biblical: 'Biblical Languages',
  track: 'Special Study Track',
};

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  currentCourseId,
  onSelectCourse,
  onLogoClick,
}) => {
  const categories: CategoryKey[] = ['modern', 'biblical', 'track'];

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      <div className="max-w-[420px] mx-auto px-4 pt-10">

        {/* Header */}
        <div className="text-center mb-8">
          <button type="button" onClick={onLogoClick} className="mx-auto block cursor-pointer">
            <img
              src="/learnendo-logo-transp.png"
              alt="Learnendo Logo"
              className="mx-auto"
              style={{ width: '160px', marginBottom: '12px' }}
            />
          </button>
          <p className="text-slate-500 font-semibold text-sm mt-1">Choose your language</p>
        </div>

        {/* Category sections */}
        {categories.map(cat => {
          const catCourses = courses.filter(c => c.category === cat);
          if (!catCourses.length) return null;

          return (
            <div key={cat} className="mb-7">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                {CATEGORY_LABELS[cat]}
              </h2>

              <div className="flex flex-col gap-3">
                {catCourses.map(course => {
                  const isActive = course.id === currentCourseId;

                  return (
                    <button
                      key={course.id}
                      onClick={() => onSelectCourse(course.id)}
                      className={[
                        'w-full rounded-2xl p-4 text-left border transition-all duration-150 active:scale-[0.98]',
                        isActive
                          ? 'bg-blue-600 border-blue-700 shadow-[0_4px_0_0_#1e40af]'
                          : 'bg-white border-slate-100 shadow-sm hover:border-blue-200',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[28px] leading-none select-none">
                          {course.flag}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-black text-base leading-tight ${
                              isActive ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {course.title}
                          </div>
                          {course.description && (
                            <div
                              className={`text-xs mt-0.5 truncate ${
                                isActive ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {course.description}
                            </div>
                          )}
                        </div>

                        <i
                          className={`fas fa-chevron-right text-sm flex-shrink-0 ${
                            isActive ? 'text-blue-200' : 'text-slate-300'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
