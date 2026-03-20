import React from 'react';
import { LessonLanguageCode } from '../../types';

interface LanguageSelectorProps {
  current?: LessonLanguageCode;
  onOpenCourses: () => void;
}

const LANGUAGE_OPTIONS: { id: LessonLanguageCode; label: string; iconSrc: string }[] = [
  { id: 'en', label: 'English', iconSrc: '/flags/us.png' },
  { id: 'pt', label: 'Portuguese', iconSrc: '/flags/br.png' },
  { id: 'es', label: 'Spanish', iconSrc: '/flags/es.png' },
  { id: 'el', label: 'Greek', iconSrc: '/flags/gr.png' },
  { id: 'he', label: 'Hebrew', iconSrc: '/flags/il.png' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ current, onOpenCourses }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {LANGUAGE_OPTIONS.map((lang) => (
        <button
          key={lang.id}
          type="button"
          aria-label={lang.label}
          title={lang.label}
          onClick={(e) => {
            e.stopPropagation();
            console.log('GO TO COURSES');
            onOpenCourses();
          }}
          className={[
            'rounded-full p-1 transition-transform active:scale-95',
            lang.id === current ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105',
          ].join(' ')}
        >
          <img src={lang.iconSrc} alt={lang.label} width="26" height="26" className="block rounded-full" />
        </button>
      ))}
    </div>
  );
};
