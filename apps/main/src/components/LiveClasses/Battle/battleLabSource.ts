import { QUESTION_PACKS } from '../../../../../lab/src/data/biblePacks';
import type { BibleItem } from '../../../../../lab/src/types';
import type { Exercise, Lesson, Workbook } from '../../../types';
import { loadWorkbookForWhiteboard, resolveLessonForWhiteboard } from '../../../services/liveWhiteboardActivities';
import type { BattleConfig, BattleDifficulty, BattleQuestion } from './battleTypes';
import { getBattleLanguage, sanitizeBattleQuestion } from './battleUtils';

interface BattleWorkbookContext {
  workbook: Workbook;
  currentLesson: Lesson | null;
  currentLessonNumber: number | null;
}

function shuffle<T>(arr: T[]): T[] {
  const clone = [...arr];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]];
  }
  return clone;
}

function normalizeOptions(options: string[] | undefined, correctAnswer: string): string[] {
  const pool = new Set<string>((options ?? []).map((option) => option.trim()).filter(Boolean));
  pool.add(correctAnswer.trim());
  return Array.from(pool);
}

function normalizeCourseId(courseId?: string): string {
  const normalized = courseId?.trim().toLowerCase() ?? '';
  if (!normalized || normalized === 'en' || normalized === 'english') return 'english';
  if (normalized === 'pt' || normalized === 'portuguese' || normalized === 'portuguese_native') return 'portuguese_foreigners';
  if (normalized === 'es' || normalized === 'spanish') return 'spanish';
  if (normalized === 'el' || normalized === 'greek') return 'greek_koine';
  if (normalized === 'he' || normalized === 'hebrew') return 'hebrew_biblical';
  return normalized;
}

function extractLessonNumber(lessonId?: string): number | null {
  if (!lessonId) return null;
  const workbookMatch = String(lessonId).match(/_l(\d+)/i);
  if (workbookMatch) return Number(workbookMatch[1]);
  const match = String(lessonId).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function shouldUseBibleSources(courseId?: string): boolean {
  return courseId?.toLowerCase().includes('bible') ?? false;
}

function dedupeQuestions(questions: BattleQuestion[]): BattleQuestion[] {
  const seen = new Set<string>();
  const next: BattleQuestion[] = [];

  for (const question of questions) {
    if (!question.id || seen.has(question.id)) continue;
    seen.add(question.id);
    next.push(question);
  }

  return next;
}

function buildExercisePromptText(exercise: Exercise): string {
  const lines: string[] = [];
  const instruction = exercise.instruction?.trim();
  const displayValue = exercise.displayValue?.trim();

  if (instruction) {
    lines.push(instruction);
  }

  if (
    displayValue
    && !displayValue.startsWith('fa-')
    && displayValue.toLowerCase() !== instruction?.toLowerCase()
  ) {
    lines.push(displayValue);
  }

  return lines.join('\n').trim();
}

function mapExerciseToBattleQuestion(exercise: Exercise): BattleQuestion | null {
  const displayValue = exercise.displayValue?.trim() ?? '';
  const displayIsIcon = displayValue.startsWith('fa-');
  const promptAudioText = exercise.audioValue?.trim() || undefined;
  const text = buildExercisePromptText(exercise);
  const hint = exercise.translation?.trim() || undefined;

  switch (exercise.type) {
    case 'multiple-choice':
    case 'identification': {
      const options = normalizeOptions(exercise.options, exercise.correctValue);
      const correctIndex = options.indexOf(exercise.correctValue.trim());
      const shouldUseAudio = Boolean(promptAudioText) && (displayIsIcon || !displayValue);
      return sanitizeBattleQuestion({
        id: exercise.id,
        kind: shouldUseAudio ? 'audio-choice' : 'multiple-choice',
        text: text || promptAudioText || 'Choose the correct answer.',
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        promptAudioText: shouldUseAudio ? promptAudioText : undefined,
        playAudioOnce: shouldUseAudio,
        hint,
      });
    }
    case 'writing':
      return sanitizeBattleQuestion({
        id: exercise.id,
        kind: 'audio-open',
        text: text || exercise.instruction || 'Type your answer.',
        correctText: exercise.correctValue,
        acceptedAnswers: [exercise.correctValue],
        promptAudioText,
        playAudioOnce: Boolean(promptAudioText),
        hint,
      });
    case 'speaking':
      return sanitizeBattleQuestion({
        id: exercise.id,
        kind: 'speaking',
        text: text || exercise.instruction || 'Speak your answer.',
        correctText: exercise.correctValue,
        acceptedAnswers: [exercise.correctValue],
        promptAudioText,
        playAudioOnce: true,
        hint,
      });
    default:
      return null;
  }
}

function mapBibleItemToBattleQuestion(packId: string, item: BibleItem): BattleQuestion | null {
  const options = normalizeOptions(item.options, item.correctAnswer);
  const correctIndex = options.indexOf(item.correctAnswer.trim());
  return sanitizeBattleQuestion({
    id: `${packId}:${item.id}`,
    kind: 'multiple-choice',
    text: item.question,
    options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  });
}

function getScopedLessons(
  lessons: Lesson[],
  scope: BattleConfig['scope'],
  currentLesson: Lesson | null,
  currentLessonNumber: number | null,
): Lesson[] {
  if (scope === 'current-lesson') {
    return currentLesson ? [currentLesson] : [];
  }

  if (scope === 'review' && currentLessonNumber != null && currentLessonNumber > 0) {
    return lessons.slice(0, currentLessonNumber);
  }

  return lessons;
}

function applyDifficultyToPool(
  pool: BattleQuestion[],
  difficulty: BattleDifficulty | undefined,
): BattleQuestion[] {
  if (difficulty === 'easy') {
    const easyPool = pool.filter((question) => (
      question.kind === 'multiple-choice' || question.kind === 'audio-choice'
    ));
    return easyPool.length > 0 ? easyPool : pool;
  }

  if (difficulty === 'hard') {
    const hardPool = pool.filter((question) => (
      question.kind === 'audio-open' || question.kind === 'speaking'
    ));

    if (hardPool.length > 0) {
      const remaining = pool.filter((question) => !hardPool.includes(question));
      return [...hardPool, ...remaining];
    }
  }

  return pool;
}

async function loadBattleWorkbookContext(
  config: Pick<BattleConfig, 'lessonId' | 'workbookId' | 'courseId'>,
): Promise<BattleWorkbookContext | null> {
  const courseId = normalizeCourseId(config.courseId);
  const workbookId = Number(config.workbookId) || 1;
  const workbook = await loadWorkbookForWhiteboard(courseId, workbookId);
  if (!workbook?.lessons?.length) {
    return null;
  }

  const currentLesson = resolveLessonForWhiteboard(workbook, config.lessonId ?? null);
  const currentLessonNumber = extractLessonNumber(currentLesson?.id ?? config.lessonId ?? undefined);

  return {
    workbook,
    currentLesson,
    currentLessonNumber,
  };
}

async function getBattleQuestionsFromWorkbook(
  config: Pick<BattleConfig, 'questionCount' | 'scope' | 'lessonId' | 'workbookId' | 'courseId' | 'difficulty'>,
): Promise<BattleQuestion[]> {
  const context = await loadBattleWorkbookContext(config);
  if (!context) {
    return [];
  }

  const scopedLessons = getScopedLessons(
    context.workbook.lessons ?? [],
    config.scope,
    context.currentLesson,
    context.currentLessonNumber,
  );

  const rawPool = scopedLessons.flatMap((lesson) => (
    lesson.days.flatMap((day) => day.exercises.map((exercise) => mapExerciseToBattleQuestion(exercise)))
  ));

  const normalizedPool = dedupeQuestions(
    rawPool.filter((question): question is BattleQuestion => question !== null),
  );

  const difficultyPool = applyDifficultyToPool(normalizedPool, config.difficulty);
  const selectedQuestions = shuffle(difficultyPool).slice(0, config.questionCount);

  console.log('[BATTLE CONTENT] workbook source active', {
    courseId: config.courseId ?? null,
    workbookId: config.workbookId ?? null,
    lessonId: config.lessonId ?? null,
    scope: config.scope,
    lessonCount: scopedLessons.length,
    poolSize: normalizedPool.length,
    selectedCount: selectedQuestions.length,
  });

  return selectedQuestions;
}

function buildBibleSources(): BattleQuestion[] {
  return QUESTION_PACKS.flatMap((pack) => (
    pack.items
      .map((item) => mapBibleItemToBattleQuestion(pack.id, item))
      .filter((item): item is BattleQuestion => item !== null)
  ));
}

export async function getBattleQuestionsFromLab(
  config: Pick<BattleConfig, 'questionCount' | 'scope' | 'lessonId' | 'workbookId' | 'courseId' | 'difficulty'>,
): Promise<BattleQuestion[]> {
  const workbookQuestions = await getBattleQuestionsFromWorkbook(config);
  if (workbookQuestions.length > 0 || !shouldUseBibleSources(config.courseId)) {
    return workbookQuestions;
  }

  const battleLanguage = getBattleLanguage(config.courseId);
  const bibleQuestions = shuffle(dedupeQuestions(buildBibleSources())).slice(0, config.questionCount);

  console.log('[BATTLE CONTENT] fallback bible source active', {
    courseId: config.courseId ?? null,
    language: battleLanguage,
    scope: config.scope,
    selectedCount: bibleQuestions.length,
  });

  return bibleQuestions;
}
