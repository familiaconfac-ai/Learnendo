import type { Day, Exercise, Lesson } from '../../types.ts';
import { questionProductionFields } from '../../utils/writingPrompt.ts';

const TARGET_TRAIL_COUNTS = [15, 15, 15, 10, 15, 15, 15] as const;

type ExerciseRef = {
  sourceDayIndex: number;
  sourceExerciseIndex: number;
  exercise: Exercise;
};

function cloneExercise(exercise: Exercise, id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    ...exercise,
    ...overrides,
    id,
  };
}

function toWritingExercise(exercise: Exercise, id: string, enableQuestionProduction = false): Exercise {
  const questionFields = enableQuestionProduction ? questionProductionFields(exercise) : null;
  if (questionFields) {
    return cloneExercise(exercise, id, {
      ...questionFields,
      type: 'writing',
      options: undefined,
    });
  }
  // Workbook 1 only promotes an item to writing when its authored objective is
  // already writing or when a clear question/answer pair exists. A bare response
  // must never become "Answer: <response>" with that same response as the target.
  if (enableQuestionProduction && exercise.type !== 'writing') return cloneExercise(exercise, id);
  const displayValue =
    exercise.displayValue
    ?? (exercise.options?.length ? `Answer: ${exercise.correctValue}` : exercise.audioValue);

  return cloneExercise(exercise, id, {
    type: 'writing',
    instruction: exercise.type === 'writing' ? exercise.instruction : 'Write the correct answer.',
    displayValue,
    options: undefined,
  });
}

function toSpeakingExercise(exercise: Exercise, id: string): Exercise {
  const displayValue = exercise.displayValue ?? exercise.audioValue;
  const instruction = /dialogue/i.test(exercise.instruction)
    ? 'Listen and repeat the dialogue.'
    : 'Listen and repeat.';

  return cloneExercise(exercise, id, {
    type: 'speaking',
    instruction,
    displayValue,
    options: undefined,
  });
}

function uniqueRefs(refs: ExerciseRef[]): ExerciseRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.sourceDayIndex}:${ref.sourceExerciseIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRefPool(days: Day[]): ExerciseRef[][] {
  return days.map((day, dayIndex) =>
    (day.exercises ?? []).map((exercise, exerciseIndex) => ({
      sourceDayIndex: dayIndex,
      sourceExerciseIndex: exerciseIndex,
      exercise,
    })),
  );
}

function selectRefsByPriority(
  groupedRefs: ExerciseRef[][],
  priorities: number[],
  count: number,
): ExerciseRef[] {
  const selected: ExerciseRef[] = [];

  for (const sourceIndex of priorities) {
    const refs = groupedRefs[sourceIndex] ?? [];
    for (const ref of refs) {
      if (selected.length >= count) return selected;
      selected.push(ref);
    }
  }

  return selected;
}

function padRefs(refs: ExerciseRef[], fallbackPool: ExerciseRef[], count: number): ExerciseRef[] {
  if (!fallbackPool.length) return refs;

  const padded = [...refs];
  let cursor = 0;

  while (padded.length < count) {
    padded.push(fallbackPool[cursor % fallbackPool.length]);
    cursor += 1;
  }

  return padded;
}

function materializeTrailExercises(
  lesson: Lesson,
  trailNumber: number,
  refs: ExerciseRef[],
  transform: 'keep' | 'speaking' | 'writing',
  enableQuestionProduction = false,
): Exercise[] {
  return refs.map((ref, index) => {
    const id = `${lesson.id}_d${trailNumber}_e${index + 1}`;
    if (transform === 'speaking') return toSpeakingExercise(ref.exercise, id);
    if (transform === 'writing') return toWritingExercise(ref.exercise, id, enableQuestionProduction);
    return cloneExercise(ref.exercise, id);
  });
}

export function normalizeLessonsToOfficialTrails(lessons: Lesson[]): Lesson[] {
  return lessons.map((lesson) => {
    const groupedRefs = buildRefPool(lesson.days ?? []);
    const allRefs = uniqueRefs(groupedRefs.flat());

    if (!allRefs.length) return lesson;

    const trail1Refs = padRefs(
      selectRefsByPriority(groupedRefs, [0, 1, 6, 2, 3, 4, 5], TARGET_TRAIL_COUNTS[0]),
      allRefs,
      TARGET_TRAIL_COUNTS[0],
    );

    const trail2Refs = padRefs(
      selectRefsByPriority(groupedRefs, [1, 0, 2, 6, 5, 4, 3], TARGET_TRAIL_COUNTS[1]),
      allRefs,
      TARGET_TRAIL_COUNTS[1],
    );

    const trail3Refs = padRefs(
      selectRefsByPriority(groupedRefs, [2, 0, 6, 1, 3, 4, 5], TARGET_TRAIL_COUNTS[2]),
      allRefs,
      TARGET_TRAIL_COUNTS[2],
    );

    const trail4Refs = padRefs(
      selectRefsByPriority(groupedRefs, [3, 4, 5, 6, 0, 1, 2], TARGET_TRAIL_COUNTS[3]),
      allRefs,
      TARGET_TRAIL_COUNTS[3],
    );

    const isWorkbook1 = lesson.id.startsWith('wb1_');
    const isWorkbook1Lesson1 = lesson.id === 'wb1_l1';
    const trail5Priorities = isWorkbook1Lesson1 ? [5, 4, 1, 6, 2, 3, 0] : [4, 5, 1, 6, 2, 3, 0];
    const trail5Refs = padRefs(
      selectRefsByPriority(groupedRefs, trail5Priorities, TARGET_TRAIL_COUNTS[4]),
      allRefs,
      TARGET_TRAIL_COUNTS[4],
    );

    const trail6Refs = padRefs(
      selectRefsByPriority(groupedRefs, [5, 3, 6, 4, 2, 1, 0], TARGET_TRAIL_COUNTS[5]),
      allRefs,
      TARGET_TRAIL_COUNTS[5],
    );

    const trail7Refs = padRefs(
      selectRefsByPriority(groupedRefs, [6, 0, 1, 2, 3, 4, 5], TARGET_TRAIL_COUNTS[6]),
      allRefs,
      TARGET_TRAIL_COUNTS[6],
    );

    return {
      ...lesson,
      days: [
        {
          id: `${lesson.id}_d1`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 1, trail1Refs, 'keep'),
        },
        {
          id: `${lesson.id}_d2`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 2, trail2Refs, 'keep'),
        },
        {
          id: `${lesson.id}_d3`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 3, trail3Refs, 'keep'),
        },
        {
          id: `${lesson.id}_d4`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 4, trail4Refs, 'speaking'),
        },
        {
          id: `${lesson.id}_d5`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 5, trail5Refs, isWorkbook1 ? 'keep' : 'writing', isWorkbook1),
        },
        {
          id: `${lesson.id}_d6`,
          type: 'practice',
          exercises: materializeTrailExercises(lesson, 6, trail6Refs, isWorkbook1 ? 'writing' : 'keep', isWorkbook1),
        },
        {
          id: `${lesson.id}_d7`,
          type: 'review',
          exercises: materializeTrailExercises(lesson, 7, trail7Refs, 'keep'),
        },
      ],
    };
  });
}
