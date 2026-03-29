import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LessonLanguageCode } from '../../types';

interface LanguageSelectorProps {
  current?: LessonLanguageCode;
  onChange: (lang: LessonLanguageCode) => void;
}

const LANGUAGE_OPTIONS: { id: LessonLanguageCode; label: string; iconSrc: string }[] = [
  { id: 'en', label: 'English', iconSrc: '/flags/us.png' },
  { id: 'pt', label: 'Portuguese', iconSrc: '/flags/br.png' },
  { id: 'es', label: 'Spanish', iconSrc: '/flags/es.png' },
  { id: 'el', label: 'Greek', iconSrc: '/flags/gr.png' },
  { id: 'he', label: 'Hebrew', iconSrc: '/flags/il.png' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(
    () => LANGUAGE_OPTIONS.find((lang) => lang.id === current) ?? LANGUAGE_OPTIONS[0],
    [current],
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleSelect = (lang: LessonLanguageCode) => {
    onChange(lang);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        aria-label={`Current language: ${active.label}`}
        title={active.label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="rounded-full p-1 transition-transform active:scale-95 ring-2 ring-blue-500 ring-offset-2"
      >
        <img src={active.iconSrc} alt={active.label} width="26" height="26" className="block rounded-full" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-40 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.id}
              type="button"
              aria-label={lang.label}
              title={lang.label}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(lang.id);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              <img src={lang.iconSrc} alt={lang.label} width="20" height="20" className="block rounded-full" />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
