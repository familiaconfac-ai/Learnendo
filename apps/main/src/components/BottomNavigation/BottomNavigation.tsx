import React from 'react';

interface BottomNavigationProps {
  currentSection: string;
  onNavigate: (section: string) => void;
  onShare: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentSection, onNavigate, onShare }) => {
  return (
    <div className="bottom-navigation fixed bottom-0 w-full bg-white border-t flex justify-around items-center py-2 px-1">
      <button
        onClick={() => onNavigate('DASHBOARD')}
        className={`flex flex-col items-center gap-0.5 px-2 text-xs ${currentSection === 'DASHBOARD' ? 'text-blue-500' : 'text-slate-500'}`}
      >
        <span className="text-lg">🏠</span>
        Home
      </button>
      <button
        onClick={() => onNavigate('WORKBOOK')}
        className={`flex flex-col items-center gap-0.5 px-2 text-xs ${currentSection === 'WORKBOOK' ? 'text-blue-500' : 'text-slate-500'}`}
      >
        <span className="text-lg">🦉</span>
        Learn
      </button>
      <button
        onClick={() => onNavigate('PRONUNCIATION')}
        className={`flex flex-col items-center gap-0.5 px-2 text-xs ${currentSection === 'PRONUNCIATION' ? 'text-blue-500' : 'text-slate-500'}`}
      >
        <span className="text-lg">🗣️</span>
        Pronounce
      </button>
      <button
        onClick={onShare}
        className={`flex flex-col items-center gap-0.5 px-2 text-xs ${currentSection === 'SHARE' ? 'text-blue-500' : 'text-slate-500'}`}
      >
        <span className="text-lg">🔗</span>
        Share
      </button>
      <a
        href="https://wa.me/5517991010930?text=Hello%20Professor!%20I%20am%20using%20the%20Learnendo%20app%20and%20would%20like%20to%20know%20about%20private%20lessons."
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 px-2 text-xs text-slate-500"
      >
        <img src="/whatsapp-icon.png" width="28" height="28" alt="WhatsApp" />
        Teacher
      </a>
    </div>
  );
};