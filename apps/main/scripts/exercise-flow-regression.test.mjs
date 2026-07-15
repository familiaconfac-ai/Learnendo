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

test('practice uses one external scroll container with a compact sticky confirmation footer', () => {
  const shell = uiSource.indexOf('data-practice-shell="true"');
  const scrollRegion = uiSource.indexOf('data-practice-scroll-region="true"');
  const options = uiSource.indexOf('data-practice-options="true"');
  const footer = uiSource.indexOf('data-practice-footer="true"');
  assert.ok(shell >= 0 && scrollRegion > shell && options > scrollRegion && footer > options);
  assert.match(uiSource, /data-practice-shell="true"[\s\S]{0,300}no-scrollbar[\s\S]{0,100}overflow-y-auto/);
  assert.match(uiSource, /data-practice-scroll-region="true"[^>]+overflow-visible/);
  assert.doesNotMatch(uiSource, /data-practice-scroll-region="true"[^>]+overflow-y-auto/);
  assert.doesNotMatch(uiSource, /scrollbar-gutter:stable/);
  assert.match(uiSource, /data-practice-footer="true"[^>]+sticky bottom-0[^>]+safe-area-inset-bottom/);
  assert.match(uiSource, /min-h-\[42px\]/);
});
