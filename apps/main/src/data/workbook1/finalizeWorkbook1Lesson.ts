import type { Day, Exercise, Lesson } from '../../types.ts';

const PRACTICE_COUNTS = [15, 15, 15, 10, 15, 10] as const;
const FINAL_TEST_COUNTS = { listeningWriting: 8, shadowing: 6, speaking: 6 } as const;

function semanticKey(exercise: Exercise): string {
  return `${sourceAudio(exercise)}|${exercise.correctValue}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function takeDiverse(candidates: Exercise[], count: number, used: Set<string>): Exercise[] {
  const available = [...new Map(
    candidates
      .filter((exercise) => !used.has(semanticKey(exercise)))
      .map((exercise) => [semanticKey(exercise), exercise] as const),
  ).values()];
  const selected: Exercise[] = [];
  for (let index = 0; index < count && available.length; index += 1) {
    const target = Math.min(available.length - 1, Math.floor((index * available.length) / count));
    const [exercise] = available.splice(target, 1);
    selected.push(exercise);
    used.add(semanticKey(exercise));
  }
  return selected;
}

function uniqueByAudio(candidates: Exercise[]): Exercise[] {
  return [...new Map(candidates.map((exercise) => [sourceAudio(exercise).toLowerCase().trim(), exercise] as const)).values()];
}

function sourceAudio(exercise: Exercise): string {
  return exercise.audioValue?.trim() || exercise.correctValue.trim();
}

function isUsableSpeakingSource(exercise: Exercise): boolean {
  const answer = exercise.correctValue.trim();
  return Boolean(answer)
    && semanticKey({ ...exercise, correctValue: sourceAudio(exercise) }) !== semanticKey(exercise)
    && !/repeat|shadow|dialogue|read aloud/i.test(exercise.instruction)
    && !/___/.test(sourceAudio(exercise))
    && !/\bi am years old\b/i.test(answer)
    && !/\b(?:my|her|his) name is$/i.test(answer);
}

function isFallbackSpeakingSource(exercise: Exercise): boolean {
  return Boolean(exercise.correctValue.trim())
    && !/repeat|shadow|dialogue|read aloud/i.test(exercise.instruction)
    && !/___/.test(sourceAudio(exercise));
}

function asListeningWriting(source: Exercise, targetId: string, objective: string): Exercise {
  const heardText = sourceAudio(source);
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
    acceptedAnswers: [heardText],
    promptMode: undefined,
  };
}

function asShadowing(source: Exercise, targetId: string, objective: string): Exercise {
  const model = sourceAudio(source);
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
  };
}

function speakingPrompt(source: Exercise): string {
  const audio = sourceAudio(source);
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
  };
}

function buildFinalTest(lesson: Lesson, sourcePool: Exercise[]): Exercise[] {
  const speakingUsed = new Set<string>();
  const listeningUsed = new Set<string>();
  const shadowingUsed = new Set<string>();
  const questionCandidates = sourcePool.filter((exercise) =>
    (/\?/.test(sourceAudio(exercise)) || /\?/.test(exercise.instruction))
    && isUsableSpeakingSource(exercise)
  );
  const speakingSources = takeDiverse(questionCandidates, FINAL_TEST_COUNTS.speaking, speakingUsed);
  if (speakingSources.length < FINAL_TEST_COUNTS.speaking) {
    speakingSources.push(...takeDiverse(sourcePool.filter(isUsableSpeakingSource), FINAL_TEST_COUNTS.speaking - speakingSources.length, speakingUsed));
  }
  if (speakingSources.length < FINAL_TEST_COUNTS.speaking) {
    speakingSources.push(...takeDiverse(sourcePool.filter(isFallbackSpeakingSource), FINAL_TEST_COUNTS.speaking - speakingSources.length, speakingUsed));
  }
  const listeningSources = takeDiverse(uniqueByAudio(sourcePool.filter((exercise) =>
    Boolean(sourceAudio(exercise))
    && !/^(complete|choose|answer from|identify|listen to dialogue|read)/i.test(sourceAudio(exercise))
    && !/___/.test(sourceAudio(exercise))
  )), FINAL_TEST_COUNTS.listeningWriting, listeningUsed);
  const shadowingSources = takeDiverse(
    uniqueByAudio(sourcePool.filter((exercise) => sourceAudio(exercise).split(/\s+/).length >= 2
      && !/^(complete|choose|answer from|identify)/i.test(sourceAudio(exercise))
      && !/___/.test(sourceAudio(exercise)))),
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
  ];
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
  return { ...lesson, days };
}
