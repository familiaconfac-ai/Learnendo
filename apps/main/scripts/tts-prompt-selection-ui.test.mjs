import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [resolver, practiceUi, studentPractice, authoringSandbox, overrideSandbox] = await Promise.all([
  readFile(new URL('../src/utils/fillInBlankAudio.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/UI.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AdminExercises/ExerciseAuthoringWorkspace.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProblemReports/ExerciseEditorModal.tsx', import.meta.url), 'utf8'),
]);

test('student and both administrative sandboxes share the central prompt resolver', () => {
  assert.match(practiceUi, /const promptAudioText = resolvePromptAudioText\(item, exerciseSpeechLocale\)/);
  assert.match(studentPractice, /<PracticeSection/);
  assert.match(authoringSandbox, /<PracticeSection item=\{\{ \.\.\.exercise, moduleType: 'authoring-sandbox'/);
  assert.match(overrideSandbox, /<PracticeSection item=\{\{ \.\.\.exercise, moduleType: 'override-sandbox'/);
});

test('explicit TTS precedes legacy, display and instruction fallbacks', () => {
  const promptResolver = resolver.slice(
    resolver.indexOf('export function resolvePromptAudioText'),
    resolver.indexOf('export function resolveFullSentenceAfterAnswer'),
  );
  assert.match(resolver, /const selectedText = explicitTtsText \|\| legacyAudioText \|\| displayedText \|\| instruction \|\| ''/);
  assert.doesNotMatch(promptResolver, /hasBlankPlaceholder\(source\.displayValue\)/);
});
