import type { BattleAnswer, BattleConfig, BattleQuestion, BattleSession } from './battleTypes';

export function getBattleLanguage(courseId?: string): string {
  if (courseId === 'portuguese_foreigners') return 'pt';
  if (courseId === 'spanish') return 'es';
  if (courseId === 'greek_koine') return 'el';
  if (courseId === 'hebrew_biblical') return 'he';
  return 'en';
}

export function isChoiceQuestion(question: BattleQuestion): boolean {
  return question.kind === 'multiple-choice' || question.kind === 'image-choice';
}

export function getBattlePromptAudioText(question: BattleQuestion): string {
  return question.promptAudioText?.trim() || question.text;
}

export function getBattleCorrectAnswerLabel(question: BattleQuestion): string {
  if (isChoiceQuestion(question)) {
    if (!question.options || question.correctIndex == null) return '';
    return question.options[question.correctIndex] ?? '';
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

export function evaluateBattleAnswer(
  question: BattleQuestion,
  payload: { optionIndex?: number; responseText?: string }
): boolean {
  if (isChoiceQuestion(question)) {
    return payload.optionIndex != null && payload.optionIndex === question.correctIndex;
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
  return allParticipantIds.filter((uid) => uid !== teacherUid);
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
