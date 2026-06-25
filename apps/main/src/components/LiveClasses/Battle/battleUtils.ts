import type {
  BattleAnswer,
  BattleConfig,
  BattleParticipant,
  BattleQuestion,
  BattleRosterParticipant,
  BattleSession,
  SavedBattleTemplate,
  BattleTemplateLanguage,
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

export function normalizeBattleDuration(value: unknown, fallback = 10): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;

  if (!Number.isFinite(numericValue)) {
    return clamp(Math.round(fallback), 5, 180);
  }

  return clamp(Math.round(numericValue), 5, 180);
}

export function normalizeBattleTemplateLanguage(value?: string): BattleTemplateLanguage {
  if (value === 'pt' || value === 'es' || value === 'el' || value === 'he') {
    return value;
  }

  return 'en';
}

const BATTLE_MOJIBAKE_PATTERN = /[ÃƒÃ‚Ã¢Ã°ÃÃ‘ÃŽÃï¿½]/;

function looksLikeMojibake(value: string): boolean {
  return BATTLE_MOJIBAKE_PATTERN.test(value);
}

function countMojibakeMarkers(value: string): number {
  return (value.match(/[ÃƒÃ‚Ã¢Ã°ÃÃ‘ÃŽÃï¿½]/g) ?? []).length;
}

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function repairBattleTextEncoding(value?: string): string | undefined {
  const original = value?.trim();
  if (!original) return undefined;

  let current = original;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!looksLikeMojibake(current)) break;

    let decoded: string;
    try {
      decoded = decodeLatin1AsUtf8(current);
    } catch {
      break;
    }

    if (decoded === current) break;
    if (countMojibakeMarkers(decoded) > countMojibakeMarkers(current)) break;
    current = decoded;
  }

  return current;
}

function stripUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

export function getBattleLanguage(courseId?: string): BattleTemplateLanguage {
  if (courseId === 'portuguese_foreigners') return 'pt';
  if (courseId === 'spanish') return 'es';
  if (courseId === 'greek_koine') return 'el';
  if (courseId === 'hebrew_biblical') return 'he';
  return 'en';
}

export function getBattleCourseIdForLanguage(language: BattleTemplateLanguage): string {
  switch (language) {
    case 'pt':
      return 'portuguese_foreigners';
    case 'es':
      return 'spanish';
    case 'el':
      return 'greek_koine';
    case 'he':
      return 'hebrew_biblical';
    default:
      return 'english';
  }
}

export function getSavedBattleTemplateLanguage(
  template?: Pick<SavedBattleTemplate, 'language' | 'config'> | null,
): BattleTemplateLanguage {
  return normalizeBattleTemplateLanguage(template?.language ?? getBattleLanguage(template?.config?.courseId));
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
  return repairBattleTextEncoding(question.promptAudioText)
    || repairBattleTextEncoding(question.text)
    || '';
}

export function getBattleCorrectAnswerLabel(question: BattleQuestion): string {
  if (isChoiceQuestion(question)) {
    if (!question.options) return '';
    return getBattleCorrectIndexes(question)
      .map((index) => repairBattleTextEncoding(question.options?.[index]) ?? '')
      .filter(Boolean)
      .join(' • ');
  }

  return repairBattleTextEncoding(question.correctText)
    || repairBattleTextEncoding(question.acceptedAnswers?.[0])
    || '';
}

function extractPromptSentenceWithBlank(value?: string): string | undefined {
  const normalized = repairBattleTextEncoding(value);
  if (!normalized) return undefined;
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.includes('___'));
}

function inferBlankSubject(sentenceWithBlank: string): string | undefined {
  const [beforeBlank] = sentenceWithBlank.split('___');
  const subject = beforeBlank
    .replace(/[^\p{L}\p{N}\s'’-]+$/u, '')
    .trim();
  return subject || undefined;
}

function isLikelyPluralSubject(subject: string): boolean {
  const normalized = subject.trim().toLowerCase();
  if (!normalized) return false;
  if (/^(i|you|we|they)\b/.test(normalized)) return true;
  if (/\band\b/.test(normalized)) return true;
  const words = normalized.split(/\s+/);
  const lastWord = words[words.length - 1] ?? '';
  if (/(ss|us|is)$/.test(lastWord)) return false;
  return /s$/.test(lastWord);
}

export function buildBattleGeneratedHint(promptText?: string, correctAnswer?: string): string | undefined {
  const sentenceWithBlank = extractPromptSentenceWithBlank(promptText);
  const answer = repairBattleTextEncoding(correctAnswer)?.trim();
  if (!sentenceWithBlank || !answer) return undefined;

  const subject = inferBlankSubject(sentenceWithBlank);
  if (!subject) return undefined;

  const pluralSubject = isLikelyPluralSubject(subject);
  const normalizedAnswer = answer.toLowerCase();

  if (normalizedAnswer === 'is') {
    return pluralSubject
      ? `Use "${answer}" only with a singular subject here.`
      : `Use "${answer}" because "${subject}" is singular.`;
  }

  if (normalizedAnswer === 'are') {
    return pluralSubject
      ? `Use "${answer}" because "${subject}" is plural.`
      : `Use "${answer}" with plural subjects, not singular ones.`;
  }

  if (normalizedAnswer === 'has') {
    return pluralSubject
      ? `Use "${answer}" only with third-person singular subjects.`
      : `Use "${answer}" because "${subject}" is third-person singular.`;
  }

  if (normalizedAnswer === 'have') {
    return pluralSubject
      ? `Use "${answer}" because "${subject}" is not third-person singular.`
      : undefined;
  }

  if (/(ies|es|s)$/.test(normalizedAnswer) && !/(ss)$/.test(normalizedAnswer)) {
    return pluralSubject
      ? `Use "${answer}" only with third-person singular subjects in the simple present.`
      : `Use "${answer}" because "${subject}" is third-person singular, so the verb takes -s.`;
  }

  if (/^[a-z]+$/i.test(answer)) {
    return pluralSubject
      ? `Use "${answer}" because "${subject}" uses the base verb in the simple present.`
      : `Use "${answer}" for the base form here.`;
  }

  return undefined;
}

export function getBattleQuestionDuration(
  question: BattleQuestion | null | undefined,
  configOrFallback?: BattleConfig | number | null,
): number {
  const fallback =
    typeof configOrFallback === 'number'
      ? configOrFallback
      : configOrFallback?.timePerQuestion ?? 10;
  return normalizeBattleDuration(question?.durationSeconds, fallback);
}

function normalizeBattleText(value: string): string {
  return (repairBattleTextEncoding(value) ?? value)
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = repairBattleTextEncoding(value);
  return trimmed ? trimmed : undefined;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function sanitizeBattleQuestion(question: BattleQuestion): BattleQuestion | null {
  const id = normalizeOptionalText(question.id) ?? `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const text = normalizeOptionalText(question.text);
  const kind = question.kind ?? 'multiple-choice';
  const normalizedDuration =
    question.durationSeconds == null
      ? undefined
      : normalizeBattleDuration(question.durationSeconds);
  if (!text) return null;

  if (isChoiceQuestion(question)) {
    const options = uniqueValues(
      (question.options ?? [])
        .map((option) => repairBattleTextEncoding(option) ?? option.trim())
        .map((option) => option.trim())
    );
    if (options.length < 2 && kind !== 'speaking' && kind !== 'audio-open') return null;

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
      kind,
      text,
      options,
      correctIndex: correctIndexes[0],
      correctIndexes,
      ...(normalizedDuration ? { durationSeconds: normalizedDuration } : {}),
      ...(normalizeOptionalText(question.hint) ? { hint: normalizeOptionalText(question.hint) } : {}),
      ...(normalizeOptionalText(question.imageUrl) ? { imageUrl: normalizeOptionalText(question.imageUrl) } : {}),
      ...(normalizeOptionalText(question.promptAudioText) ? { promptAudioText: normalizeOptionalText(question.promptAudioText) } : {}),
      ...(question.playAudioOnce ? { playAudioOnce: true } : {}),
    };
  }

  const acceptedAnswers = uniqueValues([
    normalizeOptionalText(question.correctText) ?? '',
    ...((question.acceptedAnswers ?? [])
      .map((answer) => repairBattleTextEncoding(answer) ?? answer.trim())
      .map((answer) => answer.trim())),
  ]);
  if (acceptedAnswers.length === 0) return null;

  const correctText = acceptedAnswers[0];

  return {
    id,
    kind,
    text,
    correctText,
    acceptedAnswers,
    playAudioOnce: question.playAudioOnce !== false,
    ...(normalizedDuration ? { durationSeconds: normalizedDuration } : {}),
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
  // scores may be empty - teacher is still included via explicit add.
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
      correctAnswersCount: 0,
      streak: 0,
      lastAnswerCorrect: null,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
      bestElapsedMs: null,
      lastPlacement: null,
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

  const elapsedSeconds = Math.ceil(elapsedMs / 1000);
  return {
    elapsedMs,
    roundPoints: Math.max(0, 1000 - elapsedSeconds),
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
    score: (previous?.score ?? 0) + (isCorrect ? roundPoints : 0),
    correctAnswersCount: (previous?.correctAnswersCount ?? 0) + (isCorrect ? 1 : 0),
    streak: isCorrect ? (previous?.streak ?? 0) + 1 : 0,
    lastAnswerCorrect: isCorrect,
    firstPlaceCount: previous?.firstPlaceCount ?? 0,
    secondPlaceCount: previous?.secondPlaceCount ?? 0,
    thirdPlaceCount: previous?.thirdPlaceCount ?? 0,
    bestElapsedMs: previous?.bestElapsedMs ?? null,
    lastPlacement: previous?.lastPlacement ?? null,
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
          score: existing.score ?? 0,
          correctAnswersCount: existing.correctAnswersCount ?? 0,
          streak: existing.streak ?? 0,
          firstPlaceCount: existing.firstPlaceCount ?? 0,
          secondPlaceCount: existing.secondPlaceCount ?? 0,
          thirdPlaceCount: existing.thirdPlaceCount ?? 0,
          bestElapsedMs: existing.bestElapsedMs ?? null,
          lastPlacement: existing.lastPlacement ?? null,
          avatarId: participant.avatarId ?? existing.avatarId,
          isBot: participant.isBot ?? existing.isBot,
        })
      : stripUndefinedFields({
          uid: participant.uid,
          name: participant.name,
          score: 0,
          correctAnswersCount: 0,
          streak: 0,
          lastAnswerCorrect: null,
          firstPlaceCount: 0,
          secondPlaceCount: 0,
          thirdPlaceCount: 0,
          bestElapsedMs: null,
          lastPlacement: null,
          avatarId: participant.avatarId,
          isBot: participant.isBot,
        });
  }

  return nextScores;
}

export interface BattleRoundRankingEntry {
  uid: string;
  placement: number;
  isCorrect: boolean | null;
  elapsedMs: number | null;
  answeredAt: number | null;
}

export function buildBattleRoundRanking(
  roundParticipantIds: string[],
  currentAnswers: Record<string, BattleAnswer>,
  questionStartedAt: number
): BattleRoundRankingEntry[] {
  const entries = Array.from(new Set(roundParticipantIds.filter(Boolean))).map((uid) => {
    const answer = currentAnswers[uid];
    const elapsedMs =
      answer?.elapsedMs != null
        ? answer.elapsedMs
        : answer && questionStartedAt > 0
          ? Math.max(0, answer.answeredAt - questionStartedAt)
          : null;

    return {
      uid,
      isCorrect: answer?.isCorrect ?? null,
      elapsedMs,
      answeredAt: answer?.answeredAt ?? null,
    };
  });

  entries.sort((left, right) => {
    const leftCorrectRank = left.isCorrect === true ? 0 : left.isCorrect === false ? 1 : 2;
    const rightCorrectRank = right.isCorrect === true ? 0 : right.isCorrect === false ? 1 : 2;
    if (leftCorrectRank !== rightCorrectRank) return leftCorrectRank - rightCorrectRank;

    const leftAnsweredAt = left.answeredAt ?? Number.MAX_SAFE_INTEGER;
    const rightAnsweredAt = right.answeredAt ?? Number.MAX_SAFE_INTEGER;
    if (leftAnsweredAt !== rightAnsweredAt) return leftAnsweredAt - rightAnsweredAt;

    const leftElapsed = left.elapsedMs ?? Number.MAX_SAFE_INTEGER;
    const rightElapsed = right.elapsedMs ?? Number.MAX_SAFE_INTEGER;
    if (leftElapsed !== rightElapsed) return leftElapsed - rightElapsed;

    return left.uid.localeCompare(right.uid, 'pt-BR');
  });

  return entries.map((entry, index) => ({
    ...entry,
    placement: index + 1,
  }));
}

export function compareBattleParticipantsByRanking(left: BattleParticipant, right: BattleParticipant): number {
  const leftScore = left.score ?? 0;
  const rightScore = right.score ?? 0;
  if (leftScore !== rightScore) return rightScore - leftScore;

  const leftFirstPlaces = left.firstPlaceCount ?? 0;
  const rightFirstPlaces = right.firstPlaceCount ?? 0;
  if (leftFirstPlaces !== rightFirstPlaces) return rightFirstPlaces - leftFirstPlaces;

  const leftSecondPlaces = left.secondPlaceCount ?? 0;
  const rightSecondPlaces = right.secondPlaceCount ?? 0;
  if (leftSecondPlaces !== rightSecondPlaces) return rightSecondPlaces - leftSecondPlaces;

  const leftThirdPlaces = left.thirdPlaceCount ?? 0;
  const rightThirdPlaces = right.thirdPlaceCount ?? 0;
  if (leftThirdPlaces !== rightThirdPlaces) return rightThirdPlaces - leftThirdPlaces;

  const leftBestElapsed = left.bestElapsedMs ?? Number.MAX_SAFE_INTEGER;
  const rightBestElapsed = right.bestElapsedMs ?? Number.MAX_SAFE_INTEGER;
  if (leftBestElapsed !== rightBestElapsed) return leftBestElapsed - rightBestElapsed;

  const leftPlacement = left.lastPlacement ?? Number.MAX_SAFE_INTEGER;
  const rightPlacement = right.lastPlacement ?? Number.MAX_SAFE_INTEGER;
  if (leftPlacement !== rightPlacement) return leftPlacement - rightPlacement;

  return left.name.localeCompare(right.name, 'pt-BR');
}

export function buildBattleRoundParticipantsSnapshot(params: {
  session: BattleSession;
  activeParticipants: Array<{ uid: string; name: string }>;
  teacherUid: string;
  teacherName: string;
  includeExpectedParticipants?: boolean;
}): BattleRosterParticipant[] {
  const {
    session,
    activeParticipants,
    teacherUid,
    teacherName,
    includeExpectedParticipants = true,
  } = params;
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

  if (includeExpectedParticipants) {
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
  }

  if (shouldIncludeTeacher && teacherUid && !participantMap.has(teacherUid)) {
    participantMap.set(
      teacherUid,
      buildBattleRosterParticipant(
        teacherUid,
        session.participants?.[teacherUid]?.name ??
          session.scores?.[teacherUid]?.name ??
          teacherName,
        session.participants?.[teacherUid]?.joinedAt ?? session.createdAt,
        {
          avatarId: session.participants?.[teacherUid]?.avatarId ?? session.scores?.[teacherUid]?.avatarId,
          isBot: false,
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
  const totalMs = getBattleQuestionDuration(question, session.config) * 1000;
  const accuracyByDifficulty: Record<BattleConfig['difficulty'], number> = {
    easy: 0.82,
    normal: 0.67,
    hard: 0.52,
  };
  const shouldAnswerCorrectly = Math.random() < accuracyByDifficulty[session.config.difficulty];
  // Keep the bot fast so it does not hold the round open after the human answers.
  const minDelay = Math.min(totalMs - 250, 350);
  const maxDelay = Math.min(totalMs - 150, Math.max(minDelay, 1100));
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
    language: getBattleLanguage(config.courseId),
    config,
    questions: sanitizeBattleQuestions(questions),
  };
}
