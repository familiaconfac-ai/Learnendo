import React from 'react';

export interface LanguageOption {
  id: 'english' | 'portuguese' | 'spanish' | 'greek' | 'hebrew';
  label: string;
  iconSrc: string;
}

interface LanguageSelectorProps {
  selectedLanguageId?: LanguageOption['id'];
  onSelectLanguage?: (languageId: LanguageOption['id']) => void;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'english', label: 'English', iconSrc: '/flags/us.png' },
  { id: 'portuguese', label: 'Portuguese', iconSrc: '/flags/br.png' },
  { id: 'spanish', label: 'Spanish', iconSrc: '/flags/es.png' },
  { id: 'greek', label: 'Greek', iconSrc: '/flags/gr.png' },
  { id: 'hebrew', label: 'Hebrew', iconSrc: '/flags/il.png' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguageId,
  onSelectLanguage,
}) => {
  return (
    <div className="flex items-center justify-center gap-3">
      {LANGUAGE_OPTIONS.map((language) => {
        const isSelected = language.id === selectedLanguageId;

        return (
          <button
            key={language.id}
            type="button"
            aria-label={language.label}
            title={language.label}
            onClick={() => onSelectLanguage?.(language.id)}
            className={[
              'rounded-full p-1 transition-transform active:scale-95',
              isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105',
            ].join(' ')}
          >
            <img
              src={language.iconSrc}
              alt={language.label}
              width="26"
              height="26"
              className="block rounded-full"
            />
          </button>
        );
      })}
    </div>
  );
};
