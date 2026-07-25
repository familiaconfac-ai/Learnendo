import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(new URL('../src/components/GrammarFocus/GrammarFocusModal.tsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/services/grammarFocusService.ts', import.meta.url), 'utf8');

test('students receive the active locale without administrative controls', () => {
  assert.match(app, /activeLanguage=\{language\}/);
  assert.match(component, /normalizeGrammarFocusLanguage\(activeLanguage\)/);
  assert.match(component, /getLocalizedGrammarFocusContent\(documentValue\?\.content, activeLanguage\)/);
  assert.match(component, /\[canonicalLessonId, isOverview, workbookId\]/,
    'changing the global language must select another locale without resubscribing to a language-prefixed document');
  assert.match(component, /\{isAdmin && <button[^>]+onClick=\{beginEditing\}/);
  assert.match(component, /hasActiveContent \? <div/);
  assert.match(component, /loadError[\s\S]+isAdmin[\s\S]+copy\.add[\s\S]+copy\.noNotes/,
    'a read failure must keep the admin add action available while students see the empty localized state');
});

test('admin editor supports all locales, preview, unsaved confirmation and retained errors', () => {
  assert.match(component, /GRAMMAR_FOCUS_LANGUAGES\.map/);
  assert.match(component, /const previewLocale = draft\[editorLanguage\]/);
  assert.match(component, /\[editorLanguage\]: \{ \.\.\.current\[editorLanguage\], \[field\]: value \}/,
    'switching tabs must retain every locale in the same draft object');
  assert.match(component, /setPreviewing/);
  assert.match(component, /window\.confirm\(copy\.unsaved\)/);
  assert.match(component, /disabled=\{saving \|\| !dirty\}/);
  assert.match(component, /setSaveError\(error instanceof Error/);
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
