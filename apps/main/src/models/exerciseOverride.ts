import type { Exercise } from '../types';
import { hasDuplicateAlternatives, hasMatchingAlternative } from '../utils/multipleChoiceAnswer.ts';

export const EXERCISE_OVERRIDE_LANGUAGES = ['en', 'pt', 'es', 'el', 'he'] as const;
export const EXERCISE_OVERRIDE_STATUSES = ['draft', 'published', 'archived', 'disabled'] as const;
export const EXERCISE_OPTION_LIMITS = Object.freeze({ min: 2, max: 10, maxCharacters: 500 });
export type ExerciseOverrideStatus = typeof EXERCISE_OVERRIDE_STATUSES[number];
export type ExerciseEditorialStatus = 'original' | 'draft' | 'published' | 'disabled';

export type ExerciseOverrideFields = Partial<Pick<Exercise,
  'instruction' | 'displayValue' | 'audioValue' | 'audioValueBeforeAnswer' |
  'fullSentenceAfterAnswer' | 'options' | 'correctValue' | 'acceptedAnswers' |
  'acceptedQuestions' | 'translation' | 'imageUrl' | 'imagePath' | 'imageAlt' |
  'feedbackCorrect' | 'feedbackIncorrect' | 'explanation'
>>;

export interface ExerciseIdentity {
  exerciseId: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
  language: string;
  exerciseType: Exercise['type'];
}

export interface ExerciseEditorialDocument extends ExerciseIdentity {
  status: ExerciseOverrideStatus;
  version: number;
  override: ExerciseOverrideFields;
  changeReason: string;
  adminNote: string;
  relatedReportId?: string | null;
  baseVersion: number;
  draftRevision?: number;
  updatedAt?: unknown;
  updatedBy: string;
  publishedAt?: unknown;
  publishedBy?: string;
}

export interface PublishedExerciseOverride extends ExerciseIdentity {
  status: 'published' | 'disabled';
  version: number;
  override: ExerciseOverrideFields;
  publishedAt?: unknown;
}

export function normalizeExerciseWorkbookId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const match = value.trim().match(/^(?:wb)?(\d+)$/i);
    if (match) return Number(match[1]);
  }
  return Number.NaN;
}

const ALLOWED_KEYS = new Set<keyof ExerciseOverrideFields>([
  'instruction', 'displayValue', 'audioValue', 'audioValueBeforeAnswer',
  'fullSentenceAfterAnswer', 'options', 'correctValue', 'acceptedAnswers',
  'acceptedQuestions', 'translation', 'imageUrl', 'imagePath', 'imageAlt',
  'feedbackCorrect', 'feedbackIncorrect', 'explanation',
]);

export function sanitizeExerciseOverride(value: unknown): ExerciseOverrideFields {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.has(key as keyof ExerciseOverrideFields) || field === undefined) continue;
    if (Array.isArray(field)) result[key] = field.filter((item): item is string => typeof item === 'string').slice(0, key === 'options' ? EXERCISE_OPTION_LIMITS.max + 1 : 100);
    else if (typeof field === 'string') result[key] = field;
  }
  return result as ExerciseOverrideFields;
}

export function parseExerciseOptions(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter((item) => item.length > 0);
}

export function getExerciseEditorialStatus(state: {
  draft?: ExerciseEditorialDocument | null;
  published?: ExerciseEditorialDocument | null;
}): ExerciseEditorialStatus {
  if (state.draft) return 'draft';
  if (state.published?.status === 'disabled') return 'disabled';
  if (state.published?.status === 'published') return 'published';
  return 'original';
}

export function validateExerciseOverride(
  original: Exercise,
  identity: ExerciseIdentity,
  fields: ExerciseOverrideFields,
): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(identity.workbookId) || identity.workbookId < 1 || identity.workbookId > 100) {
    errors.push('O ID do livro deve ser um número inteiro entre 1 e 100.');
  }
  if (original.id !== identity.exerciseId) errors.push('O ID não corresponde ao exercício original.');
  if (original.type !== identity.exerciseType) errors.push('O tipo do exercício não pode ser alterado.');
  if (!EXERCISE_OVERRIDE_LANGUAGES.includes(identity.language as typeof EXERCISE_OVERRIDE_LANGUAGES[number])) errors.push('Idioma inválido.');
  const answer = fields.correctValue ?? original.correctValue;
  const rawOptions = fields.options ?? original.options ?? [];
  const optionsAreStrings = Array.isArray(rawOptions) && rawOptions.every((item) => typeof item === 'string');
  const options = optionsAreStrings ? rawOptions.map((item) => item.trim()) : [];
  if (typeof answer !== 'string' || !answer.trim()) errors.push('O exercício não pode ser publicado sem resposta principal.');
  if (original.type === 'multiple-choice') {
    if (!optionsAreStrings || options.some((item) => !item)) errors.push('As alternativas devem ser textos preenchidos.');
    if (options.length < EXERCISE_OPTION_LIMITS.min) errors.push(`Informe pelo menos ${EXERCISE_OPTION_LIMITS.min} alternativas.`);
    if (options.length > EXERCISE_OPTION_LIMITS.max) errors.push(`Informe no máximo ${EXERCISE_OPTION_LIMITS.max} alternativas.`);
    if (options.some((item) => item.length > EXERCISE_OPTION_LIMITS.maxCharacters)) errors.push(`Cada alternativa deve ter no máximo ${EXERCISE_OPTION_LIMITS.maxCharacters} caracteres.`);
    if (typeof answer === 'string' && !hasMatchingAlternative(options, answer)) errors.push('A resposta principal precisa estar entre as alternativas.');
    if (hasDuplicateAlternatives(options)) errors.push('Existem alternativas repetidas.');
  }
  if ((fields.acceptedAnswers?.length ?? 0) > 100) errors.push('A lista de respostas aceitas excede o limite de 100 itens.');
  if (fields.imageUrl?.startsWith('blob:')) errors.push('A prévia local da imagem não pode ser publicada. Aguarde o upload para o Firebase Storage.');
  if (fields.imageUrl && !fields.imageUrl.startsWith('https://')) errors.push('A URL da imagem publicada deve usar HTTPS.');
  if (fields.imagePath && !fields.imagePath.startsWith('exercise-images/')) errors.push('O caminho da imagem não pertence ao diretório editorial permitido.');
  for (const [key, field] of Object.entries(fields)) {
    if (typeof field === 'string' && field.length > 10_000) errors.push(`${key}: texto excede 10.000 caracteres.`);
  }
  return errors;
}

export function applyExerciseOverride(original: Exercise, published: PublishedExerciseOverride | null | undefined): Exercise {
  if (!published || published.exerciseId !== original.id) return original;
  if (published.exerciseType !== original.type) return original;
  const safe = sanitizeExerciseOverride(published.override);
  return {
    ...original,
    ...safe,
    id: original.id,
    type: original.type,
    editorialDisabled: published.status === 'disabled',
  };
}

export function diffExerciseOverride(original: Exercise, edited: ExerciseOverrideFields): ExerciseOverrideFields {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sanitizeExerciseOverride(edited))) {
    const originalValue = original[key as keyof Exercise];
    if (JSON.stringify(value) !== JSON.stringify(originalValue ?? (Array.isArray(value) ? [] : ''))) result[key] = value;
  }
  return result as ExerciseOverrideFields;
}
