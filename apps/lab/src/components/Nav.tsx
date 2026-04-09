import { useState, useEffect } from 'react';
import type { Section, AppMode } from '../types';
import { countOpenReports } from '../services/reviewStore';

// All tabs — ordered for display
const ALL_TABS: { id: Section; label: string; icon: string; labOnly?: boolean }[] = [
  { id: 'home',      label: 'Home',     icon: '🏠' },
  { id: 'exercises', label: 'Practice', icon: '✏️' },
  { id: 'battle',    label: 'Battle',   icon: '⚔️' },
  { id: 'contest',   label: 'Contest',  icon: '🏆', labOnly: true },
  { id: 'progress',  label: 'Progress', icon: '⭐' },
  { id: 'packs',     label: 'Packs',    icon: '📦' },
  { id: 'import',    label: 'Import',   icon: '📥', labOnly: true },
  { id: 'review',    label: 'Review',   icon: '🔍', labOnly: true },
];

interface Props {
  active: Section;
  onChange: (s: Section) => void;
  mode: AppMode;
}

export default function Nav({ active, onChange, mode }: Props) {
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    function update() { setOpenCount(countOpenReports()); }
    update();
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, [active]);

  const tabs = ALL_TABS.filter((t) => mode === 'lab' || !t.labOnly);

  return (
    <nav className="flex border-t border-gray-800 bg-gray-900">
      {tabs.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => { onChange(id); if (id === 'review') setOpenCount(countOpenReports()); }}
          className={[
            'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative',
            active === id
              ? 'text-indigo-400 border-t-2 border-indigo-400 -mt-px'
              : 'text-gray-500 hover:text-gray-300',
          ].join(' ')}
        >
          <span className="text-lg leading-none relative">
            {icon}
            {id === 'review' && openCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {openCount > 9 ? '9+' : openCount}
              </span>
            )}
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}

