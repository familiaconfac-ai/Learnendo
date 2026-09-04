import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(new URL('../src/components/GrammarFocus/GrammarFocusModal.tsx', import.meta.url), 'utf8');
const navigator = await readFile(new URL('../src/components/GrammarFocus/GrammarNavigatorModal.tsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/services/grammarFocusService.ts', import.meta.url), 'utf8');
const liveTrail = await readFile(new URL('../src/components/LiveClasses/LiveTrailExerciseOverlay.tsx', import.meta.url), 'utf8');
const reportModal = await readFile(new URL('../src/components/GrammarFocus/GrammarFocusReportModal.tsx', import.meta.url), 'utf8');
const teacherRoom = await readFile(new URL('../src/components/LiveClasses/Teacher/TeacherRoomView.tsx', import.meta.url), 'utf8');

test('students receive the active locale without administrative controls', () => {
  assert.match(app, /activeLanguage=\{baseLanguage\}/);
  assert.match(component, /normalizeGrammarFocusLanguage\(activeLanguage\)/);
  assert.match(component, /getLocalizedGrammarFocusContent\(documentValue\?\.content, visibleLanguage\)/);
  assert.match(component, /availableGrammarFocusLanguages\(readingContent\)/, 'the displayed locale is explicitly selectable and labeled');
  assert.match(component, /legacyDocuments\.filter\(\(source\) => !source\.assignment\)/,
    'assigned legacy archives must never render as a parallel source');
  assert.match(component, /!actions\.edit && !hasDocumentContent[\s\S]+legacyDocuments\.find/,
    'legacy content reaches students and teachers only as an inline read-only fallback');
  assert.match(component, /actions\.board && hasCanonicalContent && onOpenBoard/,
    'Board and Slides publish only the official canonical document');
  assert.match(component, /\[courseId, canonicalLessonId, isOverview, workbookId\]/,
    'support locale is independent; curriculum changes resubscribe to their own document');
  assert.match(component, /getGrammarFocusActions\(userRole\)/);
  assert.match(component, /\{actions\.edit && <button[^>]+onClick=\{beginEditing\}/);
  assert.match(component, /hasActiveContent \? <div/);
  assert.match(component, /loadError[\s\S]+actions\.edit[\s\S]+copy\.add[\s\S]+copy\.noNotes/,
    'a read failure must keep the admin add action available while students see the empty localized state');
});

test('all Live trail roles use the universal navigator backed by the official Grammar Focus modal', () => {
  assert.match(liveTrail, /<GrammarNavigatorModal/);
  assert.match(navigator, /<GrammarFocusModal/);
  assert.match(liveTrail, /userRole=\{userRole\}/);
  assert.doesNotMatch(liveTrail, /GRAMMAR_GUIDES/);
  assert.match(liveTrail, /appendGrammarFocusWorkspacePage\(/);
});

test('the Grammar navigator covers every configured workbook and highlights the current lesson', () => {
  assert.match(navigator, /getWorkbookOptionsForCourse\(courseId\)/);
  assert.match(navigator, /loadWorkbookForWhiteboard\(courseId, workbookId\)/);
  assert.match(navigator, /highlightedLessonId=\{highlightedLesson\?\.id \?\? null\}/);
  assert.doesNotMatch(navigator, /updateLiveSession|handleUpdateSession/,
    'browsing another workbook must not mutate the active Live session');
  assert.match(component, /workbookOptions\.map/);
  assert.match(component, /ui\.currentLesson/);
});

test('Grammar actions stay individual outside Live and use the collective panel inside Live', () => {
  assert.match(app, /onOpenPractice=\{\(selection\) => \{[\s\S]+openLesson\(selection\.lessonId/);
  assert.match(liveTrail, /onOpenSessionPanel\?\.\(selection\)/);
  assert.match(teacherRoom, /defaultWorkbookId=\{exercisePanelSelection\?\.workbookId/);
  assert.match(teacherRoom, /defaultLessonId=\{exercisePanelSelection\?\.lessonId/);
  assert.match(teacherRoom, /onOpenBoard=\{\(content\) => openGrammarOnWorkspace\('document', content\)\}/);
  assert.match(teacherRoom, /onOpenSlides=\{\(content\) => openGrammarOnWorkspace\('slides', content\)\}/);
});

test('teacher report reuses the existing exercise report infrastructure', () => {
  assert.match(component, /actions\.report/);
  assert.match(component, /<GrammarFocusReportModal/);
  assert.match(reportModal, /GRAMMAR_FOCUS_REPORT_CATEGORIES/);
  assert.match(reportModal, /createGrammarFocusReport/);
});

test('admin editor supports all locales, preview, unsaved confirmation and retained errors', () => {
  assert.match(component, /GRAMMAR_FOCUS_LANGUAGES\.map/);
  assert.match(component, /const previewLocale = draft\[editorLanguage\]/);
  assert.match(component, /\[editorLanguage\]: \{ \.\.\.current\[editorLanguage\], \[field\]: value \}/,
    'switching tabs must retain every locale in the same draft object');
  assert.match(component, /setPreviewing/);
  assert.match(component, /window\.confirm\(copy\.unsaved\)/);
  assert.match(component, /disabled=\{saving \|\| !dirty\}/);
  assert.match(component, /if \(editingRef\.current \|\| dirtyRef\.current\)/,
    'a remote snapshot must never overwrite an in-progress local draft');
  assert.match(component, /const isSelfSave = savingRef\.current/,
    'a save acknowledged by the server must not surface as a false conflict');
  assert.match(component, /setDocumentValue\(saved\)/,
    'saving still syncs the baseline from the persisted document');
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});

test('Firestore persistence records audit metadata and refreshes through snapshots', () => {
  assert.match(service, /onSnapshot\(/);
  assert.match(service, /updatedAt: serverTimestamp\(\)/);
  assert.match(service, /updatedBy: input\.updatedBy/);
  assert.match(service, /runTransaction\(/);
  assert.match(service, /mergeGrammarFocusContent\(existingContent, input\.content\)/);
  assert.match(service, /transaction\.set\(ref, value\)/);
});
