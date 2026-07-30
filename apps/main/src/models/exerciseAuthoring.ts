import type { Exercise } from '../types';

export const AUTHORING_SCHEMA_VERSION = 1 as const;
export const AUTHORING_TYPES = ['multiple-choice', 'identification', 'writing', 'listening', 'speaking', 'shadowing', 'repeat'] as const;
export const BATCH_MODES = ['append', 'insert_at', 'replace_day', 'replace_positions'] as const;

export type AuthoringType = typeof AUTHORING_TYPES[number];
export type BatchMode = typeof BATCH_MODES[number];

export interface CanonicalExerciseInput {
  type: AuthoringType;
  instruction: string;
  displayValue?: string;
  targetText?: string;
  speechText?: string;
  speechLanguage?: string;
  correctAnswer?: string;
  acceptedAnswers?: string[];
  alternatives?: string[];
  imageUrl?: string;
  explanation?: string;
  translation?: string;
  position?: number | null;
}

export interface ExerciseBatchDocument {
  schemaVersion: typeof AUTHORING_SCHEMA_VERSION;
  courseId: string;
  bookId: number;
  lessonId: string;
  dayId: string;
  mode: BatchMode;
  insertAt: number | null;
  exercises: CanonicalExerciseInput[];
}

export interface ValidatedBatch {
  document: ExerciseBatchDocument | null;
  errors: string[];
  exerciseErrors: string[][];
}

const allowedTopLevel = new Set(['schemaVersion', 'courseId', 'bookId', 'lessonId', 'dayId', 'day', 'mode', 'insertAt', 'exercises']);
const allowedExercise = new Set(['type', 'instruction', 'displayValue', 'prompt', 'targetText', 'speechText', 'speechLanguage', 'correctAnswer', 'acceptedAnswers', 'alternatives', 'imageUrl', 'audioUrl', 'explanation', 'translation', 'position']);
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];

export function generateExerciseId(): string {
  const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `ex_${value}`;
}

export function authoringTypeOf(exercise: Exercise): AuthoringType | null {
  if (exercise.type === 'multiple-choice') return 'multiple-choice';
  if (exercise.type === 'identification') return 'identification';
  if (exercise.type === 'writing') return exercise.assessmentMode === 'listening-writing' ? 'listening' : 'writing';
  if (exercise.type === 'speaking') return exercise.assessmentMode === 'repeat' ? 'repeat'
    : exercise.assessmentMode === 'shadowing' ? 'shadowing' : 'speaking';
  return null;
}

export function canonicalFromExercise(exercise: Exercise, position?: number): CanonicalExerciseInput {
  const type = authoringTypeOf(exercise);
  if (!type) throw new Error(`O tipo ${exercise.type} não possui fluxo de resposta completo no aluno.`);
  return {
    type, instruction: exercise.instruction, displayValue: exercise.displayValue ?? '',
    targetText: exercise.correctValue, speechText: exercise.audioValue,
    speechLanguage: exercise.speechLanguage ?? '', correctAnswer: exercise.correctValue,
    acceptedAnswers: [...(exercise.acceptedAnswers ?? [])], alternatives: [...(exercise.options ?? [])],
    imageUrl: exercise.imageUrl ?? '', explanation: exercise.explanation ?? '',
    translation: exercise.translation ?? '', position: position ?? null,
  };
}

export function validateCanonicalExercise(input: CanonicalExerciseInput): string[] {
  const errors: string[] = [];
  if (!AUTHORING_TYPES.includes(input.type)) errors.push('Tipo não suportado pelo aplicativo do aluno.');
  if (!text(input.instruction)) errors.push('Informe a instrução.');
  const correct = text(input.correctAnswer ?? input.targetText);
  const alternatives = stringList(input.alternatives);
  if (input.type === 'multiple-choice' || input.type === 'identification') {
    if (alternatives.length < 2) errors.push('Informe pelo menos duas alternativas.');
    if (!correct) errors.push('Informe a resposta correta.');
    if (correct && !alternatives.includes(correct)) errors.push('A resposta correta deve constar nas alternativas.');
    if (new Set(alternatives.map((item) => item.toLocaleLowerCase())).size !== alternatives.length) errors.push('Existem alternativas duplicadas.');
  }
  if (input.type === 'writing' && !correct && stringList(input.acceptedAnswers).length === 0) errors.push('Informe uma resposta correta ou aceita.');
  if (input.type === 'listening' && !text(input.speechText ?? input.targetText)) errors.push('Listening exige texto para síntese de voz.');
  if ((input.type === 'speaking' || input.type === 'shadowing' || input.type === 'repeat') && !text(input.targetText ?? input.speechText)) errors.push('O exercício oral exige texto-alvo.');
  if ((input.type === 'speaking' || input.type === 'shadowing' || input.type === 'repeat') && !text(input.speechLanguage)) errors.push('O exercício oral exige idioma da voz.');
  if (input.imageUrl && !/^https:\/\//i.test(input.imageUrl)) errors.push('A imagem deve usar URL HTTPS.');
  if (input.position != null && (!Number.isInteger(input.position) || input.position < 1)) errors.push('A posição deve ser um inteiro a partir de 1.');
  return errors;
}

export function exerciseFromCanonical(input: CanonicalExerciseInput, previous?: Exercise): Exercise {
  const correctValue = text(input.correctAnswer) || text(input.targetText);
  const oral = input.type === 'speaking' || input.type === 'shadowing' || input.type === 'repeat';
  const listening = input.type === 'listening';
  const exerciseType: Exercise['type'] = oral ? 'speaking' : listening ? 'writing'
    : input.type as 'multiple-choice' | 'identification' | 'writing';
  const next: Exercise = {
    ...(previous ?? {} as Exercise),
    id: previous?.id ?? generateExerciseId(), type: exerciseType,
    instruction: text(input.instruction),
    audioValue: input.speechText !== undefined || input.targetText !== undefined ? (text(input.speechText) || text(input.targetText)) : (previous?.audioValue ?? ''),
    correctValue: input.correctAnswer !== undefined || input.targetText !== undefined ? correctValue : (previous?.correctValue ?? ''),
    assessmentMode: listening ? 'listening-writing' : oral
      ? (input.type === 'speaking' ? 'speaking' : input.type === 'repeat' ? 'repeat' : 'shadowing')
      : previous?.assessmentMode,
  };
  if (input.displayValue !== undefined) next.displayValue = text(input.displayValue);
  if (input.speechLanguage !== undefined) next.speechLanguage = text(input.speechLanguage) || undefined;
  if (input.acceptedAnswers !== undefined) next.acceptedAnswers = stringList(input.acceptedAnswers);
  if (input.alternatives !== undefined) next.options = stringList(input.alternatives);
  if (input.imageUrl !== undefined) next.imageUrl = text(input.imageUrl);
  if (input.explanation !== undefined) next.explanation = text(input.explanation);
  if (input.translation !== undefined) next.translation = text(input.translation);
  if (exerciseType !== 'multiple-choice' && exerciseType !== 'identification') delete next.options;
  if (!next.imageUrl) delete next.imageUrl;
  if (!next.explanation) delete next.explanation;
  if (!next.translation) delete next.translation;
  if (!next.acceptedAnswers?.length) delete next.acceptedAnswers;
  if (!next.speechLanguage) delete next.speechLanguage;
  if (exerciseType !== 'speaking' && !listening) delete next.assessmentMode;
  return next;
}

export const PUBLISHED_TYPE_IMMUTABLE_MESSAGE = 'Não é possível alterar o tipo de um exercício já publicado. Duplique o exercício para criar uma nova versão com outro tipo.';

export function validatePublishedExerciseTypes(previous: Exercise[], next: Exercise[]): string[] {
  const previousById = new Map(previous.map((exercise) => [exercise.id, authoringTypeOf(exercise)]));
  return next.flatMap((exercise) => {
    const oldType = previousById.get(exercise.id);
    const newType = authoringTypeOf(exercise);
    return oldType && newType && oldType !== newType ? [PUBLISHED_TYPE_IMMUTABLE_MESSAGE] : [];
  });
}

export function parseExerciseBatch(raw: string): ValidatedBatch {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { document: null, errors: ['JSON inválido.'], exerciseErrors: [] }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { document: null, errors: ['O JSON deve ser um objeto.'], exerciseErrors: [] };
  const source = value as Record<string, unknown>;
  const errors: string[] = [];
  const unknownTop = Object.keys(source).filter((key) => !allowedTopLevel.has(key));
  if (unknownTop.length) errors.push(`Campos desconhecidos no documento: ${unknownTop.join(', ')}.`);
  if (source.schemaVersion != null && source.schemaVersion !== AUTHORING_SCHEMA_VERSION) errors.push('schemaVersion não suportada.');
  const bookId = Number(source.bookId);
  const dayId = text(source.dayId) || (source.day != null ? String(source.day) : '');
  const mode = source.mode as BatchMode;
  if (!text(source.courseId)) errors.push('Informe courseId.');
  if (!Number.isInteger(bookId) || bookId < 1) errors.push('bookId deve ser um inteiro positivo.');
  if (!text(source.lessonId)) errors.push('Informe lessonId.');
  if (!dayId) errors.push('Informe dayId ou day.');
  if (!BATCH_MODES.includes(mode)) errors.push('Modo de importação inválido.');
  const insertAt = source.insertAt == null ? null : Number(source.insertAt);
  if (mode === 'insert_at' && (!Number.isInteger(insertAt) || Number(insertAt) < 1)) errors.push('insert_at exige insertAt a partir de 1.');
  if (!Array.isArray(source.exercises) || source.exercises.length === 0) errors.push('Informe ao menos um exercício.');
  if (Array.isArray(source.exercises) && source.exercises.length > 100) errors.push('O lote excede o limite de 100 exercícios.');
  const exercises: CanonicalExerciseInput[] = [];
  const exerciseErrors = (Array.isArray(source.exercises) ? source.exercises : []).map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [`Exercício ${index + 1}: deve ser um objeto.`];
    const row = item as Record<string, unknown>;
    const rowErrors: string[] = [];
    const unknown = Object.keys(row).filter((key) => !allowedExercise.has(key));
    if (unknown.length) rowErrors.push(`Campos desconhecidos: ${unknown.join(', ')}.`);
    if (text(row.audioUrl)) rowErrors.push('audioUrl não é suportado: o aluno usa texto para TTS (speechText).');
    const normalized: CanonicalExerciseInput = {
      type: row.type as AuthoringType, instruction: text(row.instruction) || text(row.prompt),
      displayValue: text(row.displayValue), targetText: text(row.targetText), speechText: text(row.speechText),
      speechLanguage: text(row.speechLanguage), correctAnswer: text(row.correctAnswer),
      acceptedAnswers: stringList(row.acceptedAnswers), alternatives: stringList(row.alternatives),
      imageUrl: text(row.imageUrl), explanation: text(row.explanation), translation: text(row.translation),
      position: row.position == null ? null : Number(row.position),
    };
    rowErrors.push(...validateCanonicalExercise(normalized));
    exercises.push(normalized);
    return rowErrors;
  });
  if (mode === 'replace_positions' && exercises.some((item) => item.position == null)) errors.push('replace_positions exige position em todos os exercícios.');
  return { document: { schemaVersion: AUTHORING_SCHEMA_VERSION, courseId: text(source.courseId), bookId,
    lessonId: text(source.lessonId), dayId, mode, insertAt, exercises }, errors, exerciseErrors };
}

export function applyBatch(existing: Exercise[], inputs: CanonicalExerciseInput[], mode: BatchMode, insertAt: number | null): Exercise[] {
  const fresh = inputs.map((item) => exerciseFromCanonical(item));
  let result: Exercise[];
  if (mode === 'append') result = [...existing, ...fresh];
  else if (mode === 'insert_at') {
    const index = Math.max(0, Math.min(existing.length, (insertAt ?? 1) - 1));
    result = [...existing.slice(0, index), ...fresh, ...existing.slice(index)];
  } else if (mode === 'replace_day') result = fresh;
  else {
    result = [...existing];
    inputs.forEach((item, index) => {
      const target = Number(item.position) - 1;
      if (target < 0 || target >= result.length) throw new Error(`A posição ${item.position} não existe no dia.`);
      result[target] = exerciseFromCanonical(item, result[target]);
    });
  }
  const ids = result.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('A operação produziria identificadores duplicados.');
  return result;
}

export function buildAiPrompt(input: { courseId: string; bookId: number; lessonId: string; dayId: string; subject: string; objective: string; language: string; level: string; quantity: number; distribution: string }): string {
  return `Crie ${input.quantity} exercícios para o curso ${input.courseId}, Livro ${input.bookId}, lição ${input.lessonId}, dia ${input.dayId}. Assunto: ${input.subject || 'informar'}. Objetivo pedagógico: ${input.objective || 'informar'}. Idioma: ${input.language}. Nível: ${input.level || 'informar'}. Distribuição: ${input.distribution || 'informar'}. Responda somente com JSON válido, sem markdown. Use schemaVersion 1, mode "append", insertAt null e os tipos: ${AUTHORING_TYPES.join(', ')}. Cada item aceita apenas type, instruction, displayValue, targetText, speechText, speechLanguage, correctAnswer, acceptedAnswers, alternatives, imageUrl, explanation, translation e position. Múltipla escolha/identificação exigem duas alternativas e resposta correta presente nelas; writing exige resposta; listening exige speechText; speaking/shadowing/repeat exigem targetText e speechLanguage; imagens devem usar HTTPS. Estrutura: {"schemaVersion":1,"courseId":"${input.courseId}","bookId":${input.bookId},"lessonId":"${input.lessonId}","dayId":"${input.dayId}","mode":"append","insertAt":null,"exercises":[]}`;
}
