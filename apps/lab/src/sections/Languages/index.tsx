import { useState } from 'react';
import type { LanguageCode } from '../../types';
import { LANGUAGE_PACKS } from '../../data/languagePacks';

const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'el', label: 'Greek',      flag: '🇬🇷' },
  { code: 'he', label: 'Hebrew',     flag: '🇮🇱' },
];

export default function Languages() {
  const [selected, setSelected] = useState<LanguageCode | null>(null);

  const packs = LANGUAGE_PACKS.filter((p) => p.language === selected);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Languages</h1>

      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map(({ code, label, flag }) => {
          const hasPacks = LANGUAGE_PACKS.some((p) => p.language === code);
          return (
            <button
              key={code}
              onClick={() => setSelected(code === selected ? null : code)}
              className={[
                'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left',
                selected === code
                  ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                  : 'border-gray-700 bg-gray-800 hover:bg-gray-700',
                !hasPacks && 'opacity-40',
              ].join(' ')}
              disabled={!hasPacks}
            >
              <span className="text-xl">{flag}</span>
              <span>{label}</span>
              {!hasPacks && <span className="ml-auto text-[10px] text-gray-500">Soon</span>}
            </button>
          );
        })}
      </div>

      {selected && packs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Available packs</p>
          {packs.map((pack) => (
            <div key={pack.id} className="bg-gray-800 rounded-2xl px-4 py-3">
              <p className="font-semibold text-sm">{pack.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{pack.description}</p>
              <p className="text-xs text-indigo-400 mt-1">{pack.items.length} questions</p>
            </div>
          ))}
        </div>
      )}

      {selected && packs.length === 0 && (
        <p className="text-sm text-gray-500 text-center mt-4">No packs yet for this language.</p>
      )}
    </div>
  );
}
