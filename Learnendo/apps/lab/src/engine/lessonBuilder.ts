/**
 * Lesson Builder – Pedagogical Expansion Engine
 *
 * Generates supplementary exercise items from a LessonPack's vocabulary
 * and structures. The items produced here are ADDITIVE — they complement
 * the hand-crafted items in the pack without duplicating them.
 *
 * ─── Possessive pronoun expansion rules ──────────────────────────────────────
 *
 *   Singular: my, your, his, her  →  verb "is",  noun "name"  (singular)
 *   Plural  : their, our          →  verb "are", noun "names" (plural)
 *
 *   Input pattern : "What's [POSS] name?"
 *   Generated     : "What's my name?"   (singular)
 *                   "What's your name?" (singular)
 *                   "What's his name?"  (singular)
 *                   "What's her name?"  (singular)
 *                   "What are their names?" (plural — verb + noun change)
 */
import type { LessonPack, ExerciseItem, VocabEntry, LessonStructure } from '../types';

// ─── Pronoun sets ──────────────────────────────────────────────────────────────

export const POSS_SINGULAR = ['my', 'your', 'his', 'her'] as const;
export const POSS_PLURAL = ['their', 'our'] as const;
export const POSS_ALL = [...POSS_SINGULAR, ...POSS_PLURAL] as const;

export type PossPronoun = (typeof POSS_ALL)[number];

// ─── Pattern expanders ────────────────────────────────────────────────────────

/**
 * Replaces [POSS] in a pattern with the given pronoun.
 * Automatically uses the plural version of the pattern for "their"/"our".
 */
export function applyPronoun(
  singularPattern: string,
  pluralPattern: string,
  poss: PossPronoun,
): string {
  const isPlural = (POSS_PLURAL as readonly string[]).includes(poss);
  const base = isPlural ? pluralPattern : singularPattern;
  return base.replace(/\[POSS\]/g, poss);
}

/**
 * Expands a pair of patterns (singular / plural) across all possessive pronouns.
 * Returns one result object per pronoun.
 *
 * @example
 * expandPossessives("What's [POSS] name?", "What are [POSS] names?")
 * // → [{poss:'my', sentence:"What's my name?", isPlural:false}, ...]
 */
export function expandPossessives(
  singularPattern: string,
  pluralPattern = singularPattern,
): { poss: PossPronoun; sentence: string; isPlural: boolean }[] {
  return POSS_ALL.map((poss) => {
    const isPlural = (POSS_PLURAL as readonly string[]).includes(poss);
    return {
      poss,
      sentence: applyPronoun(singularPattern, pluralPattern, poss),
      isPlural,
    };
  });
}

// ─── Vocabulary exercise builder ──────────────────────────────────────────────

/**
 * Generates multiple-choice "What does X mean?" items from a vocabulary list.
 * Uses other entries in the list as distractors.
 */
export function buildVocabRecognition(vocab: VocabEntry[], packId: string): ExerciseItem[] {
  if (vocab.length < 2) return [];
  return vocab.map((entry, i) => {
    // Use up to 3 other translations as distractors
    const distractors = vocab
      .filter((_, j) => j !== i)
      .slice(0, 3)
      .map((d) => d.translation);
    while (distractors.length < 3) distractors.push('—');
    const options = localShuffle([entry.translation, ...distractors]);
    const item: ExerciseItem = {
      id: `${packId}-vr-${i}`,
      type: 'multiple-choice',
      prompt: `What does "${entry.word}" mean?`,
      options,
      correctAnswer: entry.translation,
      audioText: entry.word,
      voiceLang: 'en-US',
    };
    if (entry.example) item.explanation = `Example: "${entry.example}"`;
    return item;
  });
}

/**
 * Generates fill-in-the-blank pronoun drills from a [POSS] structure.
 *
 * For each variant of "What's [POSS] name?" the student must fill in the
 * correct possessive pronoun given a contextual hint.
 */
export function buildStructureFillIns(
  structure: LessonStructure,
  packId: string,
  baseIdx: number,
): ExerciseItem[] {
  if (!structure.pattern.includes('[POSS]')) return [];

  const descriptions: Record<string, string> = {
    my: 'you, speaking about yourself',
    your: 'talking directly to someone',
    his: 'a boy or man',
    her: 'a girl or woman',
    their: 'a group of people',
    our: 'you and others together',
  };

  return POSS_ALL.map((poss, j) => {
    const filled = structure.pattern.replace(/\[POSS\]/gi, '___');
    const desc = descriptions[poss] ?? poss;
    const capitalized = poss.charAt(0).toUpperCase() + poss.slice(1);
    return {
      id: `${packId}-sf-${baseIdx}-${j}`,
      type: 'fill-in' as const,
      prompt: `"${filled}" (${desc})`,
      correctAnswer: capitalized,
      alternatives: [poss],
      explanation: `Use "${poss}" when referring to ${desc}.`,
    };
  });
}

// ─── Full lesson expander ─────────────────────────────────────────────────────

/**
 * Generates supplementary items for a lesson pack based on its
 * vocabulary and structures fields. Returns new items with distinct IDs
 * so they can be safely combined with pack.items without collision.
 */
export function generateSupplementaryItems(pack: LessonPack): ExerciseItem[] {
  const items: ExerciseItem[] = [];

  if (pack.vocabulary && pack.vocabulary.length >= 2) {
    items.push(...buildVocabRecognition(pack.vocabulary, pack.id));
  }

  if (pack.structures) {
    pack.structures.forEach((structure, i) => {
      items.push(...buildStructureFillIns(structure, pack.id, i));
    });
  }

  return items;
}

/**
 * Returns the complete exercise set for a lesson:
 * the hand-crafted items + all auto-generated supplementary items.
 * Deduplicates by ID (hand-crafted items take precedence).
 */
export function buildFullLessonItems(pack: LessonPack): ExerciseItem[] {
  const supplement = generateSupplementaryItems(pack);
  const existingIds = new Set(pack.items.map((i) => i.id));
  const unique = supplement.filter((i) => !existingIds.has(i.id));
  return [...pack.items, ...unique];
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function localShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
