/**
 * Normalizes multiple-choice text only for equality and uniqueness checks.
 * Stored and displayed values must keep their original spelling and punctuation.
 */
export function normalizeAnswerForComparison(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function findMatchingAlternativeIndex(
  alternatives: readonly unknown[],
  correctAnswer: unknown,
): number {
  const normalizedAnswer = normalizeAnswerForComparison(correctAnswer);
  if (!normalizedAnswer) return -1;
  return alternatives.findIndex(
    (alternative) => normalizeAnswerForComparison(alternative) === normalizedAnswer,
  );
}

export function hasMatchingAlternative(
  alternatives: readonly unknown[],
  correctAnswer: unknown,
): boolean {
  return findMatchingAlternativeIndex(alternatives, correctAnswer) >= 0;
}

export function hasDuplicateAlternatives(alternatives: readonly unknown[]): boolean {
  const normalized = alternatives.map(normalizeAnswerForComparison);
  return new Set(normalized).size !== normalized.length;
}
