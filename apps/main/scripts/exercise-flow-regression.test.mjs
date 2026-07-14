import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const uiSource = await readFile(new URL('../src/components/UI.tsx', import.meta.url), 'utf8');
const exercisePracticeSource = await readFile(
  new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url),
  'utf8',
);

test('resolves the prompt audio before deriving speaking state', () => {
  const declaration = uiSource.indexOf('const promptAudioText = resolvePromptAudioText(item);');
  const firstUse = uiSource.indexOf('const isQuestionDrivenSpeaking =');

  assert.notEqual(declaration, -1, 'promptAudioText declaration was not found');
  assert.notEqual(firstUse, -1, 'speaking-state derivation was not found');
  assert.ok(
    declaration < firstUse,
    'promptAudioText is read before initialization and can crash the exercise render',
  );
});

test('an out-of-range exercise index renders a recovery state instead of a blank screen', () => {
  assert.doesNotMatch(
    exercisePracticeSource,
    /if \(currentIdx >= exercises\.length\) return null;/,
    'the exercise flow still returns a blank screen when its index is out of range',
  );
});
