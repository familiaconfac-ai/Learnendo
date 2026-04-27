import React from 'react';

export type UILang = 'en' | 'pt' | 'es';

interface BottomNavigationProps {
  currentSection: string;
  onNavigate: (section: string, params?: any) => void;
  onShare: () => void;
  uiLanguage?: UILang;
}

const NAV_LABELS: Record<UILang, { battle: string; classes: string; pronounce: string; rank: string; share: string; videos: string; teacher: string; vocab: string }> = {
  en: { battle: 'Battle', classes: 'Live', pronounce: 'Pronounce', rank: 'Rank', share: 'Share', videos: 'Videos', teacher: 'Teacher', vocab: 'Vocab' },
  pt: { battle: 'Battle', classes: 'Live', pronounce: 'Pronuncia', rank: 'Ranking', share: 'Compartilhar', videos: 'Videos', teacher: 'Professor', vocab: 'Vocab' },
  es: { battle: 'Battle', classes: 'Live', pronounce: 'Pronunciacion', rank: 'Ranking', share: 'Compartir', videos: 'Videos', teacher: 'Profesor', vocab: 'Vocab' },
};

interface BottomNavigationBattleButtonProps {
  isActive: boolean;
  onClick: () => void;
  uiLanguage?: UILang;
}

export const BottomNavigationBattleButton: React.FC<BottomNavigationBattleButtonProps> = ({
  isActive,
  onClick,
  uiLanguage = 'en',
}) => {
  const L = NAV_LABELS[uiLanguage] ?? NAV_LABELS.en;

  return (
    <button
      onClick={onClick}
      className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
      title={L.battle}
    >
      <span className="text-lg">⚔️</span>
      <span className="hidden sm:inline">{L.battle}</span>
    </button>
  );
};

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentSection,
  onNavigate,
  onShare,
  uiLanguage = 'en',
}) => {
  const L = NAV_LABELS[uiLanguage] ?? NAV_LABELS.en;

  return (
    <div className="bottom-navigation fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around overflow-x-hidden border-t border-slate-700 bg-slate-900 px-1 py-2 max-w-full">
      <BottomNavigationBattleButton
        isActive={currentSection === 'BATTLE'}
        onClick={() => onNavigate('BATTLE')}
        uiLanguage={uiLanguage}
      />

      <button
        onClick={() => onNavigate('LIVE_CLASSES')}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'LIVE_CLASSES' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
      >
        <span className="text-lg">🎥</span>
        <span className="hidden sm:inline">{L.classes}</span>
      </button>

      <button
        onClick={() => onNavigate('PRONUNCIATION')}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'PRONUNCIATION' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
      >
        <span className="text-lg">🗣️</span>
        <span className="hidden sm:inline">{L.pronounce}</span>
      </button>

      <button
        onClick={() => onNavigate('RANK')}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'RANK' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
      >
        <span className="text-lg">🏆</span>
        <span className="hidden sm:inline">{L.rank}</span>
      </button>

      <button
        onClick={() => onNavigate('VOCABULARY')}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'VOCABULARY' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
        title={L.vocab}
      >
        <span className="text-lg">📖</span>
        <span className="hidden sm:inline">{L.vocab}</span>
      </button>

      <button
        onClick={onShare}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'SHARE' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
        title={L.share}
      >
        <span className="text-lg">🔗</span>
        <span className="hidden sm:inline">{L.share}</span>
      </button>

      <a
        href="https://www.youtube.com/@learnendo7476"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs text-slate-400 transition-colors hover:text-red-400 sm:px-2"
        title="Learnendo YouTube channel"
      >
        <span className="text-lg">▶️</span>
        <span className="hidden sm:inline">{L.videos}</span>
      </a>

      <a
        href="https://wa.me/5517991010930?text=Hello%20Professor!%20I%20am%20using%20the%20Learnendo%20app%20and%20would%20like%20to%20know%20about%20private%20lessons."
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs text-slate-400 sm:px-2"
      >
        <img src="/whatsapp-icon.png" width="24" height="24" alt="WhatsApp" className="sm:h-7 sm:w-7" />
        <span className="hidden sm:inline">{L.teacher}</span>
      </a>
    </div>
  );
};
