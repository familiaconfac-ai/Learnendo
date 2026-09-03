import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WorkbookView } from '../src/components/WorkbookView/WorkbookView';
import { LessonView } from '../src/components/LessonView/LessonView';
import { UiLanguageProvider } from '../src/i18n/UiLanguageContext';
import { curricularLessonTitle, getUiLabels, normalizeUiLanguage, type UiLanguage } from '../src/i18n/uiLabels';
import { resolveRuntimeLanguageContext } from '../src/models/languageContext';

const cases = [
  ['pt', 'english', 'en', 'The Alphabet and Numbers', 'Lição', 'Gramática'],
  ['pt', 'spanish', 'es', 'Un día en la naturaleza', 'Lição', 'Gramática'],
  ['es', 'english', 'en', 'A Day in Nature', 'Lección', 'Gramática'],
  ['en', 'spanish', 'es', 'El alfabeto', 'Lesson', 'Grammar'],
  ['pt', 'greek_koine', 'el', 'Το αλφάβητο', 'Lição', 'Gramática'],
  ['pt', 'hebrew_biblical', 'he', 'האלפבית', 'Lição', 'Gramática'],
] as const;
for (const [uiLanguage, courseId, target, title, prefix, grammar] of cases) {
  // Deliberately keep base PT while varying the explicit UI preference and target.
  const context = resolveRuntimeLanguageContext({ uid: 'test', profile: { uid: 'test', baseLanguage: 'pt', uiLanguage }, courseId });
  assert.equal(context.uiLanguage, uiLanguage);
  assert.equal(context.baseLanguage, 'pt');
  assert.equal(context.targetLanguage, target);
  const lesson = { id: `${target}_wb1_l1`, title: `Lesson 1: ${title}`, days: [] };
  const html = renderToStaticMarkup(<UiLanguageProvider value={context}>
    <WorkbookView workbookId={1} lessons={[lesson]} progress={{ completedActivities: [] } as never}
      currentLanguage={target} uiLanguage={context.uiLanguage} onBack={() => {}} onSelectLesson={() => {}} onOpenGrammarOverview={() => {}} />
    <LessonView lesson={lesson} lessonNumber={1} progress={{ completedActivities: [] } as never} currentLanguage={target}
      onBack={() => {}} onStartDay={() => {}} onStartWeeklyTest={() => {}} onGrammar={() => {}} />
  </UiLanguageProvider>);
  assert.ok(html.includes(`${prefix} 1: ${title}`), `${uiLanguage}/${target}: UI prefix + untouched curriculum`);
  assert.ok(html.includes(`>${grammar}</span>`));
  assert.ok(html.includes(getUiLabels(uiLanguage).exercise + ' 1'));
  if (uiLanguage !== 'en') assert.ok(!html.includes('Lesson 1'), 'raw structural prefix must not leak');
}
for (const title of ['A Day in Nature', 'Το αλφάβητο', 'האלפבית', 'Nature: A Day', 'Lesson 1 in context']) {
  assert.equal(curricularLessonTitle(title), title);
  assert.equal(curricularLessonTitle(`Lesson 1: ${title}`), title);
}
for (const language of ['el', 'he', '', 'xx']) assert.equal(normalizeUiLanguage(language), 'en');
for (const language of ['en','pt','es'] as UiLanguage[]) {
  for (const value of Object.values(getUiLabels(language))) assert.ok(value.trim());
}
// Guard the actual entry points; a future inline modal can reproduce the Live stacking regression.
const read = (path: string) => readFileSync(path, 'utf8');
const modal = read('src/components/GrammarFocus/GrammarFocusModal.tsx');
assert.match(modal, /return createPortal\([\s\S]*document\.body/);
assert.match(modal, /max-h-\[100dvh\]/);
assert.match(modal, /font-sans text-base leading-normal text-slate-900/);
assert.match(modal, /const copy = COPY\[uiLanguage\]/);
assert.match(modal, /selectedLanguage \|\| activeLanguage/);
for (const entry of ['src/App.tsx', 'src/components/LiveClasses/Teacher/TeacherRoomView.tsx', 'src/components/LiveClasses/LiveTrailExerciseOverlay.tsx']) {
  assert.match(read(entry), /activeLanguage=\{baseLanguage\}/);
}
assert.doesNotMatch(read('src/components/LiveClasses/Teacher/TeacherRoomView.tsx'), /getScopedStorageItem/);
console.log('Language smoke: 6 rendered UI/target combinations, unchanged titles, supported UI locales and modal entry contracts passed.');
