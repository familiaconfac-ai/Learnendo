# Mastery flow implementation report

## Findings and implementation

The visible white bar came from `overflow-y-auto` plus `scrollbar-gutter: stable` on the exercise's inner content region. The confirmation footer lived outside that region, producing a nested, visibly reserved scrollbar.

The exercise shell is now the only vertical scroll owner. Its scrollbar appearance is hidden without disabling wheel, touch, or keyboard scrolling. The inner region uses visible overflow. The header and confirmation footer are sticky, safe-area aware, and the alternatives, gaps, swatch, inputs, and buttons use smaller responsive dimensions and `clamp()` typography. Text keeps natural wrapping and is not clipped.

The mastery engine implements ordered first pass, mandatory review, clean-answer mastery, requeue-after-error, per-run session persistence, separate metrics, 3-point clean-review rewards, a 5-point day mastery bonus, a separate 10-point lesson bonus, and an explicit technical-skip blocked state.

Day 7 was confirmed to be the existing `onStartWeeklyTest` path, so it is reused as the final lesson review. A 100% final-mastery result persists the existing language-scoped test marker. The local progress update unlocks the next lesson immediately, and the primary completion action opens the next day, lesson, workbook, or workbook chooser according to the milestone.

The lesson celebration reuses the existing summary card and lightweight emoji/star/trophy treatment. Motion is guarded by `motion-safe`; failure of the visual effect cannot block navigation. No new sound, network asset, or parallel test was introduced.

## Verification

- Automated flow suite: 29 passing checks across source regression, completion/replay, mastery queue, student unlock/progression, speaking, and Workbook 1 normalization.
- Answer validation: 14 passing checks, including explicit answer-to-question writing prompts.
- Required queue example: 3 and 7 -> `[3,7]`; clean 3 -> `[7]`; wrong/correct 7 -> `[7]`; later clean 7 -> complete.
- Metrics example: 8/10 first-try = 80% initial accuracy; 10/10 mastered = 100% final mastery; four review attempts; unique progress remains 10/10.
- Browser: desktop 1280×800, low-height desktop 1280×600, tablet 768×1024, mobile 390×844, and low-height mobile 360×640. The 48 px confirmation button stayed inside the viewport in every case.
- Browser exercise coverage: four-option/long text, writing, listening, speaking/shadowing, and a 44×44 color swatch. The active Workbook 1 exercise schema has no content-image exercise, so an authored image case was not available for manual execution.
- Browser console: no errors during the tested flow.
- Production build: passed (`vite build`, 778 modules).
- Typecheck: no new errors; the command remains red because of 14 pre-existing errors in Battle, Workspace, the grammar-guide typing in `UI.tsx`, and workbook 5–7 data typing.

## Boundaries

No commit, push, deploy, Firebase configuration, authentication, LiveKit, placement, other application, or submodule change was made. The already-dirty `Learnendo-Lab` submodule was left untouched.
