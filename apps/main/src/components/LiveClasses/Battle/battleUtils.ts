import type { BattleAnswer, BattleConfig, BattleQuestion, BattleSession, SavedBattleTemplate } from './battleTypes';

export function getBattleLanguage(courseId?: string): string {
  if (courseId === 'portuguese_foreigners') return 'pt';
  if (courseId === 'spanish') return 'es';
  if (courseId === 'greek_koine') return 'el';
  if (courseId === 'hebrew_biblical') return 'he';
  return 'en';
}

export function isChoiceQuestion(question: BattleQuestion): boolean {
  return question.kind === 'multiple-choice' || question.kind === 'image-choice' || question.kind === 'audio-choice';
}

export function getBattleCorrectIndexes(question: BattleQuestion): number[] {
  if (!isChoiceQuestion(question)) return [];

  const requestedIndexes = (question.correctIndexes ?? [])
    .filter((index) => Number.isInteger(index))
    .filter((index) => index >= 0 && index < (question.options?.length ?? 0));

  if (requestedIndexes.length > 0) {
    return Array.from(new Set(requestedIndexes)).sort((a, b) => a - b);
  }

  if (typeof question.correctIndex === 'number' && question.correctIndex >= 0) {
    return [question.correctIndex];
  }

  return [];
}

export function getBattlePromptAudioText(question: BattleQuestion): string {
  return question.promptAudioText?.trim() || question.text;
}

export function getBattleCorrectAnswerLabel(question: BattleQuestion): string {
  if (isChoiceQuestion(question)) {
    if (!question.options) return '';
    return getBattleCorrectIndexes(question)
      .map((index) => question.options?.[index] ?? '')
      .filter(Boolean)
      .join(' • ');
  }

  return question.correctText?.trim() || question.acceptedAnswers?.[0]?.trim() || '';
}

function normalizeBattleText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function sanitizeBattleQuestion(question: BattleQuestion): BattleQuestion | null {
  const id = normalizeOptionalText(question.id) ?? `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const text = normalizeOptionalText(question.text);
  if (!text) return null;

  if (isChoiceQuestion(question)) {
    const options = uniqueValues((question.options ?? []).map((option) => option.trim()));
    if (options.length < 2) return null;

    const fallbackCorrectOption = normalizeOptionalText(question.correctText);
    const matchedCorrectIndex = fallbackCorrectOption ? options.findIndex((option) => option === fallbackCorrectOption) : -1;
    const requestedCorrectIndexes = (question.correctIndexes ?? [])
      .filter((index) => Number.isInteger(index))
      .filter((index) => index >= 0 && index < options.length);
    const requestedCorrectIndex = typeof question.correctIndex === 'number' ? question.correctIndex : -1;
    const correctIndexes = uniqueValues([
      ...requestedCorrectIndexes.map(String),
      ...(requestedCorrectIndex >= 0 && requestedCorrectIndex < options.length ? [String(requestedCorrectIndex)] : []),
      ...(matchedCorrectIndex >= 0 ? [String(matchedCorrectIndex)] : []),
    ]).map(Number).sort((a, b) => a - b);

    if (correctIndexes.length === 0) {
      correctIndexes.push(0);
    }

    return {
      id,
      kind: question.kind,
      text,
      options,
      correctIndex: correctIndexes[0],
      correctIndexes,
      ...(normalizeOptionalText(question.hint) ? { hint: normalizeOptionalText(question.hint) } : {}),
      ...(normalizeOptionalText(question.imageUrl) ? { imageUrl: normalizeOptionalText(question.imageUrl) } : {}),
      ...(normalizeOptionalText(question.promptAudioText) ? { promptAudioText: normalizeOptionalText(question.promptAudioText) } : {}),
      ...(question.playAudioOnce ? { playAudioOnce: true } : {}),
    };
  }

  const acceptedAnswers = uniqueValues([
    normalizeOptionalText(question.correctText) ?? '',
    ...((question.acceptedAnswers ?? []).map((answer) => answer.trim())),
  ]);
  if (acceptedAnswers.length === 0) return null;

  const correctText = acceptedAnswers[0];

  return {
    id,
    kind: question.kind,
    text,
    correctText,
    acceptedAnswers,
    playAudioOnce: question.playAudioOnce !== false,
    ...(normalizeOptionalText(question.hint) ? { hint: normalizeOptionalText(question.hint) } : {}),
    ...(normalizeOptionalText(question.imageUrl) ? { imageUrl: normalizeOptionalText(question.imageUrl) } : {}),
    ...(normalizeOptionalText(question.promptAudioText) ? { promptAudioText: normalizeOptionalText(question.promptAudioText) } : {}),
  };
}

export function sanitizeBattleQuestions(questions: BattleQuestion[]): BattleQuestion[] {
  return questions
    .map((question) => sanitizeBattleQuestion(question))
    .filter((question): question is BattleQuestion => question !== null);
}

export function evaluateBattleAnswer(
  question: BattleQuestion,
  payload: { optionIndex?: number; optionIndexes?: number[]; responseText?: string }
): boolean {
  if (isChoiceQuestion(question)) {
    const selectedIndexes = Array.from(new Set([
      ...(payload.optionIndexes ?? []),
      ...(payload.optionIndex != null ? [payload.optionIndex] : []),
    ]))
      .filter((index) => Number.isInteger(index))
      .sort((a, b) => a - b);

    const correctIndexes = getBattleCorrectIndexes(question);
    if (selectedIndexes.length !== correctIndexes.length) return false;
    return selectedIndexes.every((value, index) => value === correctIndexes[index]);
  }

  const response = normalizeBattleText(payload.responseText ?? '');
  if (!response) return false;

  const accepted = [
    question.correctText ?? '',
    ...(question.acceptedAnswers ?? []),
  ]
    .map(normalizeBattleText)
    .filter(Boolean);

  return accepted.includes(response);
}

export function getExpectedBattleParticipantIds(
  session: BattleSession,
  teacherUid: string
): string[] {
  const allParticipantIds = Object.keys(session.scores ?? {});
  if (session.config.includeTeacher) return allParticipantIds;

  const studentIds = allParticipantIds.filter((uid) => uid !== teacherUid);
  if (studentIds.length > 0) return studentIds;
  return [teacherUid];
}

export function buildInitialBattleScores(
  config: BattleConfig,
  teacherUid: string,
  teacherName: string
) {
  if (!config.includeTeacher) return {};

  return {
    [teacherUid]: {
      uid: teacherUid,
      name: teacherName,
      score: 0,
      streak: 0,
      lastAnswerCorrect: null,
    },
  };
}

export function getMyBattleAnswer(
  session: BattleSession,
  uid: string
): BattleAnswer | undefined {
  return session.currentAnswers?.[uid];
}

export function buildSavedBattleTemplate(
  config: BattleConfig,
  questions: BattleQuestion[],
  fallbackTitle?: string
): SavedBattleTemplate {
  const createdAt = new Date().toISOString();
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: fallbackTitle?.trim() || `Learnendo Battle ${formattedDate}`,
    createdAt,
    config,
    questions: sanitizeBattleQuestions(questions),
  };
}
