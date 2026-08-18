# Replay and shadowing fix

Date: 2026-07-14  
Scope: `apps/main` only.

## Cause and corrected flow

`ExercisePractice` used the unique historical completion records to calculate `firstIncomplete`. When every exercise already had a record, it restored the last array index and immediately selected the `summary` phase. Historical completion was therefore being mistaken for completion of the current execution.

The corrected flow creates/reuses a `runId` for the active practice session. A completed day starts a replay at index zero; an explicit exercise dot starts exactly that exercise as an isolated practice; an interrupted run resumes at its first unfinished item. The summary is based on events for the current `runId` and is shown only after that execution finishes. It now offers `Continue to next day` when available, `Repeat this day`, and `Back to trail`.

## Replay model, points, and progress

- `records` remains the unique official record keyed by workbook/lesson/day/exercise.
- `runs` stores one idempotent event per `runId + exerciseKey`.
- The unique record tracks `completionCount`, `replayCount`, `lastCompletedAt`, `lastPracticedAt`, `bestAccuracy`, and `totalPracticePoints`.
- The run stores base points, replay bonus, points for that execution, attempts, accuracy, and vocabulary new/reviewed.
- Existing official base points were preserved: 10 on the first attempt or 6 after retry.
- Reward formula: `basePoints * min(completionCount, maxMultiplier)`.
- Configuration used: maximum multiplier 4; maximum three rewarded replays per exercise per calendar day. Further practice remains free but receives base points only.
- Replaying never adds another unique exercise to lesson/workbook/course progress.
- Legacy day-level completion is migrated into zero-point unique exercise records, preventing a completed lesson/workbook from appearing as `0/100` or `0/1200`.

## Vocabulary

Explicit authored vocabulary is counted as new only on the first unique completion. Later runs record it in `vocabularyReviewedIds`; the replay summary displays `Vocabulary reviewed` instead of duplicating `New vocabulary`.

## Shadowing and question-and-answer

The previous UI forced question-shaped speaking prompts into shadowing while still accepting authored semantic answers. Classification is now instruction-driven:

- instructions containing repeat/shadow intent are shadowing, including `What is five plus five?`; validation targets the complete audio phrase;
- instructions containing answer/respond intent are question-and-answer; validation targets the authored answer variants;
- shadowing displays `Listen and repeat what you hear.` and keeps microphone-first interaction with the existing typed fallback.

Audit result: Workbook 1's `Listen and repeat exactly as you hear` items are valid shadowing, including question-shaped prompts. Its `Listen and answer` items are question-and-answer and no longer receive the shadowing badge or validation. No editorial IDs, exercise distribution, or lesson content were changed.

## Letter H

For an isolated authored audio value `H`, only the TTS prompt is changed to `the letter H`. The answer target remains `H`. Browser logs confirmed that both the exercise layer and TTS service received `the letter H`, not `eight`.

## Files modified

- `apps/main/package.json`
- `apps/main/src/App.tsx`
- `apps/main/src/components/ExercisePractice/ExercisePractice.tsx`
- `apps/main/src/components/UI.tsx`
- `apps/main/src/engine/exerciseCompletionEngine.ts`
- `apps/main/src/engine/exerciseCompletionEngine.test.ts`
- `apps/main/src/utils/fillInBlankAudio.ts`
- `apps/main/src/utils/speakingExercise.ts`
- `apps/main/src/utils/speakingExercise.test.ts`
- `docs/audits/REPLAY_AND_SHADOWING_FIX.md`

## Validation

- `npm run test:exercise-flow`: passed (16 engine/flow tests, 3 speaking/TTS tests, 2 source regressions).
- `npm run test:answer-normalization`: passed (6 tests).
- `npm run build`: passed.
- `npm run lint` (`tsc --noEmit`): still reports 14 pre-existing errors in Battle, Workspace, grammar typing, and workbook 5-7 data; no new error was reported in the changed replay/shadowing files.
- Browser: completed Lesson 1 reopened Exercise 2 normally with no premature summary; dot 2 opened the exact second inner exercise; a question-shaped shadowing item displayed `Listen and repeat what you hear`; isolated H emitted `the letter H`; isolated replay produced its summary only after completion with explicit destinations and non-zero lesson/workbook progress.

No commit, push, deploy, Firebase production change, authentication change, LiveKit change, other app change, or submodule change was performed.
