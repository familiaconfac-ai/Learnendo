import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const uiSource = await readFile(new URL('../src/components/UI.tsx', import.meta.url), 'utf8');
const exercisePracticeSource = await readFile(
  new URL('../src/components/ExercisePractice/ExercisePractice.tsx', import.meta.url),
  'utf8',
);
const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const lesson4Source = await readFile(new URL('../src/data/workbook1/lesson4.ts', import.meta.url), 'utf8');
const lesson8Source = await readFile(new URL('../src/data/workbook1/lesson8.ts', import.meta.url), 'utf8');

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

test('selecting the already active workbook retriggers loading and exits the empty orientation', () => {
  assert.match(appSource, /setWorkbookLoadRequest\(\(request\) => request \+ 1\)/);
  assert.match(appSource, /\[currentWorkbookId, currentCourseId, progressLoaded, workbookLoadRequest\]/);
  assert.match(appSource, /setWorkbookOrientationDismissed\(true\)/);
  assert.match(appSource, /if \(!hasProgress && !workbookOrientationDismissed\)/);
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

test('choice exercises validate on selection and render only the feedback Continue', () => {
  assert.match(exercisePracticeSource, /validateChoiceOnSelect/);
  assert.match(uiSource, /handleCheck\(opt\)/, 'the selected option must call the existing validator directly');
  assert.match(uiSource, /\(!validateChoiceOnSelect \|\| !isMultipleChoice \|\| showFooter\)/,
    'the feedback footer must not exist before a choice is validated');
  assert.match(uiSource, /\(!validateChoiceOnSelect \|\| !isMultipleChoice\).*allowContinueWithoutAnswer/s,
    'the intermediate action must not render for selection exercises');
  assert.doesNotMatch(uiSource, /autoAdvanceOnCorrect/,
    'selection validation must wait for the final feedback Continue instead of auto-advancing');
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
  assert.match(exercisePracticeSource, /restoreMasterySession\(cached\)/, 'cached review state must be migrated and restored');
  assert.match(exercisePracticeSource, /before\.phase !== 'initial'/, 'the rendered attempt flow must use the explicit initial phase');
  assert.match(exercisePracticeSource, /isNowMastered/, 'initial correction must not persist exercise mastery before review');
});

test('individual exercises do not render a second completion report', () => {
  assert.doesNotMatch(exercisePracticeSource, /phase === 'transition'/);
  assert.match(exercisePracticeSource, /isLastDayOfLesson && \(/);
  assert.match(exercisePracticeSource, /Final Test performance/);
});

test('attempt dots distinguish completed, pending and actively reviewed exercises', () => {
  assert.match(exercisePracticeSource, /activeReview[\s\S]+bg-emerald-400/);
  assert.match(exercisePracticeSource, /needsReview[\s\S]+bg-amber-400/);
  assert.match(exercisePracticeSource, /completed[\s\S]+bg-blue-500/);
  assert.match(exercisePracticeSource, /needs review after/);
  assert.match(exercisePracticeSource, /masterySummary\.totalIncorrectAttempts/);
});

test('Review Mode is visibly identified only while the mastery phase is review', () => {
  assert.match(exercisePracticeSource, /phase === 'exercise' && mastery\.phase === 'review'/);
  assert.match(exercisePracticeSource, /data-testid="review-mode-indicator"/);
  assert.match(exercisePracticeSource, /Review exercise · first try counts/);
});

test('every exercise instruction has its own audio control', () => {
  assert.match(uiSource, /aria-label="Play instruction"/);
  assert.match(uiSource, /speak\(instructionAudioText, 1, promptVoice\)/);
});

test('mobile feedback keeps contextual help inside the footer instead of floating over Continue', () => {
  assert.match(uiSource, /aria-label="Grammar help and report problem"/);
  assert.match(uiSource, /flex shrink-0 items-center gap-1\.5/);
  assert.doesNotMatch(exercisePracticeSource, /fixed bottom-\[72px\][^>]+Reportar problema/);
  assert.match(exercisePracticeSource, /Ajuda gramatical/);
  assert.match(exercisePracticeSource, /Voltar ao exercício/);
});

test('speaking answer field starts on one row and wraps safely on narrow screens', () => {
  assert.match(uiSource, /rows=\{1\}/);
  assert.match(uiSource, /overflow-x-hidden/);
  assert.match(uiSource, /\[overflow-wrap:anywhere\]/);
  assert.match(uiSource, /Math\.min\(textareaRef\.current\.scrollHeight, 120\)/);
});

test('text answer fields regain focus whenever the current exercise becomes answerable', () => {
  assert.match(
    uiSource,
    /if \(exerciseActionLocked \|\| showFooter \|\| wrongFooterLocked\) return undefined;/,
    'focus must wait until writing/listening-writing is enabled and feedback is dismissed',
  );
  assert.match(
    uiSource,
    /item\.type === 'speaking'[\s\S]{0,180}textareaRef\.current[\s\S]{0,180}item\.type === 'writing'[\s\S]{0,180}inputRef\.current/,
    'speaking and writing must share the same focus lifecycle',
  );
  assert.match(uiSource, /answerField\.focus\(\{ preventScroll: true \}\)/);
  assert.match(
    uiSource,
    /\[exerciseActionLocked, item\.id, item\.type, showFooter, wrongFooterLocked\]/,
    'focus must rerun on exercise changes, audio unlock and retry feedback dismissal',
  );
});

test('ordinal speaking questions include visible context and complete accepted answers', () => {
  assert.match(lesson4Source, /Who is second\?/);
  assert.match(lesson4Source, /contextVisual: \{ type: 'ordinal-line', people: \['Anna', 'Lucas', 'Daniel', 'Emily'\] \}/);
  assert.match(lesson4Source, /acceptedAnswers: \['Lucas\.', 'Lucas is second\.'\]/);
  assert.match(lesson4Source, /grammarHelp: \{ title: 'Ordinal numbers: second'/);
});

test('reports never carry the previous exercise answer into the current exercise', () => {
  assert.match(exercisePracticeSource, /setLastStudentAnswer\(null\);\s*setLastAttemptCount\(0\);\s*\}, \[currentIdx, day\.id\]\)/);
});

test('Lesson 8 day 4 exercise 8 uses an A1-sized direct completion prompt', () => {
  assert.match(lesson8Source, /choice\("I'm happy, ___\?", "aren't I\?"/);
  assert.doesNotMatch(lesson8Source, /Is amn't I accepted as the standard answer in this lesson\?/);
  assert.doesNotMatch(lesson8Source, /No\. The standard tag is aren’t I\?/);
});
