import type { Day, Exercise, Lesson } from '../../types.ts';

const PRACTICE_COUNTS = [15, 15, 15, 10, 15, 10] as const;
const FINAL_TEST_COUNTS = { listeningWriting: 8, shadowing: 6, speaking: 6 } as const;

function semanticKey(exercise: Exercise): string {
  return `${selectionAudio(exercise)}|${selectionAnswer(exercise)}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function takeDiverse(
  candidates: Exercise[],
  count: number,
  used: Set<string>,
  keyOf: (exercise: Exercise) => string = semanticKey,
): Exercise[] {
  const available = [...new Map(
    candidates
      .filter((exercise) => !used.has(keyOf(exercise)))
      .map((exercise) => [keyOf(exercise), exercise] as const),
  ).values()];
  const selected: Exercise[] = [];
  for (let index = 0; index < count && available.length; index += 1) {
    const target = Math.min(available.length - 1, Math.floor((index * available.length) / count));
    const [exercise] = available.splice(target, 1);
    selected.push(exercise);
    used.add(keyOf(exercise));
  }
  return selected;
}

function uniqueByAudio(candidates: Exercise[]): Exercise[] {
  return [...new Map(candidates.map((exercise) => [selectionAudio(exercise).toLowerCase().trim(), exercise] as const)).values()];
}

function sourceAudio(exercise: Exercise): string {
  return exercise.audioValue?.trim() || exercise.correctValue.trim();
}

function selectionAudio(exercise: Exercise): string {
  return exercise.finalTestSelectionAudio?.trim() || sourceAudio(exercise);
}

function selectionAnswer(exercise: Exercise): string {
  return exercise.finalTestSelectionAnswer?.trim() || exercise.correctValue.trim();
}

function isUsableSpeakingSource(exercise: Exercise): boolean {
  const answer = exercise.correctValue.trim();
  return exercise.finalTestSpeakingEligible !== false
    && Boolean(answer)
    && selectionAudio(exercise).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      !== selectionAnswer(exercise).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    && !/repeat|shadow|dialogue|read aloud/i.test(exercise.instruction)
    && !/___/.test(sourceAudio(exercise))
    && !/\bi am years old\b/i.test(answer)
    && !/\b(?:my|her|his) name is$/i.test(answer);
}

function isFallbackSpeakingSource(exercise: Exercise): boolean {
  return exercise.finalTestSpeakingEligible !== false
    && Boolean(exercise.correctValue.trim())
    && !/repeat|shadow|dialogue|read aloud/i.test(exercise.instruction)
    && !/___/.test(sourceAudio(exercise));
}

function asListeningWriting(source: Exercise, targetId: string, objective: string): Exercise {
  const heardText = selectionAudio(source);
  return {
    ...source,
    id: targetId,
    type: 'writing',
    assessmentMode: 'listening-writing',
    coverageObjective: objective,
    instruction: 'Listen and write exactly what you hear.',
    audioValue: heardText,
    displayValue: undefined,
    options: undefined,
    correctValue: heardText,
    acceptedAnswers: [heardText, ...(source.acceptedAnswers ?? [])],
    promptMode: undefined,
    finalTestSelectionAudio: undefined,
    finalTestSelectionAnswer: undefined,
  };
}

function asShadowing(source: Exercise, targetId: string, objective: string): Exercise {
  const model = selectionAudio(source);
  return {
    ...source,
    id: targetId,
    type: 'speaking',
    assessmentMode: 'shadowing',
    coverageObjective: objective,
    instruction: 'Listen and repeat exactly what you hear.',
    audioValue: model,
    displayValue: undefined,
    options: undefined,
    correctValue: model,
    acceptedAnswers: [model],
    promptMode: undefined,
    finalTestSelectionAudio: undefined,
    finalTestSelectionAnswer: undefined,
  };
}

function speakingPrompt(source: Exercise): string {
  const audio = selectionAudio(source);
  if (/\?\s*$/.test(audio)) return audio;
  const displayQuestion = source.displayValue?.match(/(?:^|:\s*)([^:?]+\?)\s*$/);
  if (displayQuestion) return displayQuestion[1].trim();
  const completionContext = [source.displayValue, source.instruction]
    .find((value) => /___/.test(value ?? ''))
    ?.replace(/[.?]+$/, '')
    .trim();
  if (completionContext) {
    const label = /^(?:a|an|the)$/i.test(source.correctValue.trim()) ? 'article' : 'word';
    return `Which ${label} completes this sentence: "${completionContext}"?`;
  }
  const instructionQuestion = source.instruction.match(/^[^?]+\?/);
  if (instructionQuestion) return instructionQuestion[0].trim();
  const translationParts = source.translation?.split('=').map((value) => value.trim()).filter(Boolean);
  if (translationParts?.length === 2) {
    const [english, support] = translationParts;
    if (english.toLowerCase() === source.correctValue.trim().toLowerCase()) {
      return `What is "${support}" in English?`;
    }
  }
  const context = source.displayValue?.trim() || source.instruction.replace(/[.?]+$/, '').trim();
  return `How do you answer this prompt aloud: "${context}"?`;
}

function asSpeaking(source: Exercise, targetId: string, objective: string): Exercise {
  return {
    ...source,
    id: targetId,
    type: 'speaking',
    assessmentMode: 'speaking',
    coverageObjective: objective,
    instruction: 'Listen and answer aloud in English.',
    audioValue: speakingPrompt(source),
    displayValue: source.displayValue,
    options: undefined,
    correctValue: source.correctValue,
    acceptedAnswers: [source.correctValue, ...(source.acceptedAnswers ?? [])],
    promptMode: undefined,
    finalTestSelectionAudio: undefined,
    finalTestSelectionAnswer: undefined,
  };
}

const WORKBOOK1_EFFECTIVE_EXERCISE_FIXES: Record<string, Partial<Exercise>> = {
  wb1_l6_d6_e7: {
    type: 'writing',
    assessmentMode: undefined,
    instruction: 'Translate into English.',
    displayValue: 'Bom dia, professor. Como você está?',
    audioValue: '',
    correctValue: 'Good morning, teacher. How are you?',
    acceptedAnswers: undefined,
  },
  wb1_l2_final_v2_speak_1: {
    instruction: 'Listen and answer aloud in English.',
    displayValue: 'fa-kite',
    audioValue: 'What is this?',
    correctValue: 'This is a kite.',
    acceptedAnswers: ['It is a kite.', "It's a kite."],
  },
  wb1_l2_final_v2_speak_5: {
    instruction: 'Complete the sentence aloud in English.',
    displayValue: 'It is ___ apple.',
    audioValue: '',
    correctValue: 'It is an apple.',
    acceptedAnswers: undefined,
  },
  wb1_l2_final_v2_speak_6: {
    instruction: 'Listen and answer aloud in English.',
    displayValue: undefined,
    audioValue: 'What is "sol" in English?',
    correctValue: 'sun',
    acceptedAnswers: undefined,
  },
  wb1_l3_final_v2_listen_write_3: { displayValue: 'Name: Daniel', acceptedAnswers: undefined },
  wb1_l3_final_v2_listen_write_8: { displayValue: 'Name: Daniel', acceptedAnswers: undefined },
  wb1_l3_final_v2_speak_3: {
    displayValue: undefined,
    audioValue: 'He takes a shower and gets dressed. What does he do after waking up?',
    correctValue: 'He takes a shower.',
    acceptedAnswers: undefined,
  },
  wb1_l4_final_v2_listen_write_1: { displayValue: 'Name: Daniel', acceptedAnswers: undefined },
  wb1_l4_final_v2_listen_write_4: { displayValue: 'Name: Emily', acceptedAnswers: undefined },
  wb1_l4_final_v2_listen_write_5: { acceptedAnswers: undefined },
  wb1_l4_final_v2_listen_write_6: { acceptedAnswers: undefined },
  wb1_l4_final_v2_speak_3: {
    displayValue: undefined,
    correctValue: 'Anna is first in line.',
    acceptedAnswers: ['Anna is first.'],
  },
  wb1_l5_final_v2_speak_1: {
    correctValue: 'My name is Ana.',
    acceptedAnswers: ['My name is {name}.', 'I am {name}.'],
  },
  wb1_l6_final_v2_listen_write_4: { acceptedAnswers: ['My name is Ana.'] },
  wb1_l6_final_v2_listen_write_5: { acceptedAnswers: ['Good afternoon, Anna.'] },
  wb1_l6_final_v2_listen_write_6: {
    audioValue: 'Good morning! My name is Ben.',
    correctValue: 'Good morning! My name is Ben.',
    acceptedAnswers: undefined,
  },
  wb1_l6_final_v2_listen_write_7: { acceptedAnswers: ['Are Ben and Ana happy?'] },
  wb1_l6_final_v2_listen_write_8: {
    displayValue: undefined,
    audioValue: 'See you',
    correctValue: 'See you',
    acceptedAnswers: undefined,
  },
  wb1_l6_final_v2_speak_3: {
    displayValue: 'fa-chalkboard-user',
    audioValue: 'Where is Ben?',
    correctValue: 'Ben is in the classroom.',
    acceptedAnswers: ['He is in the classroom.'],
  },
  wb1_l6_final_v2_speak_4: { displayValue: undefined, acceptedAnswers: undefined },
  wb1_l6_final_v2_speak_5: { displayValue: undefined, acceptedAnswers: undefined },
  wb1_l6_final_v2_speak_6: {
    displayValue: undefined,
    correctValue: 'His name is Ben.',
    acceptedAnswers: ["The boy's name is Ben."],
  },
  wb1_l6_final_v2_shadow_6: {
    audioValue: 'Good morning, teacher. Hello, friends. Goodbye. See you!',
    correctValue: 'Good morning, teacher. Hello, friends. Goodbye. See you!',
    acceptedAnswers: ['Good morning, teacher. Hello, friends. Goodbye. See you!'],
    sourceExerciseId: 'wb1_l6_d6_e7',
  },
  wb1_l7_final_v2_listen_write_1: { acceptedAnswers: undefined },
  wb1_l7_final_v2_listen_write_5: { acceptedAnswers: undefined },
  wb1_l7_final_v2_listen_write_6: { acceptedAnswers: undefined },
  wb1_l7_final_v2_speak_2: {
    type: 'speaking',
    assessmentMode: 'speaking',
    instruction: 'Listen and answer aloud in English.',
    displayValue: undefined,
    audioValue: 'It is the first month of the year. What month is it?',
    correctValue: 'It is January.',
    acceptedAnswers: ['The month is January.', 'January is the first month of the year.'],
    requiresCompleteSpokenAnswer: true,
  },
  wb1_l7_final_v2_speak_3: {
    type: 'speaking',
    assessmentMode: 'speaking',
    instruction: 'Listen and answer aloud in English.',
    displayValue: undefined,
    audioValue: 'It comes after April. What month is it?',
    correctValue: 'It is May.',
    acceptedAnswers: ['The month is May.', 'May comes after April.'],
    requiresCompleteSpokenAnswer: true,
  },
  wb1_l8_final_v2_listen_write_3: { acceptedAnswers: ['Lukas is not afraid.'] },
  wb1_l8_final_v2_listen_write_6: { acceptedAnswers: undefined },
  wb1_l8_final_v2_listen_write_7: {
    audioValue: "Lucas is near the lion. He isn't afraid.",
    correctValue: "Lucas is near the lion. He isn't afraid.",
    acceptedAnswers: ["Lukas is near the lion. He isn't afraid."],
  },
  wb1_l8_final_v2_speak_4: {
    displayValue: 'Answer the question: Is Emily near the giraffes?',
    audioValue: 'Is Emily near the giraffes?',
    correctValue: 'Yes, she is.',
    acceptedAnswers: ['Yes, she is.'],
  },
  wb1_l9_final_v2_listen_write_1: { acceptedAnswers: ['Hi! I’m Sophia.'] },
  wb1_l9_final_v2_listen_write_3: { acceptedAnswers: ['Hi, Sophia! I’m Ben.'] },
  wb1_l9_final_v2_listen_write_6: { displayValue: 'Name: Ben', acceptedAnswers: undefined },
  wb1_l9_final_v2_listen_write_8: { acceptedAnswers: ['How old is Sophia?'] },
  wb1_l10_final_v2_shadow_6: {
    audioValue: "My birthday is in July, and my class is on Monday at nine o'clock.",
    correctValue: "My birthday is in July, and my class is on Monday at nine o'clock.",
    acceptedAnswers: ["My birthday is in July, and my class is on Monday at nine o'clock."],
  },
  wb1_l11_final_v2_listen_write_5: {
    audioValue: "She's in the classroom.",
    correctValue: "She's in the classroom.",
    acceptedAnswers: undefined,
  },
  wb1_l11_final_v2_listen_write_6: {
    acceptedAnswers: ['Who is she? She is Ms. Greene.'],
  },
  wb1_l11_final_v2_listen_write_7: { acceptedAnswers: undefined },
  wb1_l11_final_v2_listen_write_8: { acceptedAnswers: undefined },
  wb1_l11_final_v2_shadow_4: {
    audioValue: "It's on Monday at nine.",
    correctValue: "It's on Monday at nine.",
    acceptedAnswers: undefined,
  },
  wb1_l11_final_v2_speak_1: {
    correctValue: 'My name is Maya.',
    acceptedAnswers: ['My name is {name}.', 'I am {name}.'],
  },
  wb1_l12_final_v2_listen_write_5: { displayValue: 'Name: Ben', acceptedAnswers: undefined },
  wb1_l12_final_v2_shadow_1: {
    audioValue: 'I played a number game and helped Leo.',
    correctValue: 'I played a number game and helped Leo.',
    acceptedAnswers: undefined,
  },
};

function normalizedAnswer(value: string): string {
  return value.toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9{}]+/g, ' ').trim();
}

const PRESERVE_EXACT_ACCEPTED_ANSWERS = new Set([
  'wb1_l6_final_v2_shadow_6',
  'wb1_l8_final_v2_speak_4',
  'wb1_l10_final_v2_shadow_6',
]);

function curateWorkbook1Exercise(exercise: Exercise): Exercise {
  if (!Object.prototype.hasOwnProperty.call(WORKBOOK1_EFFECTIVE_EXERCISE_FIXES, exercise.id)) return exercise;
  const curated = { ...exercise, ...WORKBOOK1_EFFECTIVE_EXERCISE_FIXES[exercise.id] };
  if (PRESERVE_EXACT_ACCEPTED_ANSWERS.has(exercise.id)) return curated;
  if (!curated.acceptedAnswers?.length) return { ...curated, acceptedAnswers: undefined };
  const correctKey = normalizedAnswer(curated.correctValue);
  const seen = new Set<string>();
  const acceptedAnswers = curated.acceptedAnswers.filter((answer) => {
    const key = normalizedAnswer(answer);
    if (!key || key === correctKey || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...curated, acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : undefined };
}

function buildFinalTest(lesson: Lesson, sourcePool: Exercise[]): Exercise[] {
  const speakingUsed = new Set<string>();
  const listeningUsed = new Set<string>();
  const shadowingUsed = new Set<string>();
  const questionCandidates = sourcePool.filter((exercise) =>
    (/\?/.test(selectionAudio(exercise)) || /\?/.test(exercise.instruction))
    && isUsableSpeakingSource(exercise)
  );
  const speakingKey = (exercise: Exercise) => exercise.finalTestSpeakingSelectionKey ?? semanticKey(exercise);
  const speakingSources = takeDiverse(questionCandidates, FINAL_TEST_COUNTS.speaking, speakingUsed, speakingKey);
  if (speakingSources.length < FINAL_TEST_COUNTS.speaking) {
    speakingSources.push(...takeDiverse(sourcePool.filter(isUsableSpeakingSource), FINAL_TEST_COUNTS.speaking - speakingSources.length, speakingUsed, speakingKey));
  }
  if (speakingSources.length < FINAL_TEST_COUNTS.speaking) {
    speakingSources.push(...takeDiverse(sourcePool.filter(isFallbackSpeakingSource), FINAL_TEST_COUNTS.speaking - speakingSources.length, speakingUsed, speakingKey));
  }
  const listeningSources = takeDiverse(uniqueByAudio(sourcePool.filter((exercise) =>
    Boolean(selectionAudio(exercise))
    && !/^(complete|choose|answer from|identify|listen to dialogue|read)/i.test(selectionAudio(exercise))
    && !/___/.test(selectionAudio(exercise))
  )), FINAL_TEST_COUNTS.listeningWriting, listeningUsed);
  const shadowingSources = takeDiverse(
    uniqueByAudio(sourcePool.filter((exercise) => selectionAudio(exercise).split(/\s+/).length >= 2
      && !/^(complete|choose|answer from|identify)/i.test(selectionAudio(exercise))
      && !/___/.test(selectionAudio(exercise)))),
    FINAL_TEST_COUNTS.shadowing,
    shadowingUsed,
  );
  if (shadowingSources.length < FINAL_TEST_COUNTS.shadowing) {
    shadowingSources.push(...takeDiverse(sourcePool, FINAL_TEST_COUNTS.shadowing - shadowingSources.length, shadowingUsed));
  }

  const objective = lesson.title.replace(/^Lesson\s+\d+\s*:\s*/i, '');
  return [
    ...listeningSources.map((source, index) => asListeningWriting(source, `${lesson.id}_final_v2_listen_write_${index + 1}`, objective)),
    ...shadowingSources.map((source, index) => asShadowing(source, `${lesson.id}_final_v2_shadow_${index + 1}`, objective)),
    ...speakingSources.map((source, index) => asSpeaking(source, `${lesson.id}_final_v2_speak_${index + 1}`, objective)),
  ].map(curateWorkbook1Exercise);
}

export function finalizeWorkbook1Lesson(lesson: Lesson): Lesson {
  if (lesson.days.length < 7) return lesson;
  const originalDays = lesson.days.slice(0, 7);
  const day6 = originalDays[5];
  const day7 = originalDays[6];
  const movedFromDay6 = day6.exercises.slice(-5);
  const targetFinalItems = [...day7.exercises.slice(0, 15), ...movedFromDay6];
  // Preserve the authored practice order. Quantitative distribution must never
  // move a greeting, color, or production task ahead of its prerequisite.
  const practicePool = originalDays.slice(0, 6)
    .flatMap((day) => day.exercises)
    .filter((exercise) => !movedFromDay6.some((moved) => moved.id === exercise.id));

  const expectedPracticeTotal = PRACTICE_COUNTS.reduce((sum, count) => sum + count, 0);
  if (practicePool.length !== expectedPracticeTotal || targetFinalItems.length !== 20) return lesson;

  let cursor = 0;
  const days = PRACTICE_COUNTS.map((count, index): Day => {
    const exercises = practicePool.slice(cursor, cursor + count);
    cursor += count;
    return { ...originalDays[index], type: 'practice', exercises };
  });
  // Final Test material may only be derived from the 80 items already taught.
  const sourcePool = practicePool;
  days.push({
    ...day7,
    type: 'review',
    exercises: buildFinalTest(lesson, sourcePool),
  });
  return {
    ...lesson,
    days: days.map((day) => ({
      ...day,
      exercises: day.exercises.map(curateWorkbook1Exercise),
    })),
  };
}
