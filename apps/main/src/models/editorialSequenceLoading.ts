import type { Exercise } from '../types';

export interface DaySequenceScopeInput {
  courseId: string;
  language: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
}

export type EditorialSequenceLoadStatus = 'loading' | 'published' | 'fallback' | 'error' | 'empty';

export interface EditorialSequenceLoadResult {
  status: Exclude<EditorialSequenceLoadStatus, 'loading'>;
  exercises: Exercise[];
  diagnostic: 'published' | 'not-found' | 'published-empty' | 'published-invalid' | 'load-error' | 'local-empty';
}

const safePart = (value: string) => encodeURIComponent(value).replace(/%/g, '_');

export function daySequenceScopeId(input: DaySequenceScopeInput): string {
  return [input.courseId, input.language, `w${input.workbookId}`, input.lessonId, input.dayId]
    .map(safePart)
    .join('__');
}

function isRenderableExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<Exercise>;
  return typeof exercise.id === 'string' && exercise.id.length > 0
    && ['speaking', 'multiple-choice', 'writing', 'identification'].includes(String(exercise.type))
    && typeof exercise.instruction === 'string'
    && typeof exercise.correctValue === 'string';
}

export function settleEditorialSequenceLoad(
  localExercises: Exercise[],
  publishedExercises: unknown,
  error: unknown = null,
): EditorialSequenceLoadResult {
  if (error) {
    return localExercises.length
      ? { status: 'fallback', exercises: localExercises, diagnostic: 'load-error' }
      : { status: 'error', exercises: [], diagnostic: 'load-error' };
  }
  if (publishedExercises == null) {
    return localExercises.length
      ? { status: 'fallback', exercises: localExercises, diagnostic: 'not-found' }
      : { status: 'empty', exercises: [], diagnostic: 'local-empty' };
  }
  if (!Array.isArray(publishedExercises)) {
    return localExercises.length
      ? { status: 'fallback', exercises: localExercises, diagnostic: 'published-invalid' }
      : { status: 'error', exercises: [], diagnostic: 'published-invalid' };
  }
  if (publishedExercises.length === 0) {
    return localExercises.length
      ? { status: 'fallback', exercises: localExercises, diagnostic: 'published-empty' }
      : { status: 'empty', exercises: [], diagnostic: 'published-empty' };
  }
  if (!publishedExercises.every(isRenderableExercise)) {
    return localExercises.length
      ? { status: 'fallback', exercises: localExercises, diagnostic: 'published-invalid' }
      : { status: 'error', exercises: [], diagnostic: 'published-invalid' };
  }
  return { status: 'published', exercises: publishedExercises, diagnostic: 'published' };
}
