import type { Exercise } from '../../types.ts';

export type NumberFormat = 'digits' | 'words' | 'mixed' | 'unknown';

export interface NumberRecognitionValidation {
  valid: boolean;
  issues: string[];
  displayFormat: NumberFormat;
  optionsFormat: NumberFormat;
  audioTarget: number | null;
  displayTarget: number | null;
  correctTarget: number | null;
  targetNumber: number | null;
}

const NUMBER_VALUES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const PEDAGOGICAL_CONTRAST_VALUES: Record<number, number[]> = {
  0: [0, 1, 10, 20], 1: [1, 7, 11, 10], 2: [2, 12, 20, 10], 3: [3, 13, 8, 18],
  4: [4, 14, 40, 44], 5: [5, 15, 50, 55], 6: [6, 16, 60, 66], 7: [7, 17, 70, 77],
  8: [8, 18, 80, 88], 9: [9, 19, 90, 99], 10: [10, 0, 11, 20], 11: [1, 11, 12, 20],
  12: [2, 12, 20, 11], 13: [3, 13, 30, 33], 14: [4, 14, 40, 44], 15: [5, 15, 50, 55],
  16: [6, 16, 60, 66], 17: [7, 17, 70, 77], 18: [8, 18, 80, 88], 19: [9, 19, 90, 99],
  20: [2, 20, 12, 10],
};

const normalize = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, ' ');

export function parseNumberValue(value = ''): number | null {
  const normalized = normalize(value).trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (NUMBER_VALUES[normalized] != null) return NUMBER_VALUES[normalized];
  const [tens, units] = normalized.split('-');
  if (units && NUMBER_VALUES[tens] != null && NUMBER_VALUES[units] != null) return NUMBER_VALUES[tens] + NUMBER_VALUES[units];
  return null;
}

export function detectNumberFormat(value = ''): NumberFormat {
  const normalized = normalize(value).trim();
  if (/^\d+$/.test(normalized)) return 'digits';
  if (parseNumberValue(normalized) != null) return 'words';
  if (/\d/.test(normalized) && /[a-z]/.test(normalized)) return 'mixed';
  return 'unknown';
}

function detectOptionsFormat(options: string[]): NumberFormat {
  const formats = new Set(options.map(detectNumberFormat));
  return formats.size === 1 ? [...formats][0] : 'mixed';
}

function audioNumber(audioValue: string): number | null {
  const normalized = normalize(audioValue);
  const explicit = normalized.match(/\bnumber\s+([a-z]+(?:-[a-z]+)?|\d+)\b/)?.[1];
  if (explicit) return parseNumberValue(explicit);
  const first = normalized.match(/^([a-z]+(?:-[a-z]+)?|\d+)\b/)?.[1];
  return first ? parseNumberValue(first) : null;
}

export function validateNumberRecognitionExercise(exercise: Exercise): NumberRecognitionValidation {
  const options = exercise.options ?? [];
  const displayFormat = detectNumberFormat(exercise.displayValue ?? '');
  const optionsFormat = detectOptionsFormat(options);
  const audioTarget = audioNumber(exercise.audioValue);
  const displayTarget = parseNumberValue(exercise.displayValue ?? '');
  const correctTarget = parseNumberValue(exercise.correctValue);
  const issues: string[] = [];
  const sameFormat = displayFormat === optionsFormat && ['digits', 'words'].includes(displayFormat);

  if (sameFormat && !exercise.formatJustification) issues.push('same-display-and-options-format');
  if (displayFormat === 'digits' && optionsFormat !== 'words') issues.push('numeric-display-requires-word-options');
  if (displayFormat === 'words' && optionsFormat !== 'digits') issues.push('word-display-requires-numeric-options');
  if (normalize(exercise.displayValue) === normalize(exercise.correctValue)) issues.push('correct-answer-revealed-by-display');
  if (options.length !== 4) issues.push('requires-four-options');
  if (new Set(options.map(normalize)).size !== options.length) issues.push('options-must-be-unique');
  if (!options.includes(exercise.correctValue)) issues.push('correct-answer-missing-from-options');
  if (audioTarget == null || displayTarget == null || correctTarget == null) issues.push('unparseable-number-value');
  else if (audioTarget !== displayTarget || audioTarget !== correctTarget) issues.push('audio-display-correct-target-mismatch');
  if (audioTarget != null && PEDAGOGICAL_CONTRAST_VALUES[audioTarget]) {
    const actual = options.map(parseNumberValue).filter((value): value is number => value != null).sort((a, b) => a - b);
    const expected = [...PEDAGOGICAL_CONTRAST_VALUES[audioTarget]].sort((a, b) => a - b);
    if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
      issues.push('inadequate-number-distractors');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    displayFormat,
    optionsFormat,
    audioTarget,
    displayTarget,
    correctTarget,
    targetNumber: audioTarget === displayTarget && audioTarget === correctTarget ? audioTarget : null,
  };
}
