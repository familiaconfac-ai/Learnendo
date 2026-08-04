import type { Exercise } from '../types';
import { hasDuplicateAlternatives, hasMatchingAlternative } from '../utils/multipleChoiceAnswer.ts';

export const ADMIN_EXERCISE_SCHEMA_VERSION = 1 as const;
export const ADMIN_EXERCISE_COLLECTION = 'adminExercises';
export const ADMIN_EXERCISE_DRAFT_COLLECTION = 'adminExerciseDrafts';
export const PUBLISHED_EXERCISE_COLLECTION = 'publishedExercises';
export const ADMIN_EXERCISE_LANGUAGES = ['en', 'pt', 'es', 'el', 'he'] as const;
export const ADMIN_EXERCISE_COURSES = [
  'english', 'spanish', 'portuguese_native', 'portuguese_foreigners',
  'greek_koine', 'hebrew_biblical', 'bible_language_track',
] as const;
export const ADMIN_EXERCISE_SPEECH_LANGUAGES = [
  'en', 'en-US', 'pt', 'pt-BR', 'es', 'es-ES', 'el', 'el-GR', 'he', 'he-IL',
] as const;
export const ADMIN_EXERCISE_OPTION_LIMITS = Object.freeze({ min: 2, max: 10, maxCharacters: 500 });
export const ADMIN_EXERCISE_TEXT_LIMIT = 10_000;
export const ADMIN_EXERCISE_IMAGE_URL_LIMIT = 2_048;

export type AdminExerciseLanguage = typeof ADMIN_EXERCISE_LANGUAGES[number];
export type AdminExerciseCourseId = typeof ADMIN_EXERCISE_COURSES[number];
export type AdminExerciseStatus = 'draft' | 'published' | 'disabled';
export type AdminExerciseVersionStatus = 'published' | 'disabled';

export interface AdminExerciseContent {
  instruction: string;
  displayValue: string;
  audioValue: string;
  speechLanguage: string;
  options: string[];
  correctValue: string;
  acceptedAnswers: string[];
  translation: string;
  imageUrl: string;
  imageAlt: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
  explanation: string;
}

export interface AdminExerciseIdentity {
  schemaVersion: typeof ADMIN_EXERCISE_SCHEMA_VERSION;
  exerciseId: string;
  origin: 'admin';
  courseId: string;
  language: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
  type: 'multiple-choice';
}

export interface AdminExerciseCanonical extends AdminExerciseIdentity {
  status: AdminExerciseStatus;
  currentVersion: number;
  draftRevision: number;
  createdAt?: unknown;
  createdBy: string;
  updatedAt?: unknown;
  updatedBy: string;
  publishedAt?: unknown;
  publishedBy?: string;
  changeReason: string;
  adminNote: string;
  relatedReportId: string | null;
  duplicatedFromExerciseId: string | null;
}

export interface AdminExerciseDraft extends AdminExerciseIdentity {
  status: 'draft';
  baseVersion: number;
  draftRevision: number;
  content: AdminExerciseContent;
  imageValidation: { validatedUrl: string; validatedAt: string } | null;
  changeReason: string;
  adminNote: string;
  relatedReportId: string | null;
  duplicatedFromExerciseId: string | null;
  updatedAt?: unknown;
  updatedBy: string;
}

export interface AdminExerciseVersion extends AdminExerciseIdentity {
  status: AdminExerciseVersionStatus;
  version: number;
  content: AdminExerciseContent;
  changeReason: string;
  adminNote: string;
  relatedReportId: string | null;
  duplicatedFromExerciseId: string | null;
  publishedAt?: unknown;
  publishedBy: string;
}

export interface PublishedAdminExercise extends AdminExerciseIdentity, AdminExerciseContent {
  version: number;
  publishedAt?: unknown;
}

export interface AdminExerciseState {
  canonical: AdminExerciseCanonical;
  draft: AdminExerciseDraft | null;
  published: PublishedAdminExercise | null;
}

export const emptyAdminExerciseContent = (language = 'en'): AdminExerciseContent => ({
  instruction: '', displayValue: '', audioValue: '', speechLanguage: language,
  options: [], correctValue: '', acceptedAnswers: [], translation: '', imageUrl: '',
  imageAlt: '', feedbackCorrect: '', feedbackIncorrect: '', explanation: '',
});

export function generateAdminExerciseId(): string {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return `ex_${uuid}`;
}

export function normalizeAdminExerciseContent(value: Partial<AdminExerciseContent>): AdminExerciseContent {
  const stringValue = (field: unknown) => typeof field === 'string' ? field : '';
  return {
    instruction: stringValue(value.instruction), displayValue: stringValue(value.displayValue),
    audioValue: stringValue(value.audioValue), speechLanguage: stringValue(value.speechLanguage),
    options: Array.isArray(value.options) ? value.options.filter((item): item is string => typeof item === 'string').slice(0, ADMIN_EXERCISE_OPTION_LIMITS.max) : [],
    correctValue: stringValue(value.correctValue),
    acceptedAnswers: Array.isArray(value.acceptedAnswers) ? value.acceptedAnswers.filter((item): item is string => typeof item === 'string').slice(0, 100) : [],
    translation: stringValue(value.translation), imageUrl: stringValue(value.imageUrl),
    imageAlt: stringValue(value.imageAlt), feedbackCorrect: stringValue(value.feedbackCorrect),
    feedbackIncorrect: stringValue(value.feedbackIncorrect), explanation: stringValue(value.explanation),
  };
}

export function parseAdminExerciseOptions(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, ADMIN_EXERCISE_OPTION_LIMITS.max);
}

export function validateExternalImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > ADMIN_EXERCISE_IMAGE_URL_LIMIT) return 'A URL da imagem deve ter no máximo 2.048 caracteres.';
  let parsed: URL;
  try { parsed = new URL(trimmed); }
  catch { return 'Informe uma URL de imagem válida.'; }
  if (parsed.protocol !== 'https:') return 'A imagem deve usar uma URL HTTPS.';
  if (!parsed.hostname) return 'A URL da imagem precisa ter um domínio.';
  if (parsed.username || parsed.password) return 'A URL da imagem não pode conter credenciais.';
  return null;
}

export function validateAdminExerciseForPublication(input: {
  identity: Omit<AdminExerciseIdentity, 'schemaVersion' | 'origin'>;
  content: AdminExerciseContent;
  changeReason: string;
  imageValidated?: boolean;
}): string[] {
  const { identity, content } = input;
  const errors: string[] = [];
  if (!ADMIN_EXERCISE_COURSES.includes(identity.courseId as AdminExerciseCourseId)) errors.push('Curso inválido.');
  if (!ADMIN_EXERCISE_LANGUAGES.includes(identity.language as AdminExerciseLanguage)) errors.push('Idioma inválido.');
  if (!Number.isInteger(identity.workbookId) || identity.workbookId < 1 || identity.workbookId > 100) errors.push('O livro deve ser um número inteiro entre 1 e 100.');
  if (!identity.lessonId.trim()) errors.push('Selecione uma lição.');
  if (!identity.dayId.trim()) errors.push('Selecione um dia.');
  if (identity.type !== 'multiple-choice') errors.push('Somente múltipla escolha está disponível nesta etapa.');
  if (!content.instruction.trim()) errors.push('Informe a instrução.');
  if (!content.correctValue.trim()) errors.push('Selecione a resposta correta.');
  const options = content.options.map((item) => item.trim());
  if (options.length < ADMIN_EXERCISE_OPTION_LIMITS.min) errors.push('Informe pelo menos duas alternativas.');
  if (options.length > ADMIN_EXERCISE_OPTION_LIMITS.max) errors.push('Informe no máximo dez alternativas.');
  if (options.some((item) => !item)) errors.push('Todas as alternativas devem estar preenchidas.');
  if (options.some((item) => item.length > ADMIN_EXERCISE_OPTION_LIMITS.maxCharacters)) errors.push('Cada alternativa deve ter no máximo 500 caracteres.');
  if (hasDuplicateAlternatives(options)) errors.push('Existem alternativas duplicadas.');
  if (!hasMatchingAlternative(options, content.correctValue)) errors.push('A resposta correta precisa estar entre as alternativas.');
  if (!ADMIN_EXERCISE_SPEECH_LANGUAGES.includes(content.speechLanguage as typeof ADMIN_EXERCISE_SPEECH_LANGUAGES[number])) errors.push('Idioma da voz inválido.');
  const imageError = validateExternalImageUrl(content.imageUrl);
  if (imageError) errors.push(imageError);
  if (content.imageUrl.trim() && !input.imageValidated) errors.push('Valide o carregamento da imagem antes de publicar.');
  if (input.changeReason.trim().length < 5) errors.push('Informe um motivo com pelo menos 5 caracteres.');
  for (const [key, field] of Object.entries(content)) {
    if (typeof field === 'string' && field.length > ADMIN_EXERCISE_TEXT_LIMIT && key !== 'imageUrl') errors.push(`${key}: texto excede 10.000 caracteres.`);
  }
  if (content.imageAlt.length > 500) errors.push('O texto alternativo deve ter no máximo 500 caracteres.');
  if (content.acceptedAnswers.length > 100) errors.push('A lista de respostas aceitas excede 100 itens.');
  return [...new Set(errors)];
}

export function adminExerciseToPracticeExercise(
  identity: Pick<AdminExerciseIdentity, 'exerciseId' | 'language'>,
  content: AdminExerciseContent,
): Exercise {
  return {
    id: identity.exerciseId, type: 'multiple-choice', instruction: content.instruction,
    displayValue: content.displayValue || undefined, audioValue: content.audioValue,
    speechLanguage: content.speechLanguage || identity.language, options: content.options,
    correctValue: content.correctValue, acceptedAnswers: content.acceptedAnswers,
    translation: content.translation || undefined, imageUrl: content.imageUrl || undefined,
    imageAlt: content.imageAlt || undefined, feedbackCorrect: content.feedbackCorrect || undefined,
    feedbackIncorrect: content.feedbackIncorrect || undefined, explanation: content.explanation || undefined,
  };
}

export function versionDocumentId(version: number): string {
  return String(version).padStart(6, '0');
}

export function assertAdminExerciseRevision(input: {
  currentVersion: number;
  expectedVersion: number;
  currentDraftRevision?: number;
  expectedDraftRevision?: number;
}): void {
  if (input.currentVersion !== input.expectedVersion
    || (input.expectedDraftRevision !== undefined
      && input.currentDraftRevision !== input.expectedDraftRevision)) {
    throw new Error('Este exercício foi alterado por outro administrador. Recarregue a tela antes de continuar.');
  }
}
