import { useState, useEffect } from 'react';
import type { Section, AppMode } from './types';
import Nav from './components/Nav';
import Home from './sections/Home';
import Languages from './sections/Languages';
import Bible from './sections/Bible';
import Exercises from './sections/Exercises';
import Battle from './sections/Battle';
import Contest from './sections/Contest';
import Import from './sections/Import';
import Review from './sections/Review';
import Packs from './sections/Packs';
import Progress from './sections/Progress';
import { registerReviewNavigation } from './services/userSession';
import { getAppMode, setAppMode } from './services/appMode';
import {
  getGuestName,
  setGuestName,
  wasGuestPrompted,
  markGuestPrompted,
} from './services/guestSession';

// ─── Guest name prompt (public mode only) ─────────────────────────────────────

function GuestNamePrompt({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');

  function submit() {
    if (name.trim()) setGuestName(name.trim());
    markGuestPrompted();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="text-center">
          <p className="text-2xl mb-1">👋</p>
          <h2 className="text-white font-bold text-base">What should we call you?</h2>
          <p className="text-xs text-gray-500 mt-1">Optional — just for fun. No account needed.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Enter your name…"
          maxLength={30}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { markGuestPrompted(); onDone(); }}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Let's go →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

/** URL params parsed exactly once at module load (before any render). */
function parseInitialRoute(): { section: Section; packId: string | null; battlePackId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const packId = params.get('pack');
  const battlePackId = params.get('battle');
  let section: Section = 'home';
  if (packId) section = 'exercises';
  if (battlePackId) section = 'battle';
  if (packId || battlePackId) {
    const url = new URL(window.location.href);
    url.searchParams.delete('pack');
    url.searchParams.delete('battle');
    window.history.replaceState({}, '', url.toString());
  }
  return { section, packId, battlePackId };
}

const INITIAL_ROUTE = parseInitialRoute();

export default function App() {
  const [mode, setMode] = useState<AppMode>(() => getAppMode());
  const [section, setSection] = useState<Section>(INITIAL_ROUTE.section);
  const [openPackId] = useState<string | null>(INITIAL_ROUTE.packId);
  const [openBattlePackId, setOpenBattlePackId] = useState<string | null>(INITIAL_ROUTE.battlePackId);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    registerReviewNavigation(() => {
      if (mode === 'lab') setSection('review');
    });
  }, [mode]);

  // Show guest name prompt once in public mode if not yet prompted
  useEffect(() => {
    if (mode === 'public' && !wasGuestPrompted()) {
      setShowGuestPrompt(true);
    }
  }, [mode]);

  // If public mode lands on a lab-only section, redirect home
  useEffect(() => {
    if (mode === 'public' && (section === 'review' || section === 'import' || section === 'contest')) {
      setSection('home');
    }
  }, [mode, section]);

  function switchMode(m: AppMode) {
    setAppMode(m);
    setMode(m);
    setSection('home');
  }

  const views: Record<Section, JSX.Element> = {
    home:      <Home mode={mode} onSwitchMode={switchMode} onNavigate={setSection} />,
    languages: <Languages />,
    bible:     <Bible />,
    exercises: <Exercises initialPackId={openPackId ?? undefined} />,
    battle:    <Battle key={openBattlePackId ?? 'default'} initialPackId={openBattlePackId ?? undefined} />,
    contest:   <Contest />,
    import:    <Import />,
    review:    <Review />,
    packs:     <Packs
                 mode={mode}
                 onImport={mode === 'lab' ? () => setSection('import') : undefined}
                 onNavigateBattle={(packId) => { setOpenBattlePackId(packId); setSection('battle'); }}
               />,
    progress:  <Progress />,
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col">
      {showGuestPrompt && (
        <GuestNamePrompt onDone={() => setShowGuestPrompt(false)} />
      )}
      <main className="flex-1 overflow-y-auto pb-2 flex flex-col">{views[section]}</main>
      <Nav active={section} onChange={setSection} mode={mode} />
    </div>
  );
}

