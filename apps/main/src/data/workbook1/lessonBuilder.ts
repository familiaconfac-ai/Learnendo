import { Exercise, Lesson } from '../../types';

export type ExerciseDraft = Omit<Exercise, 'id'>;

export interface DrillRow {
  prompt: string;
  answer: string;
  display?: string;
  accepted?: string[];
  translation?: string;
}

type ExerciseExtras = Partial<Omit<ExerciseDraft, 'type' | 'instruction' | 'audioValue' | 'correctValue' | 'options'>>;

const DAY_TARGETS = [15, 15, 15, 10, 15, 15, 15] as const;

function accepted(correct: string, values: string[] = []): string[] | undefined {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .filter((value) => value !== correct.trim());
  return unique.length ? unique : undefined;
}

function positionedOptions(correct: string, distractors: string[], correctPosition: number): string[] {
  if (distractors.length !== 3) throw new Error(`Expected 3 distractors for "${correct}".`);
  const position = Math.max(0, Math.min(3, correctPosition));
  const options = [...distractors];
  options.splice(position, 0, correct);
  if (new Set(options).size !== 4) throw new Error(`Choice options must be unique for "${correct}".`);
  return options;
}

export function choice(
  audioValue: string,
  correctValue: string,
  distractors: string[],
  correctPosition: number,
  extras: ExerciseExtras & { instruction?: string; type?: 'multiple-choice' | 'identification' } = {},
): ExerciseDraft {
  const { instruction = 'Listen and choose the best answer.', type = 'multiple-choice', ...rest } = extras;
  return {
    type,
    instruction,
    audioValue,
    correctValue,
    options: positionedOptions(correctValue, distractors, correctPosition),
    ...rest,
  };
}

export function write(
  audioValue: string,
  correctValue: string,
  displayValue: string,
  alternatives: string[] = [],
  extras: ExerciseExtras & { instruction?: string } = {},
): ExerciseDraft {
  const { instruction = 'Write the correct answer.', ...rest } = extras;
  return {
    type: 'writing',
    instruction,
    displayValue,
    audioValue,
    correctValue,
    acceptedAnswers: accepted(correctValue, alternatives),
    ...rest,
  };
}

export function speak(
  audioValue: string,
  alternatives: string[] = [],
  extras: ExerciseExtras & { instruction?: string; displayValue?: string; correctValue?: string } = {},
): ExerciseDraft {
  const {
    instruction = 'Listen and say the complete sentence.',
    displayValue = audioValue,
    correctValue = audioValue,
    ...rest
  } = extras;
  return {
    type: 'speaking',
    instruction,
    displayValue,
    audioValue,
    correctValue,
    acceptedAnswers: accepted(correctValue, alternatives),
    ...rest,
  };
}

export function choiceDrill(
  rows: DrillRow[],
  instruction: string,
  type: 'multiple-choice' | 'identification' = 'multiple-choice',
): ExerciseDraft[] {
  if (rows.length < 4) throw new Error('A choice drill needs at least four rows.');
  return rows.map((row, index) => choice(
    row.prompt,
    row.answer,
    [1, 2, 3].map((offset) => rows[(index + offset) % rows.length].answer),
    index % 4,
    { instruction, type, displayValue: row.display, translation: row.translation },
  ));
}

export function writingDrill(rows: DrillRow[], instruction: string): ExerciseDraft[] {
  return rows.map((row) => write(
    row.prompt,
    row.answer,
    row.display ?? row.prompt,
    row.accepted,
    { instruction, translation: row.translation },
  ));
}

export function speakingDrill(rows: DrillRow[], instruction: string): ExerciseDraft[] {
  return rows.map((row) => speak(
    row.answer,
    row.accepted,
    { instruction, displayValue: row.display ?? row.prompt, translation: row.translation },
  ));
}

export function buildLesson(
  lessonNumber: number,
  title: string,
  days: Array<{ type?: 'practice' | 'review'; exercises: ExerciseDraft[] }>,
): Lesson {
  const lessonId = `wb1_l${lessonNumber}`;
  if (days.length !== DAY_TARGETS.length) throw new Error(`${lessonId} must have exactly seven days.`);

  return {
    id: lessonId,
    title,
    days: days.map((day, dayIndex) => {
      const expected = DAY_TARGETS[dayIndex];
      if (day.exercises.length !== expected) {
        throw new Error(`${lessonId} day ${dayIndex + 1}: expected ${expected}, got ${day.exercises.length}.`);
      }
      return {
        id: `${lessonId}_d${dayIndex + 1}`,
        type: day.type ?? (dayIndex === 6 ? 'review' : 'practice'),
        exercises: day.exercises.map((exercise, exerciseIndex) => ({
          ...exercise,
          id: `${lessonId}_d${dayIndex + 1}_e${exerciseIndex + 1}`,
        })),
      };
    }),
  };
}
