import { useState } from 'react';
import type { BibleCategory } from '../../types';
import { QUESTION_PACKS } from '../../data/biblePacks';

const CATEGORIES: { id: BibleCategory; label: string; icon: string }[] = [
  { id: 'book',      label: 'By Book',       icon: '📚' },
  { id: 'theme',     label: 'By Theme',      icon: '🎯' },
  { id: 'character', label: 'By Characters', icon: '👤' },
  { id: 'place',     label: 'By Places',     icon: '📍' },
  { id: 'general',   label: 'General',       icon: '❓' },
];

export default function Bible() {
  const [selected, setSelected] = useState<BibleCategory | null>(null);

  const packs = selected ? QUESTION_PACKS.filter((p) => p.category === selected) : [];

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Bible</h1>

      <div className="flex flex-col gap-2">
        {CATEGORIES.map(({ id, label, icon }) => {
          const hasPacks = QUESTION_PACKS.some((p) => p.category === id);
          return (
            <button
              key={id}
              onClick={() => setSelected(id === selected ? null : id)}
              disabled={!hasPacks}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left',
                selected === id
                  ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                  : 'border-gray-700 bg-gray-800 hover:bg-gray-700',
                !hasPacks && 'opacity-40',
              ].join(' ')}
            >
              <span className="text-xl">{icon}</span>
              <span className="flex-1">{label}</span>
              {!hasPacks && <span className="text-[10px] text-gray-500">Soon</span>}
            </button>
          );
        })}
      </div>

      {selected && packs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Packs</p>
          {packs.map((pack) => (
            <div key={pack.id} className="bg-gray-800 rounded-2xl px-4 py-3">
              <p className="font-semibold text-sm">{pack.title}</p>
              <p className="text-xs text-indigo-400 mt-1">{pack.items.length} questions</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
