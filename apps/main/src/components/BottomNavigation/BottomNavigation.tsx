import React from 'react';

type UILang = 'en' | 'pt' | 'es';

interface BottomNavigationProps {
  currentSection: string;
  onNavigate: (section: string, params?: any) => void;
  onShare: () => void;
  uiLanguage?: UILang;
}

const NAV_LABELS: Record<UILang, { workbooks: string; classes: string; pronounce: string; rank: string; share: string; videos: string; teacher: string }> = {
  en: { workbooks: 'Workbooks', classes: 'Online', pronounce: 'Pronounce', rank: 'Rank', share: 'Share', videos: 'Videos', teacher: 'Teacher' },
  pt: { workbooks: 'Cadernos', classes: 'Online', pronounce: 'Pronuncia', rank: 'Ranking', share: 'Compartilhar', videos: 'Videos', teacher: 'Professor' },
  es: { workbooks: 'Libros', classes: 'Online', pronounce: 'Pronunciacion', rank: 'Ranking', share: 'Compartir', videos: 'Videos', teacher: 'Profesor' },
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
      <button
        onClick={() => onNavigate('WORKBOOK_LIST')}
        className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-1.5 text-xs sm:px-2 ${currentSection === 'WORKBOOK_LIST' || currentSection === 'WORKBOOK' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
        title={L.workbooks}
      >
        <span className="text-lg">📚</span>
        <span className="hidden sm:inline">{L.workbooks}</span>
      </button>

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
