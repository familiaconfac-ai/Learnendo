import { getUiLabels } from '../../i18n/uiLabels';
import React from 'react';
import { Course, LessonLanguageCode } from '../../types';
import { learnendoLogoTransparent } from '../../assets/branding';

interface CoursesViewProps {
  courses: Course[];
  currentCourseId: string | null;
  currentLanguage?: LessonLanguageCode;
  onLanguageChange?: (language: LessonLanguageCode) => void;
  onSelectCourse: (courseId: string) => void;
  onLogoClick?: () => void;
}

type UILang = 'en' | 'pt' | 'es';
type CategoryKey = 'modern' | 'biblical' | 'track';

// ── Category headings localized by UI language ────────────────────────────────
const CATEGORY_LABELS: Record<UILang, Record<CategoryKey, string>> = {
  en: { modern: 'Main Courses', biblical: 'Advanced Studies', track: 'Special Study Track' },
  pt: { modern: 'Cursos Principais', biblical: 'Estudos Avançados', track: 'Trilha de Estudo Especial' },
  es: { modern: 'Cursos Principales', biblical: 'Estudios Avanzados', track: 'Pista de Estudio Especial' },
};

// ── "Choose your language" prompt ─────────────────────────────────────────────


// ── Localized display for the three main courses ──────────────────────────────
const COURSE_DISPLAY: Record<UILang, Record<string, { title: string; subtitle: string }>> = {
  en: {
    english:              { title: 'English',    subtitle: 'Learn English with Learnendo' },
    portuguese_foreigners:{ title: 'Portuguese', subtitle: 'Learn Portuguese with Learnendo' },
    spanish:              { title: 'Spanish',    subtitle: 'Learn Spanish with Learnendo' },
  },
  pt: {
    english:              { title: 'Inglês',     subtitle: 'Aprenda inglês com Learnendo' },
    portuguese_foreigners:{ title: 'Português',  subtitle: 'Aprenda português com Learnendo' },
    spanish:              { title: 'Espanhol',   subtitle: 'Aprenda espanhol com Learnendo' },
  },
  es: {
    english:              { title: 'Inglés',     subtitle: 'Aprende inglés con Learnendo' },
    portuguese_foreigners:{ title: 'Portugués',  subtitle: 'Aprende portugués con Learnendo' },
    spanish:              { title: 'Español',    subtitle: 'Aprende español con Learnendo' },
  },
};

const COURSE_FLAG_SRC: Record<string, string> = {
  english: '/flags/us.png',
  portuguese_foreigners: '/flags/br.png',
  portuguese_native: '/flags/br.png',
  spanish: '/flags/es.png',
  greek_koine: '/flags/gr.png',
  hebrew_biblical: '/flags/il.png',
};

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  currentCourseId,
  currentLanguage = 'en',
  onLanguageChange: _onLanguageChange,
  onSelectCourse,
  onLogoClick,
}) => {
  const uiLang: UILang = currentLanguage === 'pt' ? 'pt' : currentLanguage === 'es' ? 'es' : 'en';
  const categories: CategoryKey[] = ['modern', 'biblical'];
  const catLabels = CATEGORY_LABELS[uiLang];
  const [logoFailed, setLogoFailed] = React.useState(false);
  const [failedCourseFlags, setFailedCourseFlags] = React.useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-slate-900 pb-28 w-full overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 pt-8 sm:pt-10">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <button type="button" onClick={onLogoClick} className="mx-auto block cursor-pointer">
            {logoFailed ? (
              <div className="mx-auto mb-2 rounded-2xl bg-blue-600 px-5 py-3 text-2xl font-black text-white shadow-[0_4px_0_0_#1d4ed8]">
                Learnendo
              </div>
            ) : (
              <img
                src={learnendoLogoTransparent}
                alt="Learnendo Logo"
                className="mx-auto"
                style={{ width: 'min(160px, 80vw)', marginBottom: '8px' }}
                onError={() => setLogoFailed(true)}
              />
            )}
          </button>
          <p className="text-slate-400 font-semibold text-xs sm:text-sm mt-1">{getUiLabels(uiLang).chooseCourse}</p>
        </div>

        {/* Category sections */}
        {categories.map(cat => {
          const catCourses = courses.filter(c => c.category === cat);
          if (!catCourses.length) return null;

          return (
            <div key={cat} className="mb-7">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                {catLabels[cat]}
              </h2>

              <div className="flex flex-col gap-3">
                {catCourses.map(course => {
                  const isActive = course.id === currentCourseId;
                  const display = COURSE_DISPLAY[uiLang][course.id] ?? null;
                  const title = display?.title ?? course.title;
                  const subtitle = display?.subtitle ?? course.description ?? '';

                  return (
                    <button
                      key={course.id}
                      onClick={() => onSelectCourse(course.id)}
                      className={[
                        'w-full rounded-2xl p-4 text-left border transition-all duration-150 active:scale-[0.98]',
                        isActive
                          ? 'bg-blue-600 border-blue-700 shadow-[0_4px_0_0_#1e40af]'
                          : 'bg-white border-slate-200 shadow-sm hover:border-blue-300',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-4">
                        {failedCourseFlags[course.id] || !COURSE_FLAG_SRC[course.id] ? (
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {title.slice(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <img
                            src={COURSE_FLAG_SRC[course.id]}
                            alt={title}
                            className="h-9 w-9 rounded-full object-cover"
                            onError={() => {
                              setFailedCourseFlags((currentFlags) => ({ ...currentFlags, [course.id]: true }));
                            }}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className={`font-black text-base leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                            {title}
                          </div>
                          {subtitle && (
                            <div className={`text-xs mt-0.5 truncate ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                              {subtitle}
                            </div>
                          )}
                        </div>

                        <i className={`fas fa-chevron-right text-sm flex-shrink-0 ${isActive ? 'text-blue-200' : 'text-slate-400'}`} />
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
