import { Exercise, Lesson } from '../../types';

type ExerciseInput = Omit<Exercise, 'id'>;

type ChoiceType = 'multiple-choice' | 'identification';

export interface ChoiceSeed {
  audio: string;
  options: string[];
  correct: string;
  display?: string;
  audioBeforeAnswer?: string;
  fullSentenceAfterAnswer?: string;
  translation?: string;
  accepted?: string[];
  instruction?: string;
  isNewVocab?: boolean;
  type?: ChoiceType;
}

export interface WritingSeed {
  audio: string;
  correct: string;
  display?: string;
  audioBeforeAnswer?: string;
  fullSentenceAfterAnswer?: string;
  accepted?: string[];
  translation?: string;
  instruction?: string;
  isNewVocab?: boolean;
}

export interface SpeakingSeed {
  audio: string;
  correct: string;
  display?: string;
  audioBeforeAnswer?: string;
  fullSentenceAfterAnswer?: string;
  accepted?: string[];
  translation?: string;
  instruction?: string;
  isNewVocab?: boolean;
}

const DAY_TARGETS = [15, 15, 15, 10, 15, 15, 15] as const;

function uniqueAccepted(correct: string, accepted?: string[]): string[] | undefined {
  const values = [...new Set((accepted ?? []).map((value) => value.trim()).filter(Boolean))];
  const filtered = values.filter((value) => value !== correct.trim());
  return filtered.length ? filtered : undefined;
}

function createExerciseId(lessonId: string, dayNumber: number, exerciseNumber: number): string {
  return `${lessonId}_d${dayNumber}_e${exerciseNumber}`;
}

export function makeChoices(
  seeds: ChoiceSeed[],
  defaultInstruction: string,
  defaultType: ChoiceType = 'multiple-choice',
): ExerciseInput[] {
  return seeds.map((seed) => ({
    type: seed.type ?? defaultType,
    instruction: seed.instruction ?? defaultInstruction,
    displayValue: seed.display,
    audioValue: seed.audio,
    audioValueBeforeAnswer: seed.audioBeforeAnswer,
    fullSentenceAfterAnswer: seed.fullSentenceAfterAnswer,
    options: seed.options,
    correctValue: seed.correct,
    acceptedAnswers: uniqueAccepted(seed.correct, seed.accepted),
    translation: seed.translation,
    isNewVocab: seed.isNewVocab,
  }));
}

export function makeWritings(seeds: WritingSeed[], defaultInstruction: string): ExerciseInput[] {
  return seeds.map((seed) => ({
    type: 'writing',
    instruction: seed.instruction ?? defaultInstruction,
    displayValue: seed.display,
    audioValue: seed.audio,
    audioValueBeforeAnswer: seed.audioBeforeAnswer,
    fullSentenceAfterAnswer: seed.fullSentenceAfterAnswer,
    correctValue: seed.correct,
    acceptedAnswers: uniqueAccepted(seed.correct, seed.accepted),
    translation: seed.translation,
    isNewVocab: seed.isNewVocab,
  }));
}

export function makeSpeakings(seeds: SpeakingSeed[], defaultInstruction: string): ExerciseInput[] {
  return seeds.map((seed) => ({
    type: 'speaking',
    instruction: seed.instruction ?? defaultInstruction,
    displayValue: seed.display,
    audioValue: seed.audio,
    audioValueBeforeAnswer: seed.audioBeforeAnswer,
    fullSentenceAfterAnswer: seed.fullSentenceAfterAnswer,
    correctValue: seed.correct,
    acceptedAnswers: uniqueAccepted(seed.correct, seed.accepted),
    translation: seed.translation,
    isNewVocab: seed.isNewVocab,
  }));
}

export function buildLesson(
  lessonNumber: number,
  title: string,
  days: Array<{ type: 'practice' | 'review'; exercises: ExerciseInput[] }>,
): Lesson {
  const lessonId = `wb8_l${lessonNumber}`;

  if (days.length !== DAY_TARGETS.length) {
    throw new Error(`Lesson ${lessonNumber} must have exactly 7 trails.`);
  }

  return {
    id: lessonId,
    title,
    days: days.map((day, dayIndex) => {
      const expectedCount = DAY_TARGETS[dayIndex];
      if (day.exercises.length !== expectedCount) {
        throw new Error(
          `Lesson ${lessonNumber} trail ${dayIndex + 1} must have ${expectedCount} exercises, got ${day.exercises.length}.`,
        );
      }

      return {
        id: `${lessonId}_d${dayIndex + 1}`,
        type: day.type,
        exercises: day.exercises.map((exercise, exerciseIndex) => ({
          ...exercise,
          id: createExerciseId(lessonId, dayIndex + 1, exerciseIndex + 1),
        })),
      };
    }),
  };
}
