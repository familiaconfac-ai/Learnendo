import { COURSE_WORKBOOKS } from '../courses/courseRegistry';
import { Day, Exercise, Lesson, LiveWhiteboardBlock, LiveWhiteboardState, Workbook } from '../types';

const DEFAULT_COURSE_ID = 'english';

function humanizeCourseId(courseId: string) {
  return courseId
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getLessonNumberFromId(lessonId: string | null | undefined) {
  if (!lessonId) return NaN;
  const workbookMatch = lessonId.match(/_l(\d+)/i);
  if (workbookMatch) return Number(workbookMatch[1]);
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
}

function getDayNumberFromId(dayId: string | null | undefined) {
  if (!dayId) return NaN;
  const match = dayId.match(/d(\d+)/i);
  return match ? Number(match[1]) : NaN;
}

function getWorkbookFromModule(module: Record<string, unknown>): Workbook | null {
  const match = Object.values(module).find((value) => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && 'lessons' in (value as Record<string, unknown>)
  ));
  return (match as Workbook | undefined) ?? null;
}

function buildPromptFromExercise(exercise: Exercise, index: number) {
  const promptLines = [`${index + 1}. ${exercise.instruction}`];
  const displayValue = (exercise.displayValue ?? '').trim();
  const audioValue = (exercise.audioValue ?? '').trim();

  if (displayValue && !displayValue.startsWith('fa-')) {
    promptLines.push(`Prompt: ${displayValue}`);
  } else if (audioValue) {
    promptLines.push(`Prompt: ${audioValue}`);
  }

  if (exercise.options?.length) {
    promptLines.push(`Options: ${exercise.options.join(' / ')}`);
  }

  return promptLines.join('\n');
}

function buildBlocksFromDay(day: Day): LiveWhiteboardBlock[] {
  return (day.exercises ?? []).map((exercise, index) => ({
    id: exercise.id || `${day.id}_item_${index + 1}`,
    prompt: buildPromptFromExercise(exercise, index),
    response: '',
    order: index + 1,
  }));
}

export function getWhiteboardCourseOptions() {
  return Object.keys(COURSE_WORKBOOKS).map((courseId) => ({
    id: courseId,
    label: humanizeCourseId(courseId),
  }));
}

export function getWorkbookOptionsForCourse(courseId: string) {
  const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
  return Object.keys(registry)
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
    .map((id) => ({ id, label: `Workbook ${id}` }));
}

export async function loadWorkbookForWhiteboard(courseId: string, workbookId: number): Promise<Workbook | null> {
  const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
  const loader = registry[workbookId];
  if (!loader) return null;

  const module = await loader();
  return getWorkbookFromModule(module as Record<string, unknown>);
}

export function resolveLessonForWhiteboard(workbook: Workbook | null, lessonReference: string | null | undefined): Lesson | null {
  const lessons = workbook?.lessons ?? [];
  if (!lessons.length) return null;
  if (!lessonReference) return lessons[0] ?? null;

  const exactMatch = lessons.find((lesson) => lesson.id === lessonReference);
  if (exactMatch) return exactMatch;

  const lessonNumber = getLessonNumberFromId(lessonReference);
  if (!Number.isFinite(lessonNumber) || lessonNumber < 1) return null;
  return lessons[lessonNumber - 1] ?? null;
}

export function resolveDayForWhiteboard(lesson: Lesson | null, dayReference: string | null | undefined): Day | null {
  const days = lesson?.days ?? [];
  if (!days.length) return null;
  if (!dayReference) return days[0] ?? null;

  const exactMatch = days.find((day) => day.id === dayReference);
  if (exactMatch) return exactMatch;

  const dayNumber = getDayNumberFromId(dayReference);
  if (!Number.isFinite(dayNumber) || dayNumber < 1) return null;
  return days[dayNumber - 1] ?? null;
}

export function buildManualQuestionBoard(
  title: string,
  instruction: string,
  prompts: string[],
  previousState?: LiveWhiteboardState,
): LiveWhiteboardState {
  const blocks = prompts.map((prompt, index) => ({
    id: `manual_${index + 1}`,
    prompt: prompt.trim(),
    response: previousState?.blocks?.find((block) => block.id === `manual_${index + 1}`)?.response ?? '',
    order: index + 1,
  }));

  return {
    content: '',
    mode: 'manual-questions',
    title: title.trim(),
    instruction: instruction.trim(),
    blocks,
    sourceCourseId: '',
    sourceWorkbookId: null,
    sourceLessonId: '',
    sourceExerciseId: '',
  };
}

export function buildLessonExerciseBoard(
  courseId: string,
  workbookId: number,
  lesson: Lesson,
  day: Day,
): LiveWhiteboardState {
  const blocks = buildBlocksFromDay(day);
  const uniqueInstructions = Array.from(
    new Set(
      day.exercises
        .map((exercise) => exercise.instruction?.trim())
        .filter(Boolean),
    ),
  );

  return {
    content: '',
    mode: 'lesson-exercise',
    title: lesson.title?.trim() || `Lesson Activity`,
    instruction: uniqueInstructions.join('\n'),
    blocks,
    sourceCourseId: courseId,
    sourceWorkbookId: workbookId,
    sourceLessonId: lesson.id,
    sourceExerciseId: day.id,
  };
}
