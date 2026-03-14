import React, { useState, useEffect } from 'react';
import { UserProgress, SectionType } from './types';
import { Dashboard } from './components/Dashboard';
import { BottomNavigation } from './components/BottomNavigation';
import { PlacementTest } from './components/PlacementTest';
import { WorkbookView } from './components/WorkbookView';
import { LessonView } from './components/LessonView';
import { ProgressEngine } from './engine/progressEngine';
import { PlacementEngine } from './engine/placementEngine';

const App: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [currentSection, setCurrentSection] = useState<SectionType>(SectionType.DASHBOARD);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentWorkbookId, setCurrentWorkbookId] = useState<number | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    if (currentWorkbookId) {
      import(`./data/workbook${currentWorkbookId}`).then(module => {
        setCurrentWorkbook(module[`workbook${currentWorkbookId}`]);
      });
    }
  }, [currentWorkbookId]);

  const handleNavigate = (section: SectionType, params?: any) => {
    setCurrentSection(section);
    if (params?.workbookId) setCurrentWorkbookId(params.workbookId);
    if (params?.lessonId) setCurrentLessonId(params.lessonId);
  };

  const handlePlacementComplete = (score: number) => {
    const workbook = PlacementEngine.determineWorkbook(score);
    if (progress) {
      const updated = { ...progress, currentWorkbook: workbook, placementScore: score };
      setProgress(updated);
      ProgressEngine.saveProgress(updated);
    }
  };

  if (!progress) return <div>Loading...</div>;

  const renderSection = () => {
    switch (currentSection) {
      case SectionType.DASHBOARD:
        return <Dashboard progress={progress} onNavigate={handleNavigate} />;
      case SectionType.PLACEMENT_TEST:
        return <PlacementTest onComplete={handlePlacementComplete} />;
      case SectionType.WORKBOOK:
        return currentWorkbook ? (
          <WorkbookView
            workbookId={currentWorkbookId!}
            lessons={currentWorkbook.lessons}
            progress={progress}
            onSelectLesson={(lessonId) => handleNavigate(SectionType.LESSON, { lessonId })}
            onBack={() => handleNavigate(SectionType.DASHBOARD)}
          />
        ) : <div>Loading workbook...</div>;
      case SectionType.LESSON:
        return currentLessonId && currentWorkbook ? (
          <LessonView
            lesson={currentWorkbook.lessons.find((l: any) => l.id === currentLessonId)}
            progress={progress}
            onBack={() => handleNavigate(SectionType.WORKBOOK)}
          />
        ) : <div>Loading lesson...</div>;
      case SectionType.PRONUNCIATION:
        return <div>Pronunciation Practice Placeholder</div>;
      case SectionType.SHARE:
        return <div>Share App Placeholder</div>;
      default:
        return <Dashboard progress={progress} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <button onClick={toggleMenu} className="hamburger">☰</button>
        <h1>Learnendo</h1>
      </header>
      {menuOpen && (
        <nav className="hamburger-menu">
          <button onClick={() => { setCurrentSection(SectionType.DASHBOARD); setMenuOpen(false); }}>Dashboard</button>
          <button onClick={() => { setCurrentSection(SectionType.PLACEMENT_TEST); setMenuOpen(false); }}>Placement Test</button>
          <button onClick={() => { setCurrentSection(SectionType.PRONUNCIATION); setMenuOpen(false); }}>Pronunciation Practice</button>
          <button onClick={() => { /* logout */ }}>Settings</button>
          <button onClick={() => { /* logout */ }}>Logout</button>
        </nav>
      )}
      {renderSection()}
      <BottomNavigation currentSection={currentSection} onNavigate={handleNavigate} />
    </div>
  );
};

export default App;