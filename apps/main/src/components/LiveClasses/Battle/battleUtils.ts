import type {
  BattleAnswer,
  BattleConfig,
  BattleParticipant,
  BattleQuestion,
  BattleRosterParticipant,
  BattleSession,
  SavedBattleTemplate,
} from './battleTypes';
import { DEFAULT_BOT_AVATAR_ID } from './botAvatars';

export const BATTLE_BOT_UID = 'learnendo_battle_bot';
export const BATTLE_BOT_NAME = 'Bot Learnendo';

export function isReservedFirestoreFieldKey(value: string): boolean {
  return /^__.*__$/.test(value.trim());
}

export function getBattleBotName(config?: BattleConfig): string {
  return config?.botName?.trim() || BATTLE_BOT_NAME;
}

export function getBattleBotAvatarId(config?: BattleConfig): string {
  return config?.botAvatarId || DEFAULT_BOT_AVATAR_ID;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stripUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

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

export function buildBattleRosterParticipant(
  uid: string,
  name: string,
  joinedAt = Date.now(),
  extra?: Partial<BattleRosterParticipant>
): BattleRosterParticipant {
  return stripUndefinedFields({ uid, name, joinedAt, ...extra });
}

export function buildInitialBattleParticipants(
  config: BattleConfig,
  teacherUid: string,
  teacherName: string
) {
  if (!config.includeTeacher) return {};
  return {
    [teacherUid]: buildBattleRosterParticipant(teacherUid, teacherName),
  };
}

export function getBattleRegisteredParticipantIds(session: BattleSession): string[] {
  const ids = new Set([
    ...Object.keys(session.participants ?? {}),
    ...Object.keys(session.scores ?? {}),
  ]);
  return Array.from(ids);
}

export function getExpectedBattleParticipantIds(
  session: BattleSession,
  teacherUid: string
): string[] {
  const snapshotIds = (session.roundParticipantIds ?? []).filter(Boolean);
  if (snapshotIds.length > 0) {
    return Array.from(new Set(snapshotIds));
  }

  // Teacher is always a participant (always seeded in scores at session creation).
  // Students appear in scores after calling joinBattle().
  // Using a Set ensures no duplicates and handles legacy documents where
  // scores may be empty — teacher is still included via explicit add.
  const ids = new Set(getBattleRegisteredParticipantIds(session));
  if (session.config.includeTeacher) {
    ids.add(teacherUid);
  } else {
    ids.delete(teacherUid);
  }
  return Array.from(ids);
}

export function buildInitialBattleScores(
  config: BattleConfig,
  teacherUid: string,
  teacherName: string
) {
  if (!config.includeTeacher) return {};
  // Teacher is ALWAYS seeded into initial scores so that:
  // 1. getExpectedBattleParticipantIds always includes them
  // 2. solo-teacher mode works without any special-casing
  // 3. teacher name/score appears in the leaderboard from round 1
  // config.includeTeacher is kept in the type for UI labelling purposes only.
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

export function canBattleParticipantAnswerCurrentQuestion(
  session: BattleSession,
  uid: string
): boolean {
  const snapshotIds = (session.roundParticipantIds ?? []).filter(Boolean);
  if (snapshotIds.length > 0) {
    return snapshotIds.includes(uid);
  }

  return getBattleRegisteredParticipantIds(session).includes(uid) || uid in (session.scores ?? {});
}

export function calculateBattleRoundScore(params: {
  answeredAt: number;
  questionStartedAt: number;
  timePerQuestion: number;
  isCorrect: boolean;
}): { elapsedMs: number; roundPoints: number } {
  const elapsedMs = params.questionStartedAt > 0
    ? Math.max(0, params.answeredAt - params.questionStartedAt)
    : 0;

  if (!params.isCorrect) {
    return { elapsedMs, roundPoints: 0 };
  }

  const totalMs = Math.max(1, params.timePerQuestion * 1000);
  const remainingRatio = params.questionStartedAt > 0
    ? clamp((totalMs - elapsedMs) / totalMs, 0, 1)
    : 0;

  return {
    elapsedMs,
    roundPoints: Math.max(0, Math.round(1000 * remainingRatio)),
  };
}

export function buildBattleParticipantScore(
  uid: string,
  name: string,
  previous: BattleParticipant | undefined,
  isCorrect: boolean,
  roundPoints: number
): BattleParticipant {
  return stripUndefinedFields({
    uid,
    name,
    score: (previous?.score ?? 0) + roundPoints,
    streak: isCorrect ? (previous?.streak ?? 0) + 1 : 0,
    lastAnswerCorrect: isCorrect,
    avatarId: previous?.avatarId,
    isBot: previous?.isBot,
  });
}

export function mergeBattleScoresWithParticipants(
  existingScores: Record<string, BattleParticipant>,
  participants: BattleRosterParticipant[]
): Record<string, BattleParticipant> {
  const nextScores = { ...existingScores };

  for (const participant of participants) {
    const existing = nextScores[participant.uid];
    nextScores[participant.uid] = existing
      ? stripUndefinedFields({
          ...existing,
          name: participant.name || existing.name,
          avatarId: participant.avatarId ?? existing.avatarId,
          isBot: participant.isBot ?? existing.isBot,
        })
      : stripUndefinedFields({
          uid: participant.uid,
          name: participant.name,
          score: 0,
          streak: 0,
          lastAnswerCorrect: null,
          avatarId: participant.avatarId,
          isBot: participant.isBot,
        });
  }

  return nextScores;
}

export function buildBattleRoundParticipantsSnapshot(params: {
  session: BattleSession;
  activeParticipants: Array<{ uid: string; name: string }>;
  teacherUid: string;
  teacherName: string;
}): BattleRosterParticipant[] {
  const { session, activeParticipants, teacherUid, teacherName } = params;
  const participantMap = new Map<string, BattleRosterParticipant>();
  const shouldIncludeTeacher = !!session.config.includeTeacher;

  for (const participant of activeParticipants) {
    if (participant.uid === teacherUid && !shouldIncludeTeacher) continue;
    participantMap.set(
      participant.uid,
      buildBattleRosterParticipant(
        participant.uid,
        participant.name,
        session.participants?.[participant.uid]?.joinedAt ?? session.createdAt,
        {
          avatarId: session.participants?.[participant.uid]?.avatarId,
          isBot: session.participants?.[participant.uid]?.isBot,
        }
      )
    );
  }

  for (const pid of getExpectedBattleParticipantIds(session, teacherUid)) {
    if (pid === teacherUid && !shouldIncludeTeacher) continue;
    if (participantMap.has(pid)) continue;
    participantMap.set(
      pid,
      buildBattleRosterParticipant(
        pid,
        pid === teacherUid ? teacherName : getBattleParticipantName(session, pid),
        session.participants?.[pid]?.joinedAt ?? session.createdAt,
        {
          avatarId: session.participants?.[pid]?.avatarId ?? session.scores?.[pid]?.avatarId,
          isBot: session.participants?.[pid]?.isBot ?? session.scores?.[pid]?.isBot,
        }
      )
    );
  }

  if (session.config.botEnabled && !participantMap.has(BATTLE_BOT_UID)) {
    participantMap.set(
      BATTLE_BOT_UID,
      buildBattleRosterParticipant(
        BATTLE_BOT_UID,
        getBattleBotName(session.config),
        session.participants?.[BATTLE_BOT_UID]?.joinedAt ?? Date.now(),
        {
          avatarId: getBattleBotAvatarId(session.config),
          isBot: true,
        }
      )
    );
  }

  return Array.from(participantMap.values());
}

export function buildBotBattlePayload(
  session: BattleSession,
  question: BattleQuestion
): {
  delayMs: number;
  payload: { optionIndex?: number; optionIndexes?: number[]; responseText?: string };
} {
  const totalMs = session.config.timePerQuestion * 1000;
  const accuracyByDifficulty: Record<BattleConfig['difficulty'], number> = {
    easy: 0.82,
    normal: 0.67,
    hard: 0.52,
  };
  const shouldAnswerCorrectly = Math.random() < accuracyByDifficulty[session.config.difficulty];
  const minDelay = Math.min(totalMs - 250, 2000);
  const maxDelay = Math.min(totalMs - 150, Math.max(minDelay, 8000));
  const delayMs = clamp(
    Math.round(minDelay + Math.random() * Math.max(0, maxDelay - minDelay)),
    300,
    Math.max(300, totalMs - 100)
  );

  if (isChoiceQuestion(question)) {
    const correctIndexes = getBattleCorrectIndexes(question);
    const optionCount = question.options?.length ?? 0;
    const wrongIndexes = Array.from({ length: optionCount }, (_, index) => index)
      .filter((index) => !correctIndexes.includes(index));
    const optionIndexes = shouldAnswerCorrectly
      ? correctIndexes
      : wrongIndexes.slice(0, Math.max(1, correctIndexes.length || 1));

    return {
      delayMs,
      payload: {
        optionIndex: optionIndexes[0],
        optionIndexes,
      },
    };
  }

  const correctText = question.correctText?.trim() || question.acceptedAnswers?.[0]?.trim() || '';
  return {
    delayMs,
    payload: {
      responseText: shouldAnswerCorrectly
        ? correctText
        : `${correctText || 'bot'} ...`,
    },
  };
}

export function getBattleParticipantName(
  session: BattleSession,
  uid: string
): string {
  if (uid === BATTLE_BOT_UID) {
    return session.participants?.[uid]?.name ?? session.scores?.[uid]?.name ?? getBattleBotName(session.config);
  }
  return session.participants?.[uid]?.name ?? session.scores?.[uid]?.name ?? uid;
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
