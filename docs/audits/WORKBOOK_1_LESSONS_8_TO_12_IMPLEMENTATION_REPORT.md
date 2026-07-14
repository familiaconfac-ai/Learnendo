# Workbook 1 — Lessons 8–12 Implementation Report

**Date:** July 14, 2026  
**Scope:** Workbook 1 Lessons 8–12, their direct runtime export, editorial source, and read-only validation.  
**Explicitly preserved:** Lessons 1–7, Workbooks 2–9, placement, authentication, LiveKit, database, global layout, whiteboard rules, and real user data.

The pre-change state was registered with Git object hashes before editing. Lessons 1–7 were `1b6f880`, `c414cc3`, `1de5b8a`, `7fe1158`, `30ddccc`, `fc5059f`, and `f6b24c0`; the same hashes were obtained after all implementation and validation work.

## A. Executive summary

Lessons 8–12 were replaced with complete A1 content for Unit 2 — Everyday Communication Basics. Each lesson now has seven authored days and exactly 100 raw exercises in the official `15/15/15/10/15/15/15` distribution. The five lessons total 500 exercises.

The Workbook 1 export was minimally adjusted: Lessons 1–7 continue through the existing normalizer, while Lessons 8–12 are exported directly. Runtime comparison confirms exact JSON equivalence between each raw lesson and the lesson consumed by the app/whiteboard. No global normalizer behavior was changed.

The implementation includes vocabulary/recognition, grammar, questions and answers, at least two complete dialogues per lesson, speaking, writing, TTS listening, a coherent reading, 14 reading-linked activities, and cumulative review. The matching editorial source is `docs/content/workbook1/LESSONS_8_TO_12_EDITORIAL_SOURCE.md`.

## B. Pedagogical plan by lesson

### Lesson 8 — Spoken Patterns

- New: affirmative contractions; negative full and contracted forms; `is/isn't` and `are/aren't` listening contrast.
- Progression: recognize full/contracted forms → build negatives → answer confirmations → use dialogues → introduce/correct information orally → read → consolidate.
- Dialogues: meeting a classmate; confirming country, age, and readiness.
- Preparation: provides the natural spoken forms required by Lesson 9.

### Lesson 9 — Practical Speaking

- New: connected beginner interaction, response appropriateness, spelling/number exchange, confirmation and correction.
- Progression: choose a natural response → complete a line → reverse-match response/question → analyze three dialogues → produce mini-dialogues → read an interaction → consolidate.
- Dialogues: meeting someone; classroom information; confirming a relationship and phone number.
- Preparation: strengthens `when`, dates, birthdays, and schedules for Lesson 10.

### Lesson 10 — Months & Seasons

- New: spring/summer/fall-autumn/winter; `in/on/at` for A1 time expressions; explicit Northern Hemisphere framing.
- Progression: associate expression/preposition → complete contrasts → answer schedules → use birthday/trip dialogues → produce personal calendar language → read an annual calendar → consolidate.
- Dialogues: birthday and season; class trip, date, time, and season.
- Preparation: expands calendar questions for Lesson 11.

### Lesson 11 — Asking Questions

- New: `what`, `who`, `where`, `when`, `how old`, and question order with `to be`.
- Progression: identify question expression → reorder questions → match answers → use person/place/time dialogues → ask and answer orally → read → consolidate.
- Dialogues: meeting a new student; asking about a person, location, and class time.
- Preparation: supports the small set of contextual past questions used in Lesson 12.

### Lesson 12 — Past Tense Regular Verbs

- New: recognition/writing of regular `-ed`; pronunciation `/t/`, `/d/`, `/ɪd/` based on final sound.
- Progression: recognize form → write form → classify sound → use two yesterday dialogues → pronounce contextual sentences → read a school-day account → consolidate.
- Dialogues: yesterday in class; a library visit after class.
- Scope control: `did` appears only as dialogue support; irregular verbs and a full simple-past system are not taught.

## C. Previous content reviewed

All five lessons deliberately recycle Unit 1 and early Unit 2 content: letters/spelling, cardinal and ordinal numbers, identification, personal information, greetings, affirmative `to be`, days, months, dates, age, country, classroom roles, and initial communicative patterns.

The reuse changes context and demand rather than copying old exercises. Examples include spelling inside a real class-list exchange, ordinals inside dates, contractions inside correction, and calendar language inside WH-questions and a past school-day reading.

## D. New content introduced

| Lesson | New curricular core |
|---:|---|
| 8 | full vs contracted affirmative/negative `to be` in natural speech |
| 9 | structured real-life A1 dialogue management |
| 10 | seasons and basic `in/on/at` time expressions |
| 11 | WH-questions with `to be` |
| 12 | regular past recognition and three `-ed` pronunciations |

## E. Distribution of the 100 exercises

Every lesson has the same approved distribution:

| Lesson | D1 | D2 | D3 | D4 | D5 | D6 | D7 | Total |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 |
| 9 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 |
| 10 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 |
| 11 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 |
| 12 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 |
| **Total** | **75** | **75** | **75** | **50** | **75** | **75** | **75** | **500** |

IDs are deterministic and stable: `wb1_l{lesson}_d{day}_e{exercise}`. Validation found zero duplicates.

## F. Exercise types used

| Lesson | Identification | Multiple choice | Writing | Speaking | Total |
|---:|---:|---:|---:|---:|---:|
| 8 | 8 | 49 | 13 | 30 | 100 |
| 9 | 15 | 41 | 20 | 24 | 100 |
| 10 | 15 | 43 | 20 | 22 | 100 |
| 11 | 15 | 43 | 19 | 23 | 100 |
| 12 | 15 | 42 | 20 | 23 | 100 |

Only types supported by the active `Exercise` interface were used. Complete dialogues use speaking/listening plus visible dialogue text because the nominal `dialogue` type has no clear dedicated rendering path in both active interfaces. No new exercise component was introduced.

All objective questions have four unique alternatives and contain their `correctValue`. Across 286 objective questions, correct positions are distributed A/B/C/D as `80/75/70/61`; no answer is concentrated exclusively in A/B.

## G. Speaking and listening

Speaking targets contain a natural full sentence and, where valid, `acceptedAnswers` for full/contracted equivalents. Contraction-specific prompts keep the requested contraction as primary. Negative forms accept both standard alternatives when the objective permits them.

Listening follows the repository’s actual convention: `audioValue` is pronounceable text for browser/API TTS. No MP3/WAV/OGG or URL is declared. External recorded audios pending: **none**. Browser speech support and voice quality remain environmental dependencies.

Lesson 12 uses Unicode `/ɪd/`, not the previously corrupted encoding, and classifies the ending by sound rather than written letter.

## H. Reading

Each lesson has one coherent A1 text with beginning, development, and conclusion:

- L8: new students practicing full forms and contractions;
- L9: a new classmate interaction;
- L10: a 2026 calendar with hemisphere-qualified seasons;
- L11: students asking a new classmate varied questions;
- L12: a past school-day account using regular verbs.

Each Day 6 contains the full text plus 14 linked exercises, satisfying the requested range of 10–18. The questions cover explicit information, grammar/vocabulary in context, and lesson structures.

## I. Integration with app and whiteboard

The active chain remains `workbook1/index.ts → workbookRegistry.ts → courseRegistry.ts`. The app and whiteboard therefore receive the same lesson objects.

A local runtime harness loaded Workbook 1 through `loadWorkbookForWhiteboard('english', 1)`, resolved all five lessons and all 35 days using the production whiteboard resolver, and built 35 lesson boards. Every board retained the expected lesson/day source IDs and contained the expected 10 or 15 blocks. Invalid boards: **0**.

The local Vite application loaded at `127.0.0.1:4175` with no browser console errors. Interactive catalog/lesson/progress testing was blocked by the legitimate authentication screen. No real login was used and no account was created, because that would touch real authentication/data. Consequently:

- module loading, build, app boot, registry integration, whiteboard loading and board construction are confirmed;
- authenticated clicks, completion persistence, return-to-whiteboard state, microphone recognition, and real progress writes are **not claimed as end-to-end tested**;
- stable lesson/day/exercise IDs and unchanged progress consumers were statically verified, but existing progress has no curricular `contentVersion`.

## J. Raw versus normalized equivalence

Workbook 1’s index now normalizes only L1–L7 and appends raw L8–L12 directly. This is the smallest scope-safe change because it does not alter the shared normalizer or any other book.

For each of L8–L12, a JSON deep comparison between the imported raw lesson and `workbook1.lessons[7..11]` returned true. Therefore:

- raw total = runtime total = 100;
- day counts are identical;
- order and IDs are identical;
- no exercise is added, repeated, cut, moved, or converted;
- instructions, alternatives, accepted answers, TTS text, and semantics are identical.

## K. Limitations and pending items

- The repository still has 15 preexisting TypeScript errors outside this scope. `npm run lint` is the project’s `tsc --noEmit`; it fails on those same 15 errors but reports none in the changed files.
- There is no separate automated content-test command in `package.json`; a temporary runtime validator was used and removed after execution.
- Authenticated browser E2E, persistence, microphone permissions, multiuser whiteboard sync, and existing-session snapshot migration were not exercised to avoid real data.
- Existing whiteboard sessions may retain old snapshot blocks until recreated/reseeded.
- TTS output depends on browser/API voice availability; no studio-recorded audio was requested or added.
- L1–L7 remain intentionally unchanged, including their known curricular and normalization issues.

## L. Recommended next step

Conduct a teacher/editor review of each new lesson in a safe authenticated local/emulator environment, focusing on spoken-answer tolerance, voice pronunciation, pacing, and mobile readability. After approval, freeze a content version and use `LESSONS_8_TO_12_EDITORIAL_SOURCE.md` to produce the four-page PDF layouts. Do not revise L1–L7 as part of that review without a separate migration plan.

## Technical validation results

| Check | Result |
|---|---|
| Raw count | 100 per lesson; 500 total |
| Day distribution | 15/15/15/10/15/15/15 in all lessons |
| Duplicate IDs | 0 |
| Missing required fields | 0 |
| Invalid choice sets/correct answers | 0 |
| External/broken audio references | 0 |
| Raw/runtime equivalence | exact for all five lessons |
| Whiteboard loader | Workbook 1 loaded |
| Whiteboard boards | 35 built; 0 invalid |
| Typecheck/lint before | 15 preexisting errors |
| Typecheck/lint after | same 15; 0 new errors |
| Production build | passed; 772 modules transformed |
| Local app boot | passed; HTTP 200; no browser console errors |
| Authenticated E2E/progress persistence | not executed; authentication/data safety limitation |

## Files changed

- `apps/main/src/data/workbook1/lesson8.ts`
- `apps/main/src/data/workbook1/lesson9.ts`
- `apps/main/src/data/workbook1/lesson10.ts`
- `apps/main/src/data/workbook1/lesson11.ts`
- `apps/main/src/data/workbook1/lesson12.ts`
- `apps/main/src/data/workbook1/lessonBuilder.ts`
- `apps/main/src/data/workbook1/index.ts`
- `docs/content/workbook1/LESSONS_8_TO_12_EDITORIAL_SOURCE.md`
- `docs/audits/WORKBOOK_1_LESSONS_8_TO_12_IMPLEMENTATION_REPORT.md`

No commit or production deployment was performed.
