import React from 'react';

interface BottomNavigationProps {
  currentSection: string;
  onNavigate: (section: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentSection, onNavigate }) => {
  return (
    <div className="bottom-navigation fixed bottom-0 w-full bg-white border-t flex justify-around py-2">
      <button onClick={() => onNavigate('DASHBOARD')} className={currentSection === 'DASHBOARD' ? 'active text-blue-500' : ''}>
        Home
      </button>
      <button onClick={() => onNavigate('LESSON')} className={currentSection === 'LESSON' ? 'active text-blue-500' : ''}>
        Learn
      </button>
      <button onClick={() => onNavigate('PRONUNCIATION')} className={currentSection === 'PRONUNCIATION' ? 'active text-blue-500' : ''}>
        Pronunciation
      </button>
      <button onClick={() => onNavigate('SHARE')} className={currentSection === 'SHARE' ? 'active text-blue-500' : ''}>
        Share
      </button>
    </div>
  );
};