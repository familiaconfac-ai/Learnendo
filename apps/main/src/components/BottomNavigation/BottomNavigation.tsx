import React from 'react';

type UILang = 'en' | 'pt' | 'es';

interface BottomNavigationProps {
  currentSection: string;
  onNavigate: (section: string, params?: any) => void;
  onShare: () => void;
  uiLanguage?: UILang;
}

const NAV_LABELS: Record<UILang, { workbooks: string; pronounce: string; rank: string; share: string; videos: string; teacher: string }> = {
  en: { workbooks: 'Workbooks', pronounce: 'Pronounce', rank: 'Rank', share: 'Share', videos: 'Videos', teacher: 'Teacher' },
  pt: { workbooks: 'Cadernos', pronounce: 'Pronúncia', rank: 'Ranking', share: 'Compartilhar', videos: 'Vídeos', teacher: 'Professor' },
  es: { workbooks: 'Libros', pronounce: 'Pronunciación', rank: 'Ranking', share: 'Compartir', videos: 'Videos', teacher: 'Profesor' },
};

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentSection,
  onNavigate,
  onShare,
  uiLanguage = 'en',
}) => {
  const L = NAV_LABELS[uiLanguage] ?? NAV_LABELS.en;
  return (
    <div className="bottom-navigation fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 flex justify-around items-center py-2 px-1 overflow-x-hidden max-w-full">
      {/* Workbooks */}
      <button
        onClick={() => onNavigate('WORKBOOK_LIST')}
        className={`flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs flex-shrink-0 ${currentSection === 'WORKBOOK_LIST' || currentSection === 'WORKBOOK' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
        title={L.workbooks}
      >
        <span className="text-lg">📚</span>
        <span className="hidden sm:inline">{L.workbooks}</span>
      </button>

      {/* Pronounce */}
      <button
        onClick={() => onNavigate('PRONUNCIATION')}
        className={`flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs flex-shrink-0 ${currentSection === 'PRONUNCIATION' ? 'text-blue-400' : 'text-slate-400'}`}
      >
        <span className="text-lg">🗣️</span>
        <span className="hidden sm:inline">{L.pronounce}</span>
      </button>

      {/* Rank */}
      <button
        onClick={() => onNavigate('RANK')}
        className={`flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs flex-shrink-0 ${currentSection === 'RANK' ? 'text-blue-400' : 'text-slate-400'}`}
      >
        <span className="text-lg">🏆</span>
        <span className="hidden sm:inline">{L.rank}</span>
      </button>

      {/* Share */}
      <button
        onClick={onShare}
        className={`flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs flex-shrink-0 ${currentSection === 'SHARE' ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400 transition-colors'}`}
        title={L.share}
      >
        <span className="text-lg">🔗</span>
        <span className="hidden sm:inline">{L.share}</span>
      </button>

      {/* Videos / YouTube */}
      <a
        href="https://www.youtube.com/@learnendo7476"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
        title="Learnendo YouTube channel"
      >
        <span className="text-lg">▶️</span>
        <span className="hidden sm:inline">{L.videos}</span>
      </a>

      {/* Teacher */}
      <a
        href="https://wa.me/5517991010930?text=Hello%20Professor!%20I%20am%20using%20the%20Learnendo%20app%20and%20would%20like%20to%20know%20about%20private%20lessons."
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 px-1.5 sm:px-2 text-xs text-slate-400 flex-shrink-0"
      >
        <img src="/whatsapp-icon.png" width="24" height="24" alt="WhatsApp" className="sm:w-7 sm:h-7" />
        <span className="hidden sm:inline">{L.teacher}</span>
      </a>
    </div>
  );
};