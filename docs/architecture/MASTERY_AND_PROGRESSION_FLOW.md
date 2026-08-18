# Mastery and progression flow

## Scope

The mastery session sits above the existing unique-exercise completion engine. It does not change exercise IDs, day sizes, authored answers, Firebase configuration, authentication, LiveKit, placement, or other applications.

Day 7 remains the existing lesson test/final review. There is no eighth trail.

## Exercise states

- `unseen`: not attempted in this session.
- `incorrect`: the current presentation has a wrong attempt.
- `queued-for-review`: corrected during the first pass or after a contaminated review presentation; it remains pending.
- `mastered`: answered cleanly on the first pass or on a later clean review presentation.
- `skipped-technical`: explicitly reported and skipped after the technical safety threshold; never counted as mastered.

The type also reserves `correct-first-try` and `corrected-with-feedback` as descriptive states. The session immediately folds successful terminal outcomes into `mastered` or `queued-for-review`, keeping a single authoritative completion rule.

## First pass and review queue

The original sequence is presented once. A clean answer is mastered. After a wrong answer, feedback and correction allow the learner to continue, but the exercise is appended once to `reviewQueue`.

After the original sequence, the queue is presented in order without pre-revealing the answer. A clean answer removes the item and masters it. A wrong answer followed by correction moves the item to the queue's end; a later clean presentation is still required.

Example: errors on 3 and 7 create `[3, 7]`. A clean 3 leaves `[7]`. A wrong-then-correct 7 leaves `[7]`. A later clean 7 empties the queue and completes the session.

The queue is cached under the active run in `sessionStorage`, so a refresh in the same run does not erase pending remediation.

## Metrics

- Unique exercises: stable IDs in the session.
- First-try correct: exercises answered cleanly on their first presentation.
- First-pass errors: unique exercises with an initial-pass error.
- Exercises reviewed: unique items presented successfully in review.
- Review attempts: every validation attempt during review.
- Initial accuracy: `firstTryCorrect / uniqueExercises * 100`.
- Final mastery: `mastered / uniqueExercises * 100`.

Mandatory review and voluntary replay do not increase the unique-progress numerator. A successful session ends at 100% final mastery, while initial accuracy remains unchanged.

## Points

The existing engine remains authoritative for first-pass and voluntary-replay rewards: 10 points for first-try completion and 6 after retry. Voluntary replay keeps its capped multiplier and idempotent run key.

Mandatory review is not a replay. A clean review mastery awards 3 points once per queued exercise, clearing the queue awards a 5-point day/session bonus, and passing the final lesson review awards a separate 10-point lesson bonus. Failed or corrected-but-not-clean review presentations award no review points. Technical skips award nothing.

## Completion milestones

- Intermediate day: persist completion, then offer **Continue to next day** as the primary action.
- Day 7/final review: finish only when the mastery queue is empty; persist the language-scoped lesson marker and unlock the next lesson locally before navigation.
- Last lesson in a workbook: offer the next workbook when registered, otherwise return to the workbook chooser.

Secondary actions remain **Repeat this day**, **Repeat this lesson** at lesson milestones, and **Back to trail**. Back preserves saved state and returns to the current lesson trail.

## Technical safety

After the configurable attempt threshold, the learner can report invalid answer data/audio, skip the item as unmastered, or return to the trail. Student error is never automatically classified as a technical error, and a technical skip blocks successful mastery completion.

## Unlock and replay

`lesson_test_passed_{language?}_{lessonNumber}` is added to local progress and persisted before the next-lesson callback runs. `WorkbookView` derives student access from that marker, so no reload or administrator privilege is needed.

Replay creates a fresh run and a fresh mastery queue, retains the prior completion record, preserves unique progress, records vocabulary as reviewed, and uses the existing capped replay reward. Mandatory remediation never invokes the replay multiplier.
