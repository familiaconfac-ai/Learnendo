/** Local integration fixture: real components/TTS/report service, mocked Firestore writes. */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExercisePractice } from '../src/components/ExercisePractice/ExercisePractice';
import { workbook1 as es } from '../src/courses/spanish/workbook1';
import { workbook1 as pt } from '../src/courses/portuguese_foreigners/workbook1';
import { workbook1 as en } from '../src/data/workbook1/index';

function Fixture() {
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('es');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    const listener = (event: Event) => setSaved(JSON.stringify((event as CustomEvent).detail, null, 2));
    window.addEventListener('fixture:report-saved', listener);
    return () => window.removeEventListener('fixture:report-saved', listener);
  }, []);
  const workbook = { en, es, pt }[language];
  const lesson = workbook.lessons[0];
  const exercise = lesson.days.flatMap((day) => day.exercises).find((exercise) => language === 'en'
    ? exercise.audioValue === 'R. This is the letter R.'
    : exercise.id === `${language}_wb1_l1_d1_e9`)!;
  const day = lesson.days.find((day) => day.exercises.includes(exercise))!;
  return <>
    <header style={{ position: 'fixed', top: 0, zIndex: 200, background: 'white', color: 'black', width: '100%', padding: 8 }}>
      <label>Idioma do teste <select value={language} onChange={(event) => { setLanguage(event.target.value as typeof language); setSaved(''); }}>
        <option value="en">English</option><option value="es">Español</option><option value="pt">Português</option>
      </select></label> <span>{exercise.id} — Persistência simulada; TTS real</span>
      {saved && <details><summary>Payload persistido no teste</summary><pre style={{ maxHeight: 450, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{saved}</pre></details>}
    </header>
    <ExercisePractice key={language} day={day} lessonId={lesson.id} currentLanguage={language}
      initialExerciseIndex={day.exercises.indexOf(exercise)} progress={{ completedDays: [] } as any}
      userId={`fixture-${language}`} workbookId={1} lessonTitle={lesson.title}
      onBack={() => {}} onComplete={() => {}} />
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
