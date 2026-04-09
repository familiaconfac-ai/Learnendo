/**
 * Lesson text parser – heuristic extraction of vocabulary, structures, and
 * exercises from plain text (typically extracted from a lesson PDF).
 *
 * ─── Strategy ────────────────────────────────────────────────────────────────
 *  1. Detect lesson title and number from the first lines
 *  2. If section headers are present (Vocabulary / Grammar / Exercises), parse
 *     each independently
 *  3. Otherwise apply global heuristics across all lines:
 *       – word–translation pairs  → vocabulary
 *       – numbered items + A/B/C/D options → exercises
 *       – lines with ___ or [PLACEHOLDER] → structures
 *  4. Infer topics/themes from detected vocabulary
 *
 * ─── Supported vocabulary pair formats ──────────────────────────────────────
 *   word – translation   (en-dash / em-dash / hyphen)
 *   word / translation   (slash)
 *   word → translation   (arrow)
 *   word = translation   (equals)
 *   word (translation)   (parenthesis)
 *
 * ─── Supported exercise formats ─────────────────────────────────────────────
 *   1. Question text          ← starts with "N." or "N)"
 *   A) Option one             ← letter-prefixed option lines
 *   B) Option two
 *   Answer: A                 ← answer line
 */

import type { ExerciseItem, VocabEntry, LessonStructure, LanguageCode } from '../types';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ParsedDraft {
  suggestedTitle: string;
  suggestedLessonNumber?: number;
  suggestedLanguage: LanguageCode;
  suggestedThemes: string[];
  vocabulary: VocabEntry[];
  structures: LessonStructure[];
  /** Raw exercises detected in the exercise section */
  exercises: ExerciseItem[];
}

export interface ParseOpts {
  packId: string;
  language?: LanguageCode;
  /** Pre-filled title from the import UI; used before text-based detection. */
  titleHint?: string;
}

// ─── Regexes ──────────────────────────────────────────────────────────────────

/** word – translation (any separator: en-dash, em-dash, hyphen, slash, arrow, equals) */
const VOCAB_SEP_RE = /^(.{1,40}?)\s*(?:–|—|-{1,2}|\/|→|=)\s*(.{1,80})$/;
/** word (translation) */
const VOCAB_PAREN_RE = /^(.{1,35}?)\s+\(([^)]{1,60})\)\s*$/;

/** "1. Question text" or "1) Question text" */
const EXERCISE_NUM_RE = /^(\d{1,2})[.)]\s+(.+)$/;
/** "A) option" through "D) option" (case-insensitive) */
const OPTION_RE = /^([A-Da-d])[.)]\s+(.+)$/;
/** "Answer: A" / "Correct: B" / "R: ..." / "Resposta: ..." */
const ANSWER_RE = /^(?:answer|correct|resp(?:osta)?|r(?:esposta)?)[.:\s]+(.+)/i;

/** Lesson number: "Lesson 1", "Lição 3", "Unit 2", "Aula 4" */
const LESSON_NUM_RE = /(?:lesson|li[cç][aã]o|unit|aula)\s+(\d+)/i;

/** Section header words (common in both English and Portuguese) */
const VOCAB_HDR_RE =
  /^(?:vocabulary|vocabul[aá]rio|words?|new\s+words?|gl[oó]ss[aá]rio)\s*:?\s*$/i;
const GRAMMAR_HDR_RE =
  /^(?:grammar|gram[aá]tica|structures?|language\s+notes?|padr[oõ]es?)\s*:?\s*$/i;
const EXERCISE_HDR_RE =
  /^(?:exercises?|exerc[ií]c?[ií]os?|practice|activities?|atividades?|pr[aá]tica|tasks?)\s*:?\s*$/i;

// ─── Theme keyword map ────────────────────────────────────────────────────────

const THEME_MAP: Record<string, string[]> = {
  greetings: [
    'hello', 'hi', 'good morning', 'good afternoon', 'good night', 'good evening',
    'goodbye', 'bye', 'hey',
  ],
  introductions: ['name', 'nice to meet', 'introduce', 'introduction', 'pleased'],
  'possessive pronouns': ['my', 'your', 'his', 'her', 'their', 'our'],
  numbers: [
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'number', 'count',
  ],
  family: [
    'father', 'mother', 'brother', 'sister', 'son', 'daughter', 'family', 'parent',
    'husband', 'wife',
  ],
  colors: [
    'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'purple',
    'color', 'colour',
  ],
  food: ['food', 'eat', 'drink', 'bread', 'water', 'rice', 'meat', 'fruit'],
  time: ['time', 'clock', 'hour', 'minute', 'morning', 'afternoon', 'evening', 'night'],
  verbs: ['verb', 'to be', 'to have', 'to go', 'to do', 'to make', 'to want'],
  'alphabet / spelling': ['letter', 'spell', 'alphabet', 'abc'],
};

// ─── Text normalization ───────────────────────────────────────────────────────

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse multiple spaces to single (common in PDF column extraction)
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// ─── Title / lesson number detection ─────────────────────────────────────────

function detectTitle(
  lines: string[],
  hint?: string,
): { title: string; lessonNumber?: number } {
  if (hint && hint.trim().length > 2) {
    const m = hint.match(LESSON_NUM_RE);
    return { title: hint.trim(), lessonNumber: m ? parseInt(m[1]) : undefined };
  }
  // Look through first 10 lines for a lesson-number marker
  for (const line of lines.slice(0, 10)) {
    const m = line.match(LESSON_NUM_RE);
    if (m) return { title: line, lessonNumber: parseInt(m[1]) };
  }
  // Fall back to the first reasonably-long line
  const fallback = lines.find((l) => l.length > 4) ?? 'Imported Lesson';
  return { title: fallback };
}

// ─── Section splitting ────────────────────────────────────────────────────────

interface Sections {
  vocabulary: string[];
  grammar: string[];
  exercises: string[];
  hasSectionHeaders: boolean;
}

function splitIntoSections(lines: string[]): Sections {
  const sections: Sections = {
    vocabulary: [],
    grammar: [],
    exercises: [],
    hasSectionHeaders: false,
  };
  type SKey = 'vocabulary' | 'grammar' | 'exercises';
  let current: SKey | null = null;

  for (const line of lines) {
    if (VOCAB_HDR_RE.test(line)) {
      current = 'vocabulary';
      sections.hasSectionHeaders = true;
      continue;
    }
    if (GRAMMAR_HDR_RE.test(line)) {
      current = 'grammar';
      sections.hasSectionHeaders = true;
      continue;
    }
    if (EXERCISE_HDR_RE.test(line)) {
      current = 'exercises';
      sections.hasSectionHeaders = true;
      continue;
    }
    if (current) sections[current].push(line);
  }

  // Without headers: run heuristics over all lines for both vocab and exercises
  if (!sections.hasSectionHeaders) {
    sections.vocabulary = lines;
    sections.exercises = lines;
  }

  return sections;
}

// ─── Vocabulary extraction ────────────────────────────────────────────────────

function extractVocab(lines: string[]): VocabEntry[] {
  const vocab: VocabEntry[] = [];
  const seen = new Set<string>();

  const tryAdd = (word: string, translation: string) => {
    word = word.trim();
    translation = translation.trim();
    const key = word.toLowerCase();
    if (
      word.length > 0 && word.length <= 40 &&
      translation.length > 0 && translation.length <= 80 &&
      !seen.has(key) &&
      // Skip lines that start with a digit (likely exercise numbers)
      !/^\d/.test(word) &&
      // Skip lines that look like sentences (contain verbs / full stops)
      !/[.!]$/.test(word)
    ) {
      seen.add(key);
      vocab.push({ word, translation });
    }
  };

  for (const line of lines) {
    // Prefer separator pattern over parenthesis (more common in lesson PDFs)
    const sepM = line.match(VOCAB_SEP_RE);
    if (sepM) { tryAdd(sepM[1], sepM[2]); continue; }

    const parenM = line.match(VOCAB_PAREN_RE);
    if (parenM) { tryAdd(parenM[1], parenM[2]); continue; }
  }

  return vocab;
}

// ─── Structure extraction ─────────────────────────────────────────────────────

function extractStructures(lines: string[]): LessonStructure[] {
  const structures: LessonStructure[] = [];

  for (const line of lines) {
    // Lines with ___blank___ or [PLACEHOLDER] → likely a structure pattern
    if (/_{2,}|\[[A-Z]{2,}\]/.test(line)) {
      // Normalise common possessive pronouns into [POSS] placeholder
      const pattern = line.replace(
        /\b(my|your|his|her|their|our)\b/gi,
        '[POSS]',
      );
      structures.push({ pattern, example: line });
    }
  }

  return structures;
}

// ─── Exercise extraction ──────────────────────────────────────────────────────

function extractExercises(lines: string[], packId: string): ExerciseItem[] {
  const items: ExerciseItem[] = [];
  let idx = 0;

  let pendingPrompt = '';
  let pendingOptions: string[] = [];
  let pendingAnswer = '';

  function flush() {
    if (!pendingPrompt.trim()) return;
    const item: ExerciseItem = {
      id: `imp-${packId}-${++idx}`,
      type: pendingOptions.length >= 2 ? 'multiple-choice' : 'fill-in',
      prompt: pendingPrompt.trim(),
      options: pendingOptions.length >= 2 ? [...pendingOptions] : undefined,
      correctAnswer: pendingAnswer.trim() || '(review needed)',
      audioText: pendingPrompt.trim(),
    };
    items.push(item);
    pendingPrompt = '';
    pendingOptions = [];
    pendingAnswer = '';
  }

  for (const line of lines) {
    // Answer line → capture and continue
    const ansM = line.match(ANSWER_RE);
    if (ansM) {
      pendingAnswer = ansM[1].trim();
      continue;
    }

    // Option line (A) / B) etc.)
    const optM = line.match(OPTION_RE);
    if (optM) {
      if (!pendingPrompt) pendingPrompt = line; // guard: shouldn't happen
      pendingOptions.push(optM[2].trim());
      continue;
    }

    // New numbered question → flush previous
    const numM = line.match(EXERCISE_NUM_RE);
    if (numM) {
      flush();
      pendingPrompt = numM[2].trim();
      continue;
    }

    // Short continuation line while we have a pending question (inline options)
    if (pendingPrompt && line.length < 100 && pendingOptions.length < 4) {
      // Only treat as an option if it doesn't look like a vocab pair
      if (!VOCAB_SEP_RE.test(line) && !VOCAB_PAREN_RE.test(line)) {
        pendingOptions.push(line);
      }
    }
  }
  flush();

  return items;
}

// ─── Theme inference ──────────────────────────────────────────────────────────

function inferThemes(words: string[]): string[] {
  const found = new Set<string>();
  const lowerWords = words.map((w) => w.toLowerCase());

  for (const [theme, keywords] of Object.entries(THEME_MAP)) {
    for (const kw of keywords) {
      if (lowerWords.some((w) => w.includes(kw) || kw.includes(w))) {
        found.add(theme);
        break;
      }
    }
  }

  return [...found];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseLessonText(text: string, opts: ParseOpts): ParsedDraft {
  const lines = normalizeLines(text);
  const { title, lessonNumber } = detectTitle(lines, opts.titleHint);
  const sections = splitIntoSections(lines);

  const vocabulary = extractVocab(sections.vocabulary);
  const structures = extractStructures(sections.grammar);
  const exercises = extractExercises(sections.exercises, opts.packId);

  const themeWords = [
    ...vocabulary.map((v) => v.word),
    title.toLowerCase(),
  ];
  const themes = inferThemes(themeWords);

  return {
    suggestedTitle: title,
    suggestedLessonNumber: lessonNumber,
    suggestedLanguage: opts.language ?? 'en',
    suggestedThemes: themes,
    vocabulary,
    structures,
    exercises,
  };
}
