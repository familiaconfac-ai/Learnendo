import { Exercise, Lesson } from '../../types';
import { buildBlankAudioText, buildFullSentenceFromPrompt, hasBlankPlaceholder } from '../../utils/fillInBlankAudio';

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

type FlexibleItem = {
  audio?: string;
  options?: string[];
  correct?: string;
  answer?: string;
  display?: string;
  prompt?: string;
  question?: string;
  text?: string;
  term?: string;
  word?: string;
  meaning?: string;
  definition?: string;
  example?: string;
  correction?: string;
  feedback?: string;
  explanation?: string;
  distractors?: string[];
  accepted?: string[];
  translation?: string;
};

export interface Workbook9LessonConfig {
  number: number;
  title: string;
  subtitle?: string;
  grammarFocus?: string;
  readingTitle?: string;
  reading?: string;
  dialogue?: string[];
  vocab: FlexibleItem[];
  grammar: FlexibleItem[];
  listening: FlexibleItem[];
  speakingPrompts: Array<string | FlexibleItem>;
  writing: FlexibleItem[];
  facts: string[];
}

const DAY_TARGETS = [15, 15, 15, 10, 15, 15, 15] as const;

const VOCABULARY_INSTRUCTION = 'Choose the correct meaning.';
const GRAMMAR_INSTRUCTION = 'Choose the correct answer.';
const RECOGNITION_INSTRUCTION = 'Listen and choose the correct sentence.';
const READING_INSTRUCTION = 'Read and choose the correct answer.';
const WRITING_INSTRUCTION = 'Write the correct answer.';
const SPEAKING_INSTRUCTION = 'Listen and repeat. Then say the sentence aloud.';
const REVIEW_INSTRUCTION = 'Review the lesson and choose the correct answer.';

function uniqueAccepted(correct: string, accepted?: string[]): string[] | undefined {
  const values = [...new Set((accepted ?? []).map((value) => value.trim()).filter(Boolean))];
  const filtered = values.filter((value) => value !== correct.trim());
  return filtered.length ? filtered : undefined;
}

function createExerciseId(lessonId: string, dayNumber: number, exerciseNumber: number): string {
  return `${lessonId}_d${dayNumber}_e${exerciseNumber}`;
}

function compactOptions(correct: string, distractors?: string[], fallback?: string[]): string[] {
  const values = [correct, ...(distractors ?? []), ...(fallback ?? [])]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  const unique = [...new Set(values)];
  return unique.slice(0, 4);
}

function cycleToCount<T>(items: T[], count: number, label: string): T[] {
  if (!items.length) {
    throw new Error(`${label} must have at least 1 item.`);
  }

  return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

function firstText(item: FlexibleItem, keys: Array<keyof FlexibleItem>, fallback = ''): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
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
  const lessonId = `wb9_l${lessonNumber}`;

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

function buildVocabularySeeds(config: Workbook9LessonConfig): ChoiceSeed[] {
  const fallbackMeanings = config.vocab
    .map((item) => firstText(item, ['meaning', 'definition', 'answer', 'correct']))
    .filter(Boolean);

  return config.vocab.map((item) => {
    const term = firstText(item, ['term', 'word', 'text', 'prompt', 'audio']);
    const correct = firstText(item, ['meaning', 'definition', 'answer', 'correct']);
    const example = firstText(item, ['example']);

    return {
      audio: term,
      display: example ? `${term}\n${example}` : term,
      correct,
      options: compactOptions(correct, item.distractors, fallbackMeanings),
      accepted: item.accepted,
      translation: item.translation,
      isNewVocab: true,
      instruction: VOCABULARY_INSTRUCTION,
    };
  });
}

function buildGrammarSeeds(config: Workbook9LessonConfig): ChoiceSeed[] {
  const fallbackAnswers = config.grammar
    .map((item) => firstText(item, ['answer', 'correct']))
    .filter(Boolean);

  return config.grammar.map((item) => {
    const prompt = firstText(item, ['prompt', 'question', 'text', 'audio']);
    const correct = firstText(item, ['answer', 'correct']);
    const explanation = firstText(item, ['correction', 'feedback', 'explanation']);

    return {
      audio: prompt,
      display: prompt,
      correct,
      options: compactOptions(correct, item.distractors, fallbackAnswers),
      accepted: item.accepted,
      translation: item.translation,
      fullSentenceAfterAnswer: explanation,
      instruction: GRAMMAR_INSTRUCTION,
    };
  });
}

function buildRecognitionSeeds(config: Workbook9LessonConfig): ChoiceSeed[] {
  const fallbackSentences = config.listening
    .map((item) => firstText(item, ['answer', 'correct', 'audio', 'text']))
    .filter(Boolean);

  return config.listening.map((item) => {
    const audio = firstText(item, ['audio', 'text', 'prompt']);
    const correct = firstText(item, ['answer', 'correct', 'audio', 'text'], audio);

    return {
      audio,
      display: audio,
      correct,
      options: compactOptions(correct, item.distractors, fallbackSentences),
      accepted: item.accepted,
      translation: item.translation,
      instruction: RECOGNITION_INSTRUCTION,
      type: 'identification',
    };
  });
}

function buildWritingSeeds(config: Workbook9LessonConfig): WritingSeed[] {
  return config.writing.map((item) => {
    const prompt = firstText(item, ['prompt', 'question', 'text', 'audio']);
    const correct = firstText(item, ['answer', 'correct']);
    const hasBlank = hasBlankPlaceholder(prompt);

    return {
      audio: prompt,
      display: prompt,
      audioBeforeAnswer: hasBlank ? buildBlankAudioText(prompt) : undefined,
      correct,
      accepted: item.accepted,
      translation: item.translation,
      fullSentenceAfterAnswer: hasBlank ? buildFullSentenceFromPrompt(prompt, correct) : correct,
      instruction: WRITING_INSTRUCTION,
    };
  });
}

function buildSpeakingSeeds(config: Workbook9LessonConfig): SpeakingSeed[] {
  return config.speakingPrompts.map((item) => {
    if (typeof item === 'string') {
      return {
        audio: item,
        display: item,
        correct: item,
        instruction: SPEAKING_INSTRUCTION,
      };
    }

    const prompt = firstText(item, ['prompt', 'question', 'text', 'audio']);
    const correct = firstText(item, ['answer', 'correct', 'prompt', 'question', 'text', 'audio'], prompt);

    return {
      audio: prompt,
      display: prompt,
      correct,
      accepted: item.accepted,
      translation: item.translation,
      instruction: SPEAKING_INSTRUCTION,
    };
  });
}

function buildFactSeeds(config: Workbook9LessonConfig): ChoiceSeed[] {
  const fallbackFacts = config.facts.filter(Boolean);

  return config.facts.map((fact) => ({
    audio: fact,
    display: fact,
    correct: fact,
    options: compactOptions(fact, undefined, fallbackFacts),
    instruction: READING_INSTRUCTION,
    type: 'identification',
  }));
}

function validateWorkbook9LessonConfig(config: Workbook9LessonConfig): void {
  if (config.vocab.length < 10) {
    throw new Error(`Lesson ${config.number}: 'vocab' array must have at least 10 items.`);
  }

  if (config.grammar.length < 10) {
    throw new Error(`Lesson ${config.number}: 'grammar' array must have at least 10 items.`);
  }

  if (config.listening.length < 5) {
    throw new Error(`Lesson ${config.number}: 'listening' array must have at least 5 items.`);
  }

  if (config.speakingPrompts.length < 5) {
    throw new Error(`Lesson ${config.number}: 'speakingPrompts' array must have at least 5 items.`);
  }

  if (config.writing.length < 5) {
    throw new Error(`Lesson ${config.number}: 'writing' array must have at least 5 items.`);
  }

  if (config.facts.length < 5) {
    throw new Error(`Lesson ${config.number}: 'facts' array must have at least 5 items.`);
  }

  for (let i = 0; i < 5; i += 1) {
    const grammarItem = config.grammar[i];

    if (!grammarItem?.correction && !grammarItem?.feedback && !grammarItem?.explanation) {
      throw new Error(`Lesson ${config.number}: grammar item ${i + 1} is missing a correction seed.`);
    }
  }
}

export function buildWorkbook9Lesson(config: Workbook9LessonConfig): Lesson {
  validateWorkbook9LessonConfig(config);

  const vocabularyExercises = makeChoices(buildVocabularySeeds(config), VOCABULARY_INSTRUCTION);
  const grammarExercises = makeChoices(buildGrammarSeeds(config), GRAMMAR_INSTRUCTION);
  const recognitionExercises = makeChoices(
    buildRecognitionSeeds(config),
    RECOGNITION_INSTRUCTION,
    'identification',
  );
  const writingExercises = makeWritings(buildWritingSeeds(config), WRITING_INSTRUCTION);
  const speakingExercises = makeSpeakings(buildSpeakingSeeds(config), SPEAKING_INSTRUCTION);
  const factExercises = makeChoices(buildFactSeeds(config), READING_INSTRUCTION, 'identification');

  const reviewPool = [
    ...vocabularyExercises.slice(0, 3),
    ...grammarExercises.slice(0, 4),
    ...recognitionExercises.slice(0, 3),
    ...writingExercises.slice(0, 2),
    ...speakingExercises.slice(0, 1),
    ...factExercises.slice(0, 2),
  ];

  return buildLesson(config.number, config.title, [
    {
      type: 'practice',
      exercises: cycleToCount(vocabularyExercises, DAY_TARGETS[0], `Lesson ${config.number} vocabulary exercises`),
    },
    {
      type: 'practice',
      exercises: cycleToCount(grammarExercises, DAY_TARGETS[1], `Lesson ${config.number} grammar exercises`),
    },
    {
      type: 'practice',
      exercises: cycleToCount(recognitionExercises, DAY_TARGETS[2], `Lesson ${config.number} recognition exercises`),
    },
    {
      type: 'practice',
      exercises: cycleToCount(speakingExercises, DAY_TARGETS[3], `Lesson ${config.number} speaking exercises`),
    },
    {
      type: 'practice',
      exercises: cycleToCount(writingExercises, DAY_TARGETS[4], `Lesson ${config.number} writing exercises`),
    },
    {
      type: 'practice',
      exercises: cycleToCount(factExercises, DAY_TARGETS[5], `Lesson ${config.number} reading exercises`),
    },
    {
      type: 'review',
      exercises: cycleToCount(reviewPool, DAY_TARGETS[6], `Lesson ${config.number} review exercises`),
    },
  ]);
}
