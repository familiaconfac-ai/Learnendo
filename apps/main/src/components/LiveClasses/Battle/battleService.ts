// Learnendo Battle - Firestore service
// Battle state lives at: liveClasses/{classId}/session/battle
// This reuses the already-deployed `session/{docId}` rules:
//   - READ: any canAccessLiveClassRoom participant (students see the battle)
//   - CREATE: teacher only
//   - UPDATE: teacher always; students can update their own answer/score
//             once the updated firestore.rules are deployed.

import {
  doc, setDoc, updateDoc, onSnapshot, Unsubscribe, deleteDoc, getDoc
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type {
  BattleSession, BattleConfig, BattleQuestion, BattleParticipant, BattleAnswer, BattleRosterParticipant
} from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import {
  buildInitialBattleParticipants,
  buildInitialBattleScores,
  buildBattleParticipantScore,
  buildBattleRoundParticipantsSnapshot,
  calculateBattleRoundScore,
  canBattleParticipantAnswerCurrentQuestion,
  evaluateBattleAnswer,
  getExpectedBattleParticipantIds,
  isReservedFirestoreFieldKey,
  mergeBattleScoresWithParticipants,
  sanitizeBattleQuestions,
} from './battleUtils';

function battleDocRef(classId: string) {
  // Path intentionally moved from liveClasses/{id}/battle/session
  // to liveClasses/{id}/session/battle so that existing deployed
  // firestore rules (session/{docId}) already allow teacher writes
  // and everyone-in-room reads without a new `firebase deploy`.
  return doc(db, 'liveClasses', classId, 'session', 'battle');
}

function battleDocPath(classId: string) {
  return `liveClasses/${classId}/session/battle`;
}

// Teacher operations

function buildRoundParticipantMap(participants: BattleRosterParticipant[]) {
  return participants.reduce<Record<string, BattleRosterParticipant>>((acc, participant) => {
    if (isReservedFirestoreFieldKey(participant.uid)) {
      throw new Error(`Invalid battle participant uid for Firestore map key: ${participant.uid}`);
    }
    acc[participant.uid] = participant;
    return acc;
  }, {});
}

export async function createBattleSession(
  classId: string,
  config: BattleConfig,
  teacherUid: string,
  teacherName: string,
  // Pass pre-generated questions to guarantee teacher + students see the same
  // shuffled order. If omitted, questions are generated here.
  precomputedQuestions?: BattleQuestion[]
): Promise<void> {
  const generatedQuestions: BattleQuestion[] = precomputedQuestions ?? getBattleQuestions({
    questionCount: config.questionCount,
    scope: config.scope,
    lessonId: config.lessonId,
    workbookId: config.workbookId,
  });
  const questions = sanitizeBattleQuestions(generatedQuestions);
  if (questions.length === 0) {
    throw new Error('Nenhuma pergunta valida foi encontrada para iniciar o Battle.');
  }

  const session: Omit<BattleSession, 'id'> = {
    status: 'lobby',
    config,
    questions,
    currentQuestionIndex: 0,
    questionStartedAt: 0,
    participants: buildInitialBattleParticipants(config, teacherUid, teacherName),
    roundParticipantIds: [],
    scores: buildInitialBattleScores(config, teacherUid, teacherName),
    currentAnswers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(battleDocRef(classId), session);
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
  console.log('[BATTLE START] entered');
  console.log('[BATTLE START] doc path:', docRef.path);
  console.log('[BATTLE START] session.id:', session.id || null);
  console.log('[BATTLE START] classId:', classId);
  console.log('[BATTLE START] requestedBy:', requestedByUid);
  console.log('[BATTLE START] current status:', session.status);

  const fallbackParticipants = buildBattleRoundParticipantsSnapshot({
    session,
    activeParticipants: [],
    teacherUid: requestedByUid,
    teacherName: session.scores[requestedByUid]?.name || 'Professor',
  });
  const resolvedParticipants = participants.length > 0 ? participants : fallbackParticipants;
  console.log('[BATTLE START] participants received count:', participants.length);
  console.log('[BATTLE START] participants fallback count:', fallbackParticipants.length);

  const roundParticipantIds = Array.from(
    new Set(resolvedParticipants.map((participant) => participant.uid).filter(Boolean))
  );

  const nextScores = mergeBattleScoresWithParticipants(session.scores, resolvedParticipants);
  const payload = {
    status: 'active',
    currentQuestionIndex: 0,
    questionStartedAt: now,
    participants: buildRoundParticipantMap(resolvedParticipants),
    roundParticipantIds,
    scores: nextScores,
    currentAnswers: {},
    updatedAt: now,
  };

  console.log('[BATTLE START] payload before save:', payload);

  try {
    const beforeSnap = await getDoc(docRef);
    console.log('[BATTLE START] expected doc path:', docPath);
    console.log('[BATTLE START] real doc path used:', docRef.path);
    console.log('[BATTLE START] doc exists before start:', beforeSnap.exists());
    console.log('[BATTLE START] updateDoc starting');
    await setDoc(docRef, payload, { merge: true });
    console.log('[BATTLE START] updateDoc resolved');
  } catch (error) {
    console.error('[BATTLE START] failed with error:', error);
    if (error instanceof Error) {
      console.error('[BATTLE START] error message:', error.message);
      console.error('[BATTLE START] error stack:', error.stack);
    }
    if (typeof error === 'object' && error && 'code' in error) {
      console.error('[BATTLE START] error code:', (error as { code?: string }).code ?? null);
    }
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
  const isLast = nextIndex >= totalQuestions;
  const now = Date.now();
  await updateDoc(battleDocRef(classId), {
    status: isLast ? 'finished' : 'active',
    currentQuestionIndex: nextIndex,
    questionStartedAt: isLast ? 0 : now,
    participants: buildRoundParticipantMap(participants),
    roundParticipantIds: isLast ? [] : participants.map((participant) => participant.uid),
    scores: isLast ? existingScores : mergeBattleScoresWithParticipants(existingScores, participants),
    currentAnswers: {},
    updatedAt: now,
  });
}

export async function showBattleAnswer(classId: string): Promise<void> {
  await updateDoc(battleDocRef(classId), {
    status: 'showing-answer',
    updatedAt: Date.now(),
  });
}

export async function endBattle(classId: string): Promise<void> {
  await updateDoc(battleDocRef(classId), {
    status: 'finished',
    updatedAt: Date.now(),
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
  await updateDoc(battleDocRef(classId), {
    [`scores.${uid}`]: existingParticipant ?? { uid, name, score: 0, streak: 0, lastAnswerCorrect: null } as BattleParticipant,
    updatedAt: joinedAt,
  });
}

/**
 * Submit a student's answer and recalculate their score.
 *
 * Uses a plain updateDoc (not a transaction) so that Firestore security rules
 * only need `update` permission - no `get` required inside a transaction.
 * The student's `session` prop is already the latest Firestore snapshot
 * delivered by onSnapshot, so score computation is accurate.
 *
 * Dot-notation field paths (`currentAnswers.uid`, `scores.uid`) are written
 * in a single atomic updateDoc call, so teacher's onSnapshot always sees
 * both fields change together - this is what drives the auto-reveal on the
 * host side when the last student answers.
 */
export async function submitBattleAnswer(
  classId: string,
  session: BattleSession,
  uid: string,
  name: string,
  payload: {
    optionIndex?: number;
    optionIndexes?: number[];
    responseText?: string;
  }
): Promise<void> {
  const alreadyAnswered = uid in (session.currentAnswers ?? {});
  const participantRecognized =
    canBattleParticipantAnswerCurrentQuestion(session, uid)
    || uid in (session.scores ?? {})
    || uid in (session.participants ?? {});

  console.log('[BATTLE SUBMIT] userId:', uid);
  console.log('[BATTLE SUBMIT] session status:', session.status);
  console.log('[BATTLE SUBMIT] currentQuestionIndex:', session.currentQuestionIndex);
  console.log('[BATTLE SUBMIT] questionStartedAt:', session.questionStartedAt ?? 0);
  console.log('[BATTLE SUBMIT] participant recognized:', participantRecognized);
  console.log('[BATTLE SUBMIT] already answered:', alreadyAnswered);

  if (alreadyAnswered) return;
  if (session.status !== 'active') return;
  if (!participantRecognized) return;

  const answeredAt = Date.now();
  const qIdx = session.currentQuestionIndex;
  const question = session.questions[qIdx];
  if (!question) return;

  const isCorrect = evaluateBattleAnswer(question, payload);
  const prev: BattleParticipant = session.scores?.[uid] ?? {
    uid, name, score: 0, streak: 0, lastAnswerCorrect: null,
  };
  const { elapsedMs, roundPoints } = calculateBattleRoundScore({
    answeredAt,
    questionStartedAt: session.questionStartedAt ?? 0,
    timePerQuestion: session.config.timePerQuestion,
    isCorrect,
  });

  console.log('[BATTLE SUBMIT] answeredAt:', answeredAt);
  console.log('[BATTLE SUBMIT] elapsedMs:', elapsedMs);
  console.log('[BATTLE SUBMIT] isCorrect:', isCorrect);
  console.log('[BATTLE SUBMIT] scoreAwarded:', roundPoints);

  const answer: BattleAnswer = {
    uid,
    name,
    optionIndex: payload.optionIndex,
    optionIndexes: payload.optionIndexes,
    responseText: payload.responseText,
    isCorrect,
    answeredAt,
    elapsedMs,
    roundPoints,
    frozenTimeLeft: Math.max(0, session.config.timePerQuestion - elapsedMs / 1000),
  };
  const updatedParticipant: BattleParticipant = buildBattleParticipantScore(uid, name, prev, isCorrect, roundPoints);
  const nextAnswersSnapshot = {
    ...(session.currentAnswers ?? {}),
    [uid]: answer,
  };
  const nextScoresSnapshot = {
    ...(session.scores ?? {}),
    [uid]: updatedParticipant,
  };

  await updateDoc(battleDocRef(classId), {
    [`currentAnswers.${uid}`]: answer,
    [`scores.${uid}`]: updatedParticipant,
    updatedAt: answeredAt,
  });

  console.log('[BATTLE SAVE] updated player state:', updatedParticipant);
  console.log('[BATTLE SAVE] scores snapshot:', nextScoresSnapshot);
  console.log('[BATTLE SAVE] answers snapshot:', nextAnswersSnapshot);
}

/**
 * Called by the teacher host after every Firestore snapshot.
 * If all STUDENT participants have answered the current question,
 * automatically transition to 'showing-answer'.
 *
 * teacherUid is excluded from the "must answer" list.
 */
export async function autoRevealIfAllAnswered(
  classId: string,
  session: BattleSession,
  teacherUid: string
): Promise<void> {
  if (session.status !== 'active') return;

  const participantIds = getExpectedBattleParticipantIds(session, teacherUid);
  if (participantIds.length === 0) return;

  const allAnswered = participantIds.every((id) => id in session.currentAnswers);
  if (!allAnswered) return;

  await showBattleAnswer(classId);
}

// Subscription

export function subscribeBattleSession(
  classId: string,
  onChange: (session: BattleSession | null) => void
): Unsubscribe {
  return onSnapshot(
    battleDocRef(classId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = snap.data();
      onChange({
        id: classId,
        ...data,
        participants: data.participants ?? {},
        roundParticipantIds: Array.isArray(data.roundParticipantIds) ? data.roundParticipantIds : [],
      } as BattleSession);
    },
    (err) => {
      // Log the error but don't crash the component tree.
      // Teacher local state (optimistic) still works; students just won't sync.
      console.warn('[Battle] subscribeBattleSession error (Firestore rules may not be deployed):', err.message);
    }
  );
}
