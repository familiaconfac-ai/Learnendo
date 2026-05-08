// Learnendo Battle - Firestore service
// Battle state lives at: liveClasses/{classId}/session/battle

import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  deleteDoc,
  getDoc,
  arrayUnion,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type {
  BattleSession,
  BattleConfig,
  BattleQuestion,
  BattleParticipant,
  BattleAnswer,
  BattleRosterParticipant,
} from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import {
  BATTLE_BOT_UID,
  buildBattleRoundParticipantsSnapshot,
  buildBattleRoundRanking,
  calculateBattleRoundScore,
  canBattleParticipantAnswerCurrentQuestion,
  compareBattleParticipantsByRanking,
  evaluateBattleAnswer,
  getBattleQuestionDuration,
  isReservedFirestoreFieldKey,
  sanitizeBattleQuestions,
} from './battleUtils';

function battleDocRef(classId: string) {
  return doc(db, 'liveClasses', classId, 'session', 'battle');
}

function battleDocPath(classId: string) {
  return `liveClasses/${classId}/session/battle`;
}

function normalizeBattleStatus(status: unknown): BattleSession['status'] {
  switch (status) {
    case 'WAITING':
      return 'WAITING';
    case 'PLAYING':
      return 'PLAYING';
    case 'REVEALED':
      return 'REVEALED';
    case 'FINISHED':
      return 'FINISHED';
    case 'lobby':
      return 'WAITING';
    case 'active':
      return 'PLAYING';
    case 'showing-answer':
      return 'REVEALED';
    case 'finished':
      return 'FINISHED';
    default:
      return 'WAITING';
  }
}

function buildRoundParticipantMap(participants: BattleRosterParticipant[]) {
  return participants.reduce<Record<string, BattleRosterParticipant>>((acc, participant) => {
    if (!participant?.uid) return acc;
    if (isReservedFirestoreFieldKey(participant.uid)) {
      throw new Error(`Invalid battle participant uid for Firestore map key: ${participant.uid}`);
    }
    acc[participant.uid] = omitUndefinedFields({
      uid: participant.uid,
      name: participant.name,
      joinedAt: participant.joinedAt,
      avatarId: participant.avatarId,
      isBot: participant.isBot,
    }) as BattleRosterParticipant;
    return acc;
  }, {});
}

function omitUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

function buildBattleSessionSnapshot(
  classId: string,
  data: Record<string, unknown>,
): BattleSession {
  const answers = (data.answers as Record<string, BattleAnswer> | undefined)
    ?? (data.currentAnswers as Record<string, BattleAnswer> | undefined)
    ?? {};
  const config = (data.config as BattleConfig | undefined);
  const questions = Array.isArray(data.questions) ? data.questions as BattleQuestion[] : [];
  const currentQuestionIndex = typeof data.currentQuestionIndex === 'number' ? data.currentQuestionIndex : 0;
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const roundDurationMs =
    (data.roundDurationMs as number | null | undefined) ??
    (data.durationMs as number | null | undefined) ??
    (config?.timePerQuestion ? getBattleQuestionDuration(currentQuestion, config) * 1000 : null);
  const rawRoundStart =
    (data.roundStartedAt as number | null | undefined) ??
    (typeof data.questionStartedAt === 'number' ? data.questionStartedAt : null);
  const roundStartedAt = typeof rawRoundStart === 'number' && rawRoundStart > 0 ? rawRoundStart : null;
  const normalizedStatus = normalizeBattleStatus(data.status);
  const roundStatus =
    normalizedStatus === 'WAITING'
      ? 'waiting'
      : normalizedStatus === 'PLAYING'
        ? 'active'
        : normalizedStatus === 'REVEALED'
          ? 'revealed'
          : 'finished';
  const endsAt =
    roundStartedAt != null && roundDurationMs != null && roundDurationMs > 0
      ? roundStartedAt + roundDurationMs
      : null;
  const isRevealed =
    (data.isRevealed as boolean | undefined) ??
    (data.showAnswer as boolean | undefined) ??
    (normalizedStatus === 'REVEALED');

  return {
    id: classId,
    ...data,
    liveClassId: (data.liveClassId as string | undefined) ?? classId,
    hostUid: (data.hostUid as string | undefined) ?? undefined,
    status: normalizedStatus,
    roundStatus: (data.roundStatus as BattleSession['roundStatus'] | undefined) ?? roundStatus,
    currentQuestionId:
      (data.currentQuestionId as string | undefined) ??
      (questions[currentQuestionIndex]?.id ?? null) ??
      undefined,
    participants: (data.participants as Record<string, BattleRosterParticipant> | undefined) ?? {},
    roundParticipantIds: Array.isArray(data.roundParticipantIds) ? data.roundParticipantIds as string[] : [],
    scores: (data.scores as Record<string, BattleParticipant> | undefined) ?? {},
    answers,
    currentAnswers: answers,
    answeredCount:
      typeof data.answeredCount === 'number'
        ? data.answeredCount
        : Object.keys(answers).length,
    startedAt: (data.startedAt as number | null | undefined) ?? null,
    roundStartedAt,
    roundDurationMs,
    durationMs: roundDurationMs,
    endsAt,
    isRevealed,
    showAnswer:
      (data.showAnswer as boolean | undefined) ??
      isRevealed,
  } as BattleSession;
}

function isLegacyBattleSessionDocument(data: Record<string, unknown>): boolean {
  const config = data.config as BattleConfig | undefined;
  const questions = data.questions;
  const scores = data.scores;

  return Boolean(
    config &&
    typeof config.timePerQuestion === 'number' &&
    Array.isArray(questions) &&
    scores &&
    typeof scores === 'object'
  );
}

function buildScoresForParticipants(
  existingScores: Record<string, BattleParticipant> = {},
  participants: BattleRosterParticipant[],
  resetScore: boolean
): Record<string, BattleParticipant> {
  const next: Record<string, BattleParticipant> = {};

  for (const participant of participants) {
    if (!participant?.uid) continue;

    const previous = existingScores[participant.uid];
    next[participant.uid] = omitUndefinedFields({
      uid: participant.uid,
      name: previous?.name ?? participant.name,
      score: resetScore ? 0 : previous?.score ?? 0,
      streak: resetScore ? 0 : previous?.streak ?? 0,
      lastAnswerCorrect: resetScore ? null : previous?.lastAnswerCorrect ?? null,
      firstPlaceCount: previous?.firstPlaceCount ?? 0,
      secondPlaceCount: previous?.secondPlaceCount ?? 0,
      thirdPlaceCount: previous?.thirdPlaceCount ?? 0,
      bestElapsedMs: previous?.bestElapsedMs ?? null,
      lastPlacement: resetScore ? null : previous?.lastPlacement ?? null,
      avatarId: previous?.avatarId ?? participant.avatarId,
      isBot: previous?.isBot ?? participant.isBot,
    });
  }

  return next;
}

function buildBattleParticipantRegistryRecord(
  previous: BattleParticipant | undefined,
  identity: { uid: string; name: string; avatarId?: string; isBot?: boolean },
  overrides?: Partial<BattleParticipant>
): BattleParticipant {
  return omitUndefinedFields({
    uid: identity.uid,
    name: previous?.name ?? identity.name,
    score: overrides?.score ?? previous?.score ?? 0,
    streak: overrides?.streak ?? previous?.streak ?? 0,
    lastAnswerCorrect: overrides?.lastAnswerCorrect ?? previous?.lastAnswerCorrect ?? null,
    firstPlaceCount: overrides?.firstPlaceCount ?? previous?.firstPlaceCount ?? 0,
    secondPlaceCount: overrides?.secondPlaceCount ?? previous?.secondPlaceCount ?? 0,
    thirdPlaceCount: overrides?.thirdPlaceCount ?? previous?.thirdPlaceCount ?? 0,
    bestElapsedMs: overrides?.bestElapsedMs ?? previous?.bestElapsedMs ?? null,
    lastPlacement: overrides?.lastPlacement ?? previous?.lastPlacement ?? null,
    avatarId: previous?.avatarId ?? identity.avatarId,
    isBot: previous?.isBot ?? identity.isBot,
  });
}

function getStableRoundParticipantIds(roundParticipantIds: string[] | undefined): string[] {
  return Array.from(new Set((roundParticipantIds ?? []).filter(Boolean)));
}

function haveAllRoundParticipantsAnswered(
  roundParticipantIds: string[] | undefined,
  currentAnswers: Record<string, BattleAnswer> | undefined,
): boolean {
  const participantIds = getStableRoundParticipantIds(roundParticipantIds);
  if (participantIds.length === 0) return false;

  const answers = currentAnswers ?? {};
  return participantIds.every((participantId) => participantId in answers);
}

function applyBattleRoundRankingToScores(params: {
  currentScores: Record<string, BattleParticipant>;
  currentAnswers: Record<string, BattleAnswer>;
  roundParticipantIds: string[];
  participants: Record<string, BattleRosterParticipant>;
  questionStartedAt: number;
}): Record<string, BattleParticipant> {
  const { currentScores, currentAnswers, roundParticipantIds, participants, questionStartedAt } = params;
  const rankedEntries = buildBattleRoundRanking(roundParticipantIds, currentAnswers, questionStartedAt);
  const nextScores = { ...currentScores };

  for (const entry of rankedEntries) {
    const previous = currentScores[entry.uid];
    const identity = participants[entry.uid] ?? {
      uid: entry.uid,
      name: previous?.name ?? entry.uid,
    };
    const placementPoints =
      entry.isCorrect === true
        ? Math.max(1, roundParticipantIds.length - entry.placement + 1)
        : 0;
    const bestElapsedMs =
      entry.isCorrect === true && entry.elapsedMs != null
        ? previous?.bestElapsedMs == null
          ? entry.elapsedMs
          : Math.min(previous.bestElapsedMs, entry.elapsedMs)
        : previous?.bestElapsedMs ?? null;
    nextScores[entry.uid] = buildBattleParticipantRegistryRecord(previous, identity, {
      lastAnswerCorrect: entry.isCorrect,
      score: (previous?.score ?? 0) + placementPoints,
      streak:
        entry.isCorrect === true
          ? (previous?.streak ?? 0) + 1
          : 0,
      firstPlaceCount:
        (previous?.firstPlaceCount ?? 0) + (entry.isCorrect === true && entry.placement === 1 ? 1 : 0),
      secondPlaceCount:
        (previous?.secondPlaceCount ?? 0) + (entry.isCorrect === true && entry.placement === 2 ? 1 : 0),
      thirdPlaceCount:
        (previous?.thirdPlaceCount ?? 0) + (entry.isCorrect === true && entry.placement === 3 ? 1 : 0),
      bestElapsedMs,
      lastPlacement: entry.placement,
    });
  }

  console.info('[BATTLE SESSION STATUS] round ranking applied', {
    roundParticipantIds,
    ranking: rankedEntries.map((entry) => ({
      uid: entry.uid,
      placement: entry.placement,
      isCorrect: entry.isCorrect,
      elapsedMs: entry.elapsedMs,
    })),
  });

  return Object.fromEntries(
    Object.entries(nextScores).sort(([, left], [, right]) => compareBattleParticipantsByRanking(left, right))
  );
}

// Teacher operations

export async function createBattleSession(
  classId: string,
  config: BattleConfig,
  teacherUid: string,
  teacherName: string,
  precomputedQuestions?: BattleQuestion[],
  initialParticipants?: BattleRosterParticipant[],
): Promise<void> {
  const docRef = battleDocRef(classId);
  const docPath = battleDocPath(classId);
  console.info('[BATTLE SERVICE] createBattleSession:start', {
    classId,
    docPath,
    teacherUid,
    questionCount: precomputedQuestions?.length ?? null,
  });
  const generatedQuestions: BattleQuestion[] =
    precomputedQuestions ??
    await getBattleQuestions({
      questionCount: config.questionCount,
      scope: config.scope,
      difficulty: config.difficulty,
      courseId: config.courseId,
      lessonId: config.lessonId,
      workbookId: config.workbookId,
    });

  const questions = sanitizeBattleQuestions(generatedQuestions);
  const firstQuestion = questions[0] ?? null;
  const firstQuestionDuration = getBattleQuestionDuration(firstQuestion, config);

  if (questions.length === 0) {
    throw new Error('Nenhuma pergunta valida foi encontrada para iniciar o Battle.');
  }

  const seededParticipants = Array.from(
    new Map(
      [
        ...(initialParticipants ?? []).map((participant) => ({
          uid: participant.uid,
          name: participant.name,
          joinedAt: participant.joinedAt ?? Date.now(),
          avatarId: participant.avatarId,
          isBot: participant.isBot,
        })),
        ...(config.includeTeacher
          ? [{
              uid: teacherUid,
              name: teacherName,
              joinedAt: Date.now(),
            }]
          : []),
        ...(config.botEnabled
          ? [{
              uid: BATTLE_BOT_UID,
              name: config.botName?.trim() || 'Bot',
              joinedAt: Date.now(),
              avatarId: config.botAvatarId,
              isBot: true,
            }]
          : []),
      ]
        .filter((participant) => Boolean(participant?.uid))
        .map((participant) => [participant.uid, participant])
    ).values()
  );

  const session: Omit<BattleSession, 'id'> = {
    status: 'WAITING',
    liveClassId: classId,
    hostUid: teacherUid,
    roundStatus: 'waiting',
    config,
    questions,
    currentQuestionIndex: 0,
    currentQuestionId: firstQuestion?.id ?? null,
    startedAt: null,
    roundStartedAt: null,
    roundDurationMs: firstQuestionDuration * 1000,
    durationMs: firstQuestionDuration * 1000,
    endsAt: null,
    isRevealed: false,
    showAnswer: false,
    questionStartedAt: 0,
    participants: buildRoundParticipantMap(seededParticipants),
    roundParticipantIds: seededParticipants.map((participant) => participant.uid),
    answeredCount: 0,
    scores: buildScoresForParticipants({}, seededParticipants, false),
    answers: {},
    currentAnswers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastChange: serverTimestamp() as unknown,
  };

  try {
    console.info('[BATTLE FIREBASE] createBattleSession:writeAttempt', {
      classId,
      docPath,
      realPath: docRef.path,
      teacherUid,
      includeTeacher: config.includeTeacher,
      includeBot: config.botEnabled,
      status: session.status,
      questionCount: session.questions.length,
      seededParticipantIds: seededParticipants.map((participant) => participant.uid),
    });
    await setDoc(docRef, session);
    console.info('[BATTLE SERVICE] createBattleSession:written', {
      classId,
      docPath,
      status: session.status,
      currentQuestionId: session.currentQuestionId,
      questionCount: session.questions.length,
      seededParticipantIds: seededParticipants.map((participant) => participant.uid),
    });
  } catch (error) {
    console.error('[BATTLE FIREBASE] createBattleSession:error', {
      classId,
      docPath,
      realPath: docRef.path,
      teacherUid,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function startBattle(
  classId: string,
  session: BattleSession,
  participants: BattleRosterParticipant[],
  requestedByUid: string
): Promise<void> {
  const now = Date.now();
  const docRef = battleDocRef(classId);
  const docPath = battleDocPath(classId);
  console.info('[BATTLE SERVICE] startBattle:start', {
    classId,
    sessionId: session.id,
    sessionStatus: session.status,
    requestedByUid,
    docPath,
    participantCount: participants.length,
  });

  const fallbackParticipants = buildBattleRoundParticipantsSnapshot({
    session,
    activeParticipants: [],
    teacherUid: requestedByUid,
    teacherName: session.scores[requestedByUid]?.name || 'Professor',
  });

  const resolvedParticipants = participants.length > 0 ? participants : fallbackParticipants;

  const uniqueParticipants = Array.from(
    new Map(
      resolvedParticipants
        .filter((participant) => Boolean(participant?.uid))
        .map((participant) => [participant.uid, participant])
    ).values()
  );
  const canonicalParticipantIds = new Set(uniqueParticipants.map((participant) => participant.uid));

  const beforeSnap = await getDoc(docRef);
  const beforeData = beforeSnap.data() as Partial<BattleSession> | undefined;
  const questions = Array.isArray(beforeData?.questions) && beforeData.questions.length > 0
    ? beforeData.questions
    : session.questions;
  const config = beforeData?.config ?? session.config;
  const createdAt = beforeData?.createdAt ?? session.createdAt ?? now;
  const firstQuestion = questions[0] ?? null;
  const firstQuestionDuration = getBattleQuestionDuration(firstQuestion, config);
  if (config.includeTeacher && requestedByUid) {
    canonicalParticipantIds.add(requestedByUid);
  }
  if (config.botEnabled) {
    canonicalParticipantIds.add(BATTLE_BOT_UID);
  }
  const shouldFilterPersistedParticipants = canonicalParticipantIds.size > 0;
  const persistedParticipants = Object.values(beforeData?.participants ?? {}).filter(
    (participant): participant is BattleRosterParticipant =>
      Boolean(participant?.uid) &&
      (!shouldFilterPersistedParticipants || canonicalParticipantIds.has(participant.uid))
  );
  const persistedScoreParticipants = Object.values(beforeData?.scores ?? {})
    .filter(
      (participant): participant is BattleParticipant =>
        Boolean(participant?.uid) &&
        (!shouldFilterPersistedParticipants || canonicalParticipantIds.has(participant.uid))
    )
    .map((participant) => ({
      uid: participant.uid,
      name: participant.name,
      avatarId: participant.avatarId,
      isBot: participant.isBot,
      joinedAt: now,
    }));
  const shouldIncludeTeacher = config.includeTeacher === true;
  const teacherParticipant = shouldIncludeTeacher ? {
    uid: requestedByUid,
    name:
      beforeData?.participants?.[requestedByUid]?.name ??
      beforeData?.scores?.[requestedByUid]?.name ??
      session.participants?.[requestedByUid]?.name ??
      session.scores?.[requestedByUid]?.name ??
      'Professor',
    avatarId:
      beforeData?.participants?.[requestedByUid]?.avatarId ??
      beforeData?.scores?.[requestedByUid]?.avatarId ??
      session.participants?.[requestedByUid]?.avatarId ??
      session.scores?.[requestedByUid]?.avatarId,
    isBot:
      beforeData?.participants?.[requestedByUid]?.isBot ??
      beforeData?.scores?.[requestedByUid]?.isBot ??
      session.participants?.[requestedByUid]?.isBot ??
      session.scores?.[requestedByUid]?.isBot,
    joinedAt:
      beforeData?.participants?.[requestedByUid]?.joinedAt ??
      session.participants?.[requestedByUid]?.joinedAt ??
      createdAt,
  } : null;
  const mergedParticipants = Array.from(
    new Map(
      [...persistedParticipants, ...persistedScoreParticipants, ...uniqueParticipants, teacherParticipant]
        .filter((participant) => Boolean(participant?.uid))
        .map((participant) => [participant.uid, participant])
    ).values()
  );
  const roundParticipantIds = mergedParticipants.map((participant) => participant.uid);
  const nextScores = buildScoresForParticipants(session.scores ?? beforeData?.scores ?? {}, mergedParticipants, true);
  const payload = {
    liveClassId: classId,
    hostUid: beforeData?.hostUid ?? requestedByUid,
    config,
    questions,
    status: 'PLAYING',
    roundStatus: 'active',
    currentQuestionIndex: 0,
    currentQuestionId: firstQuestion?.id ?? session.currentQuestionId ?? null,
    startedAt: (beforeData?.startedAt as number | undefined) ?? now,
    roundStartedAt: now,
    roundDurationMs: firstQuestionDuration * 1000,
    durationMs: firstQuestionDuration * 1000,
    endsAt: now + firstQuestionDuration * 1000,
    isRevealed: false,
    showAnswer: false,
    questionStartedAt: now,
    participants: buildRoundParticipantMap(mergedParticipants),
    roundParticipantIds,
    answeredCount: 0,
    scores: nextScores,
    answers: {},
    currentAnswers: {},
    createdAt,
    updatedAt: now,
    lastChange: serverTimestamp(),
  };

  try {
    console.info('[BATTLE SERVICE] startBattle:beforeWrite', {
      classId,
      docPath,
      realPath: docRef.path,
      beforeExists: beforeSnap.exists(),
      beforeStatus: beforeData?.status ?? null,
      questionCountPersisted: Array.isArray(beforeData?.questions) ? beforeData.questions.length : 0,
      payloadStatus: payload.status,
      payloadQuestionCount: payload.questions.length,
      payloadCurrentQuestionId: payload.currentQuestionId,
      persistedParticipantIds: persistedParticipants.map((participant) => participant.uid),
      persistedScoreIds: persistedScoreParticipants.map((participant) => participant.uid),
      mergedParticipantIds: mergedParticipants.map((participant) => participant.uid),
      payloadRoundParticipantIds: payload.roundParticipantIds,
      canonicalParticipantIds: Array.from(canonicalParticipantIds),
    });
    await setDoc(docRef, payload, { merge: true });
    const afterSnap = await getDoc(docRef);
    console.info('[BATTLE SERVICE] startBattle:afterWrite', {
      classId,
      docPath,
      afterExists: afterSnap.exists(),
      afterStatus: afterSnap.data()?.status ?? null,
      afterCurrentQuestionIndex: afterSnap.data()?.currentQuestionIndex ?? null,
      afterCurrentQuestionId: afterSnap.data()?.currentQuestionId ?? null,
      afterQuestionCount: Array.isArray(afterSnap.data()?.questions) ? afterSnap.data()?.questions.length : 0,
    });
  } catch (error) {
    console.error('[BATTLE SERVICE] startBattle:error', {
      classId,
      docPath,
      error,
    });
    throw error;
  }
}

export async function advanceBattleQuestion(
  classId: string,
  nextIndex: number,
  totalQuestions: number,
  participants: BattleRosterParticipant[],
  existingScores: Record<string, BattleParticipant>
): Promise<void> {
  const now = Date.now();
  const docRef = battleDocRef(classId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      console.info('[BATTLE INTEGRATION] advanceBattleQuestion:missing-session', {
        classId,
        sessionId: classId,
      });
      return;
    }

    const data = snap.data();
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const currentIndex = typeof data.currentQuestionIndex === 'number' ? data.currentQuestionIndex : 0;
    const computedNextIndex = Math.min(nextIndex, currentIndex + 1);
    const isLast = computedNextIndex >= totalQuestions || computedNextIndex >= questions.length;
    const nextQuestion = isLast ? null : questions[computedNextIndex] ?? null;
    const nextQuestionId = nextQuestion?.id ?? null;
    const nextQuestionDurationMs = nextQuestion ? getBattleQuestionDuration(nextQuestion, data.config as BattleConfig | undefined) * 1000 : null;
    const liveScores = data.scores ?? existingScores ?? {};

    const uniqueParticipants = Array.from(
      new Map(
        (participants ?? [])
          .filter((participant) => Boolean(participant?.uid))
          .map((participant) => [participant.uid, participant])
      ).values()
    );

    transaction.update(docRef, {
      status: isLast ? 'FINISHED' : 'PLAYING',
      roundStatus: isLast ? 'finished' : 'active',
      currentQuestionIndex: isLast ? currentIndex : computedNextIndex,
      currentQuestionId: nextQuestionId,
      roundStartedAt: isLast ? null : now,
      roundDurationMs: isLast ? null : nextQuestionDurationMs,
      durationMs: isLast ? null : nextQuestionDurationMs,
      endsAt: !isLast && nextQuestionDurationMs != null ? now + nextQuestionDurationMs : null,
      isRevealed: false,
      showAnswer: false,
      questionStartedAt: isLast ? 0 : now,
      participants: buildRoundParticipantMap(uniqueParticipants),
      roundParticipantIds: uniqueParticipants.map((participant) => participant.uid),
      answeredCount: 0,
      scores: buildScoresForParticipants(liveScores, uniqueParticipants, false),
      answers: {},
      currentAnswers: {},
      updatedAt: now,
      lastChange: serverTimestamp(),
    });
  });
}

export async function showBattleAnswer(classId: string): Promise<void> {
  const revealedAt = Date.now();
  const docRef = battleDocRef(classId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const status = normalizeBattleStatus(data.status);
    if (status === 'REVEALED' || status === 'FINISHED') {
      return;
    }

    const currentScores = data.scores ?? {};
    const currentAnswers = data.currentAnswers ?? {};
    const roundParticipantIds = getStableRoundParticipantIds(
      Array.isArray(data.roundParticipantIds) ? data.roundParticipantIds : [],
    );
    const participants = data.participants ?? {};
    const nextScores = applyBattleRoundRankingToScores({
      currentScores,
      currentAnswers,
      roundParticipantIds,
      participants,
      questionStartedAt: typeof data.questionStartedAt === 'number' ? data.questionStartedAt : 0,
    });

    transaction.update(docRef, {
      status: 'REVEALED',
      roundStatus: 'revealed',
      isRevealed: true,
      showAnswer: true,
      scores: nextScores,
      updatedAt: revealedAt,
      lastChange: serverTimestamp(),
    });
  });
}

export async function endBattle(classId: string): Promise<void> {
  await updateDoc(battleDocRef(classId), {
    status: 'FINISHED',
    roundStatus: 'finished',
    updatedAt: Date.now(),
    lastChange: serverTimestamp(),
  });
}

export async function deleteBattleSession(classId: string): Promise<void> {
  await deleteDoc(battleDocRef(classId));
}

// Student operations

export async function joinBattle(
  classId: string,
  uid: string,
  name: string,
  existingParticipant?: BattleParticipant | null
): Promise<void> {
  const joinedAt = Date.now();
  const docRef = battleDocRef(classId);
  console.info('[BATTLE STUDENT JOIN] starting transaction', {
    classId,
    uid,
    name,
    hasExistingParticipant: Boolean(existingParticipant),
  });

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      console.info('[BATTLE STUDENT JOIN] session does not exist in firestore', {
        classId,
        uid,
        docPath: battleDocPath(classId),
      });
      return;
    }

    const data = snap.data();
    const status = normalizeBattleStatus(data.status);
    const currentParticipants = data.participants ?? {};
    const currentScores = data.scores ?? {};
    const currentRoundParticipantIds = Array.isArray(data.roundParticipantIds) ? data.roundParticipantIds : [];
    const currentAnswers = data.currentAnswers ?? {};
    const answeredCount =
      typeof data.answeredCount === 'number'
        ? data.answeredCount
        : Object.keys(currentAnswers).length;

    const alreadyInParticipants = uid in currentParticipants;
    const alreadyInScores = uid in currentScores;
    const alreadyInRound = currentRoundParticipantIds.includes(uid);

    console.info('[BATTLE STUDENT JOIN] firestore snapshot read', {
      classId,
      uid,
      status,
      alreadyInParticipants,
      alreadyInScores,
      alreadyInRound,
      participantCount: Object.keys(currentParticipants).length,
      scoreCount: Object.keys(currentScores).length,
      roundParticipantCount: currentRoundParticipantIds.length,
    });

    const nextParticipant = omitUndefinedFields<BattleRosterParticipant>({
      uid,
      name,
      joinedAt: currentParticipants?.[uid]?.joinedAt ?? joinedAt,
      avatarId: currentParticipants?.[uid]?.avatarId,
      isBot: currentParticipants?.[uid]?.isBot,
    });

    const nextScore =
      currentScores?.[uid] ??
      existingParticipant ??
      omitUndefinedFields<BattleParticipant>({
        uid,
        name,
        score: 0,
        streak: 0,
        lastAnswerCorrect: null,
      });

    const payload: Record<string, unknown> = {
      [`participants.${uid}`]: nextParticipant,
      [`scores.${uid}`]: nextScore,
      updatedAt: joinedAt,
      lastChange: serverTimestamp(),
    };

    // Só entra na rodada imediatamente se ainda estiver esperando.
    // Se já estiver PLAYING/REVEALED, entra no mapa/scores, mas joga na próxima.
    // Lock the active roster once the round starts.
    // Mid-round joins wait for the next question instead of changing answer counts.
    if (status === 'WAITING' && !currentRoundParticipantIds.includes(uid)) {
      payload.roundParticipantIds = arrayUnion(uid);
    }

    console.info('[BATTLE STUDENT JOIN] transaction update payload', {
      classId,
      uid,
      status,
      addedToRound: Boolean(payload.roundParticipantIds),
      payloadKeys: Object.keys(payload),
    });

    transaction.update(docRef, payload);
  });

  console.info('[BATTLE STUDENT JOIN] transaction completed', {
    classId,
    uid,
  });
}

export async function submitBattleAnswer(
  classId: string,
  session: BattleSession,
  uid: string,
  name: string,
  payload: {
    optionIndex?: number;
    optionIndexes?: number[];
    responseText?: string;
  },
  options?: {
    forceCurrentRoundParticipation?: boolean;
  }
): Promise<
  | { status: 'saved'; answer: BattleAnswer; updatedParticipant: BattleParticipant }
  | { status: 'ignored'; reason: 'already-answered' | 'not-active' | 'participant-not-recognized' | 'question-missing' }
> {
  const docRef = battleDocRef(classId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      return { status: 'ignored', reason: 'question-missing' } as const;
    }

    const liveSession = buildBattleSessionSnapshot(classId, snap.data() as Record<string, unknown>);

    const liveRoundParticipantIds = getStableRoundParticipantIds(liveSession.roundParticipantIds);
    const alreadyAnswered = uid in (liveSession.currentAnswers ?? {});
    const isInCurrentRound = liveRoundParticipantIds.includes(uid);
    const canAnswerCurrentRound = canBattleParticipantAnswerCurrentQuestion(liveSession, uid);
    const canForceStudentIntoRound =
      options?.forceCurrentRoundParticipation === true &&
      liveSession.status === 'PLAYING';
    const shouldForceCurrentRoundParticipation =
      options?.forceCurrentRoundParticipation === true &&
      !isInCurrentRound;
    const effectiveRoundParticipantIds = shouldForceCurrentRoundParticipation
      ? getStableRoundParticipantIds([...liveRoundParticipantIds, uid])
      : liveRoundParticipantIds;

    if (alreadyAnswered) {
      return { status: 'ignored', reason: 'already-answered' } as const;
    }

    if (liveSession.status !== 'PLAYING') {
      return { status: 'ignored', reason: 'not-active' } as const;
    }

    if ((!isInCurrentRound || !canAnswerCurrentRound) && !canForceStudentIntoRound) {
      return { status: 'ignored', reason: 'participant-not-recognized' } as const;
    }

    const answeredAt = Date.now();
    const qIdx = liveSession.currentQuestionIndex;
    const question = liveSession.questions[qIdx];

    if (!question) {
      return { status: 'ignored', reason: 'question-missing' } as const;
    }

    const isCorrect = evaluateBattleAnswer(question, payload);
    const previous = liveSession.scores?.[uid];
    const currentQuestionDuration = getBattleQuestionDuration(question, liveSession.config);

    const { elapsedMs, roundPoints } = calculateBattleRoundScore({
      answeredAt,
      questionStartedAt: liveSession.questionStartedAt ?? 0,
      timePerQuestion: currentQuestionDuration,
      isCorrect,
    });

    const answer: BattleAnswer = omitUndefinedFields({
      uid,
      name,
      optionIndex: payload.optionIndex,
      optionIndexes: payload.optionIndexes,
      responseText: payload.responseText,
      isCorrect,
      answeredAt,
      elapsedMs,
      roundPoints,
      frozenTimeLeft: Math.max(0, currentQuestionDuration - elapsedMs / 1000),
    }) as BattleAnswer;

    const nextParticipant = omitUndefinedFields<BattleRosterParticipant>({
      uid,
      name,
      joinedAt: liveSession.participants?.[uid]?.joinedAt ?? liveSession.createdAt ?? answeredAt,
      avatarId: liveSession.participants?.[uid]?.avatarId,
      isBot: liveSession.participants?.[uid]?.isBot,
    });
    const updatedParticipant = buildBattleParticipantRegistryRecord(previous, {
      uid,
      name,
      avatarId: liveSession.participants?.[uid]?.avatarId,
      isBot: liveSession.participants?.[uid]?.isBot,
    }, {
      lastAnswerCorrect: isCorrect,
    });

    const nextCurrentAnswers: Record<string, BattleAnswer> = {
      ...(liveSession.currentAnswers ?? {}),
      [uid]: answer,
    };
    const nextParticipants: Record<string, BattleRosterParticipant> = {
      ...(liveSession.participants ?? {}),
      [uid]: nextParticipant,
    };
    const answeredCount = Object.keys(nextCurrentAnswers).length;
    const everyoneAnswered = haveAllRoundParticipantsAnswered(
      effectiveRoundParticipantIds,
      nextCurrentAnswers,
    );

    if (everyoneAnswered) {
      const nextScores = applyBattleRoundRankingToScores({
        currentScores: {
          ...(liveSession.scores ?? {}),
          [uid]: updatedParticipant,
        },
        currentAnswers: nextCurrentAnswers,
        roundParticipantIds: effectiveRoundParticipantIds,
        participants: nextParticipants,
        questionStartedAt: liveSession.questionStartedAt ?? 0,
      });

      transaction.update(docRef, {
        [`participants.${uid}`]: nextParticipant,
        [`answers.${uid}`]: answer,
        [`currentAnswers.${uid}`]: answer,
        scores: nextScores,
        answeredCount,
        status: 'REVEALED',
        roundStatus: 'revealed',
        isRevealed: true,
        showAnswer: true,
        updatedAt: answeredAt,
        lastChange: serverTimestamp(),
        ...(shouldForceCurrentRoundParticipation
          ? { roundParticipantIds: effectiveRoundParticipantIds }
          : {}),
      });

      return {
        status: 'saved',
        answer,
        updatedParticipant: nextScores[uid] ?? updatedParticipant,
      } as const;
    }

    transaction.update(docRef, {
      [`participants.${uid}`]: nextParticipant,
      [`answers.${uid}`]: answer,
      [`currentAnswers.${uid}`]: answer,
      [`scores.${uid}`]: updatedParticipant,
      answeredCount,
      updatedAt: answeredAt,
      lastChange: serverTimestamp(),
      ...(shouldForceCurrentRoundParticipation
        ? { roundParticipantIds: effectiveRoundParticipantIds }
        : {}),
    });

    return { status: 'saved', answer, updatedParticipant } as const;
  });
}

export async function autoRevealIfAllAnswered(
  classId: string,
  session: BattleSession,
  teacherUid: string
): Promise<void> {
  if (session.status !== 'PLAYING') return;

  const participantIds = getStableRoundParticipantIds(session.roundParticipantIds);
  if (participantIds.length === 0) return;

  const allAnswered = haveAllRoundParticipantsAnswered(participantIds, session.currentAnswers);
  if (!allAnswered) return;

  await showBattleAnswer(classId);
}

// Subscription

export function subscribeBattleSession(
  classId: string,
  onChange: (session: BattleSession | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  console.info('[BATTLE FIREBASE] subscribeBattleSession:attach', {
    classId,
    docPath: battleDocPath(classId),
    realPath: battleDocRef(classId).path,
  });

  return onSnapshot(
    battleDocRef(classId),
    (snap) => {
      if (!snap.exists()) {
        console.info('[BATTLE SERVICE] subscribeBattleSession:missing', {
          classId,
          docPath: battleDocPath(classId),
        });
        onChange(null);
        return;
      }

      const data = snap.data();
      if (!isLegacyBattleSessionDocument(data as Record<string, unknown>)) {
        console.warn('[BATTLE SERVICE] subscribeBattleSession:ignored-incompatible-document', {
          classId,
          docPath: battleDocPath(classId),
          status: data.status ?? null,
          keys: Object.keys(data ?? {}),
        });
        onChange(null);
        return;
      }
      const session = buildBattleSessionSnapshot(classId, data as Record<string, unknown>);
      console.info('[BATTLE SERVICE] subscribeBattleSession:snapshot', {
        classId,
        docPath: battleDocPath(classId),
        status: data.status ?? null,
        normalizedStatus: normalizeBattleStatus(data.status),
        updatedAt: data.updatedAt ?? null,
        currentQuestionIndex: data.currentQuestionIndex ?? null,
        currentQuestionId: data.currentQuestionId ?? data.questions?.[data.currentQuestionIndex ?? 0]?.id ?? null,
        questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
        roundParticipantIds: Array.isArray(data.roundParticipantIds) ? data.roundParticipantIds : [],
      });

      onChange(session);
    },
    (err) => {
      console.error('[BATTLE FIREBASE] subscribeBattleSession:error', {
        classId,
        docPath: battleDocPath(classId),
        realPath: battleDocRef(classId).path,
        error: err.message,
      });
      onError?.(err);
    }
  );
}
