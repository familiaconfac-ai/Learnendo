import { useState } from 'react';
import type { AppMode, Section } from '../../types';
import { setAppMode } from '../../services/appMode';
import { getGuestName } from '../../services/guestSession';

interface Props {
  mode: AppMode;
  onSwitchMode: (m: AppMode) => void;
  onNavigate: (s: Section) => void;
}

const LAB_TAP_THRESHOLD = 7;

export default function Home({ mode, onSwitchMode, onNavigate }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const guestName = getGuestName();

  function handleLogoTap() {
    if (mode === 'lab') return; // already in lab
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= LAB_TAP_THRESHOLD) {
      setTapCount(0);
      onSwitchMode('lab');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-10 select-none">
      {/* Lab mode badge */}
      {mode === 'lab' && (
        <div className="mb-4 flex items-center gap-2">
          <span className="bg-amber-900/60 border border-amber-700 text-amber-300 text-xs font-bold px-3 py-1 rounded-full tracking-wide">
            🧪 Lab Mode
          </span>
          <button
            onClick={() => onSwitchMode('public')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            → Public
          </button>
        </div>
      )}

      {/* Main logo (tap to unlock lab in public mode) */}
      <button
        onClick={handleLogoTap}
        className="focus:outline-none active:scale-95 transition-transform"
        aria-label="Learnendo Battle logo"
      >
        <img
          src="/logo-battle.png"
          alt="Learnendo Battle"
          className="w-56 h-56 object-contain drop-shadow-[0_8px_40px_rgba(99,102,241,0.55)]"
          draggable={false}
        />
      </button>

      {/* Guest greeting or tagline */}
      {guestName ? (
        <p className="mt-5 text-base font-semibold tracking-wide text-gray-200">
          Hi, {guestName}! 👋
        </p>
      ) : (
        <p className="mt-5 text-base font-semibold tracking-wide text-gray-300">
          Quiz · Battle · Learn
        </p>
      )}

      {/* Public mode quick-start buttons */}
      {mode === 'public' && (
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => onNavigate('exercises')}
            className="w-full py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-600 active:scale-[0.98] font-semibold text-sm transition-all"
          >
            ✏️ Practice
          </button>
          <button
            onClick={() => onNavigate('battle')}
            className="w-full py-3 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] font-semibold text-sm transition-all"
          >
            ⚔️ Battle
          </button>
          <button
            onClick={() => onNavigate('progress')}
            className="w-full py-3 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] font-semibold text-sm transition-all"
          >
            ⭐ My Progress
          </button>
          <button
            onClick={() => onNavigate('packs')}
            className="w-full py-3 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 active:scale-[0.98] font-semibold text-sm transition-all"
          >
            📦 Explore Packs
          </button>
        </div>
      )}

      {/* Hidden tap progress hint (shows after 3 taps in public mode) */}
      {mode === 'public' && tapCount >= 3 && tapCount < LAB_TAP_THRESHOLD && (
        <p className="mt-4 text-xs text-gray-600">
          {LAB_TAP_THRESHOLD - tapCount} more…
        </p>
      )}

      {/* Signature */}
      <div className="mt-8 flex flex-col items-center gap-1 opacity-40">
        <div className="flex items-center gap-1.5">
          <span className="text-xs tracking-widest uppercase text-gray-400">by</span>
          <img
            src="/logo-learnendo.png"
            alt="Learnendo"
            className="h-4 object-contain"
            draggable={false}
          />
        </div>
        <span className="text-[10px] tracking-widest uppercase text-gray-500">pilot v0.1</span>
      </div>
    </div>
  );
}

