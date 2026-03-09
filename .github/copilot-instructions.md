# Learnendo workspace instructions for AI coding agents

This repo contains two nearly‑identical React/Vite apps that deliver an English
practice workbook.  Agents should treat them as sibling projects with shared
patterns and keep changes in sync across both `apps/main` and `apps/wbk-5`.

## Big picture

* **Two apps** – `apps/main` (workbook‑1/mastery) and `apps/wbk-5` (workbook 5).
  They share the same structure, code and dependencies; the latter is a copy
  with a slightly different question set.  If you touch business logic, update
  both folders.
* **Tech stack** – React + TypeScript + Vite + Tailwind.  Each app has its own
  `package.json`, `vite.config.ts` and `tsconfig.json` but the build scripts
  are the same (`dev`, `build`, `preview`, `lint`).  Tailwind configuration
  lives at the workspace root (`tailwind.config.cjs`/`postcss.config.cjs`).
* **No tests** – `npm run lint` runs `tsc --noEmit` only.  Behaviour is verified
  manually in the browser; look for console logs such as `FINALIZE ISLAND
  CALLED` when debugging.

## Key files & components

* `types.ts` – shared domain types: `PracticeItem`, `UserProgress`, etc.
* `constants.tsx` – large hard‑coded question bank (`PRACTICE_ITEMS`), module
  metadata (`MODULE_NAMES`, `GRAMMAR_GUIDES`), and `LESSON_CONFIGS`.
  `PracticeModuleType` values are strings of the form `L{lesson}_TRACK{track}`.
  When adding a new lesson or track, append to this file and update
  `LESSON_CONFIGS` accordingly.
* `App.tsx` – application entry point.  Manages global state, routing between
  sections (`SectionType` enum), progress persistence, lesson/module selection,
  unlocking rules, and calls out to services.  There are two copies; they vary
  only in minor helpers (see comments about `sanitizeProgress`).
* `components/UI.tsx` – presentational components used by both apps
  (`Header`, `LearningPathView`, `PracticeSection`, etc.).  UI code contains
  project‑specific utilities such as `shuffle`, `applyAntiTranslate` and maps
  for colours/numbers.  This file is long – read it when adding new question
  types or altering interaction flow.
* `services/` – contains three files:
  * `firebase.ts` – initializes Firebase using hard‑coded config, exports
    `auth`, `db`, and helper functions `ensureAnonAuth`, `loginWithEmail`,
    `registerWithEmail`.  Anonymous auth is used by default; the app gracefully
    handles disabled anonymous sign‑in.
  * `db.ts` – Firestore wrapper with `saveAssessmentResult`; used after a
    completed island/lesson.  If `db` is not initialized the function is a
    no‑op (the app can run fully offline).
  * `ai.ts` – wraps `@google/genai`.  `evaluateResponse` generates a JSON
    score/feedback for speaking exercises.  The Vite config injects
    `process.env.API_KEY` from `GEMINI_API_KEY`.  The code handles rate limits
    and falls back to a placeholder message.

## Data flow & conventions

1. **Auth** – on start, `ensureAnonAuth()` is called; the returned `uid` is
   logged for debugging.  Admin bypass is triggered only when the anonymous
   login name exactly equals the `BYPASS_KEY` constant (`"Martins"`).
2. **Progress object** – stored in localStorage under the key
   `learnendo_v16_mastery`.  `sanitizeProgress` (different but equivalent in
   each app) normalizes incomplete/old data and *always strips* the
   `bypassActive` flag before saving.  Never persist bypass state.
   `virtualDayOffset` allows simulating future days for development.
3. **Lesson gating** – only one lesson can be completed per calendar day.
   `getTodayKey()` computes the ISO date plus `virtualDayOffset`.  Progress is
   an object keyed by lesson ID; each entry tracks `islandScores`,
   `islandDiamonds` and a `diamond` percentage.  `LearningPathView` uses
   `LESSON_CONFIGS` and per‑track weights baked in the UI to show locked/100%
   status.  Modules unlock only when the previous lesson is 100% mastered and
   the real day has advanced.  The admin bypass circumvents locking (exists
   purely for testers).
4. **Practice loop** – selecting a track builds `baseItems` from
   `PRACTICE_ITEMS` filtered by `moduleType`; state variables like `qState` and
   `logs` track answers.  `PracticeSection` displays one item at a time and
   supports types `speaking`, `multiple-choice`, `writing`, `identification`.
   Each item has `audioValue` (text, used for TTS), optional `displayValue` or
   `options`, and a canonical `correctValue` string.  For speaking
authenticated
   items the UI invokes `evaluateResponse` to get a score and feedback.
5. **Result persistence** – when an island finishes the app updates progress,
   increments streaks/ice counts, calculates diamond percentages, and calls
   `saveAssessmentResult` (Firestore) with an `AssessmentRecord` if `db` is
   available.  The same record is used to back the results dashboard.

## Build & development

```bash
# in either apps/main or apps/wbk-5
npm install      # installs dependencies (they are nearly identical)
npm run dev      # starts Vite dev server on port 3000, host 0.0.0.0
npm run build    # produces production assets
npm run preview  # serves built output locally
npm run lint     # type‑checks only

# main only
npm run deploy   # builds and publishes to Vercel (requires `vercel` CLI)
```

Environment variables are picked up from `.env` files or the shell.  Vite
configures `process.env.API_KEY` from `GEMINI_API_KEY` for use by `ai.ts`.

## Adding content or features

* **New practice items**: use the helper `createItems` in `constants.tsx` or
  append manually.  Keep the `moduleType` string consistent across the two
  apps.  Update `MODULE_NAMES`, `MODULE_ICONS` and `GRAMMAR_GUIDES` if needed.
* **Changing progress schema**: augment `sanitizeProgress` in both apps and
  bump the storage key version (currently `v16`).  Write a migration block
  inside `sanitizeProgress` to handle older shapes.
* **UI modifications**: most layout is in `components/UI.tsx`.  There are
  inline comments marked with `✅` or `Fix:` – these were places where bugs or
  improvements were flagged.  Preserve those comments if you change the
  surrounding logic.
* **Authentication flows**: only anonymous auth is exercised by default; if you
  need full login/register tests, call `loginWithEmail`/`registerWithEmail`
  from `firebase.ts`.

## Conventions & gotchas

* **BYPASS_KEY** is the only string that bypasses locking.  Do not hardcode
  other values or persist bypass state.  When writing tests, simulate bypass by
  naming the student `Martins` on the login screen.
* **Anti‑translate** – the app attempts to stop automatic translation by adding
  a `<meta name="google" content="notranslate">`.  If you touch head
  elements, maintain this logic.
* **Icons and assets** are loaded from `/public` or `/mascot.png`.  FontAwesome
  class names are used directly (`fas fa-lock`, etc.).
* **Progress gating uses real clock** – the app does not fake days in
  production.  `virtualDayOffset` only affects the local client; it is useful
  for manual QA but has no server side presence.
* **Localization** – there is no i18n system.  All copy is English; `TRANSLATIONS`
  in `UI.tsx` is an empty map used in earlier versions and may be removed.

## External dependencies and integration points

* **Firebase** – project `learnendo-6f4d3`.  Config is static.  Services include
  Firestore (`assessments` collection), Analytics (conditionally enabled) and
  Authentication.  `ensureAnonAuth` handles disabled anonymous sign‑in.
* **Google GenAI** – used for grading speaking tasks.  API key injected via
  Vite: `process.env.API_KEY`.  `ai.ts` expects the result to be a JSON string
  with `score` and `feedback`.  The code currently pins `gemini-3-pro-preview`.
  Error handling includes rate‑limit fallbacks.

## Maintenance notes

* When fixing a bug or adding a feature, check both `apps/main` and
  `apps/wbk-5` for duplicate code.  They are intentionally similar but will
  drift if only one is edited; keep them aligned or consider refactoring to a
  shared package (not currently in the repo).
* The repository has no build pipeline; CI (if added) needs to run
  `npm install && npm run lint` in both subfolders.
* Search for `// ✅` or `// Fix:` comments when exploring code; they often
  indicate where recent edits were made or known issues exist.

---

Feel free to ask follow‑up questions or point out areas that need clarification
(lesson unlocking logic, AI integration details, etc.).