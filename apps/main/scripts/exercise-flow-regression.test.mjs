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

test('Enter uses one contextual action with duplicate-dispatch protection', () => {
  assert.match(uiSource, /primaryActionInFlightRef/);
  assert.match(uiSource, /window\.addEventListener\('keydown', handleWindowKeyDown\)/);
  assert.match(uiSource, /event\.repeat \|\| event\.isComposing/);
  assert.match(uiSource, /if \(showFooter\) \{\s*performFooterAction\(\)/);
  assert.match(uiSource, /onClick=\{performFooterAction\}/, 'mouse activation must remain available');
  assert.match(uiSource, /pendingOnResultRef\.current = null/, 'Continue must consume its pending action once');
});

test('correct answers persist before Continue and active retry state survives returning to the trail', () => {
  const attemptHandler = exercisePracticeSource.indexOf('const handleAttempt');
  const completionWrite = exercisePracticeSource.indexOf('completeExercise(exerciseProgressRef.current', attemptHandler);
  const continueHandler = exercisePracticeSource.indexOf('const handleResult', 0);
  assert.ok(attemptHandler >= 0 && completionWrite > attemptHandler);
  assert.ok(completionWrite > continueHandler, 'completion is expected in the attempt path, not only in Continue');
  assert.match(exercisePracticeSource, /window\.localStorage\.setItem\(masteryStorageKey/);
  assert.match(exercisePracticeSource, /window\.sessionStorage\.removeItem\(activeRunStorageKey\)/, 'legacy run state must be removed after migration or completion');
  assert.match(exercisePracticeSource, /window\.sessionStorage\.removeItem\(masteryStorageKey\(targetRunId\)\)/, 'legacy mastery state must not restore a finished run');
  const backHandler = exercisePracticeSource.match(/const backToTrail = \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(backHandler);
  assert.doesNotMatch(backHandler[1], /removeItem/, 'Back must not discard an unresolved retry queue');
});

test('individual exercises do not render a second completion report', () => {
  assert.doesNotMatch(exercisePracticeSource, /phase === 'transition'/);
  assert.match(exercisePracticeSource, /isLastDayOfLesson && \(/);
  assert.match(exercisePracticeSource, /Final Test performance/);
});

test('attempt dots preserve an orange error history after eventual mastery', () => {
  assert.match(exercisePracticeSource, /incorrectAttempts > 0 \? 'bg-amber-400'/);
  assert.match(exercisePracticeSource, /incorrect attempt\$\{incorrectAttempts === 1/);
  assert.match(exercisePracticeSource, /masterySummary\.totalIncorrectAttempts/);
});
