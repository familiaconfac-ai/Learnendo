import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GrammarFocusModal } from '../src/components/GrammarFocus/GrammarFocusModal';
import { LiveClassRoomShell } from '../src/components/LiveClasses/Shared/LiveClassRoomShell';
import { WorkbookView } from '../src/components/WorkbookView/WorkbookView';
import { LessonView } from '../src/components/LessonView/LessonView';
import { UiLanguageProvider } from '../src/i18n/UiLanguageContext';
import { getUiLabels, type UiLanguage } from '../src/i18n/uiLabels';
import '@livekit/components-styles';

function Fixture() {
  const [entry, setEntry] = useState('');
  const [uiLanguage, setUi] = useState<UiLanguage>('pt');
  const [target, setTarget] = useState('en');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('admin');
  const [lessonNumber, setLessonNumber] = useState<number | null>(1);
  const [surface, setSurface] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const ui = getUiLabels(uiLanguage);
  const title = ({ en: 'The Alphabet and Numbers', es: 'Un día en la naturaleza', el: 'Το αλφάβητο', he: 'האלפבית' })[target]!;
  const lesson = { id: `${target === 'en' ? '' : target + '_'}wb1_l1`, title: `Lesson 1: ${title}`, days: [] };
  const grammar = <GrammarFocusModal courseId={target === 'es' ? 'spanish' : 'english'} workbookId={1}
    lessonId={lessonNumber ? lesson.id : null} lessonNumber={lessonNumber} lessonTitle={title}
    lessons={[{ id: lesson.id, lessonNumber: 1, title: lesson.title }]} workbookOptions={[{ id: 1, label: 'Workbook 1' }]}
    onSelectWorkbook={() => undefined} activeLanguage="pt" userRole={role} userId="fixture" userName="Fixture" userEmail={null}
    scrollRef={ref} onScroll={() => undefined} onSelectLesson={setLessonNumber} onOpenOverview={() => setLessonNumber(null)}
    onClose={() => setEntry('')} onOpenBoard={async () => setSurface('Board opened')}
    onOpenSlides={async () => setSurface('Slides opened')} onOpenPractice={() => setSurface('Practice opened')} />;
  return <UiLanguageProvider value={{ uiLanguage, baseLanguage: 'pt' }}>
    <header data-app-chrome="header" className="fixed inset-x-0 top-0 z-50 h-[68px] bg-slate-900 text-white">App header</header>
    <main className="pt-[68px] bg-white">
      <label>UI <select aria-label="UI" value={uiLanguage} onChange={e => setUi(e.target.value as UiLanguage)}><option>en</option><option>pt</option><option>es</option></select></label>
      <label>Target <select aria-label="Target" value={target} onChange={e => setTarget(e.target.value)}>{['en','es','el','he'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Role <select aria-label="Role" value={role} onChange={e => setRole(e.target.value as typeof role)}>{['student','teacher','admin'].map(v => <option key={v}>{v}</option>)}</select></label>
      <nav>{ui.students} / {ui.teacher} / {ui.admin} / {ui.workbooks} / {ui.courses}</nav>
      <button onClick={() => { setLessonNumber(1); setEntry('board'); }}>Board/Live → Grammar</button>
      <button onClick={() => { setLessonNumber(null); setEntry('workbook'); }}>Workbook → Overview</button>
      <output>{surface}</output>
      <WorkbookView workbookId={1} lessons={[lesson]} progress={{ completedActivities: [] } as never} currentLanguage={target} uiLanguage={uiLanguage} onBack={() => undefined} onSelectLesson={() => undefined} onOpenGrammarOverview={() => { setLessonNumber(1); setEntry('workbook'); }} />
      <LessonView lesson={lesson} lessonNumber={1} currentLanguage={target as never} progress={{ completedActivities: [] } as never} onBack={() => undefined} onStartDay={() => undefined} onStartWeeklyTest={() => undefined} />
    </main>
    {entry === 'workbook' && grammar}
    {entry === 'board' && <div className="lk-room-container relative"><LiveClassRoomShell title="Live" exitLabel="Exit" onExit={() => setEntry('')} mainContent={<p>Board</p>} desktopSidebar={null} bottomBar={null} overlay={grammar} /></div>}
  </UiLanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
