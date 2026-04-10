// ── Learnendo Battle — Firestore service ───────────────────────────────────────
// Battle state lives at:  liveClasses/{classId}/session/battle
// This reuses the already-deployed `session/{docId}` rules:
//   - READ:   any canAccessLiveClassRoom participant  (students see the battle)
//   - CREATE: teacher only
//   - UPDATE: teacher always; students can update their own answer/score
//             once the updated firestore.rules are deployed.

import {
  doc, setDoc, updateDoc, onSnapshot, Unsubscribe, deleteDoc
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type {
  BattleSession, BattleConfig, BattleQuestion, BattleParticipant, BattleAnswer
} from './battleTypes';
import { getBattleQuestions } from './battleQuestions';
import {
  buildInitialBattleScores,
  evaluateBattleAnswer,
  getExpectedBattleParticipantIds,
  sanitizeBattleQuestions,
} from './battleUtils';

function battleDocRef(classId: string) {
  // Path intentionally moved from liveClasses/{id}/battle/session
  // to liveClasses/{id}/session/battle so that existing deployed
  // firestore rules (session/{docId}) already allow teacher writes
  // and everyone-in-room reads without a new `firebase deploy`.
  return doc(db, 'liveClasses', classId, 'session', 'battle');
}

// ─── Teacher operations ────────────────────────────────────────────────────────

export async function createBattleSession(
  classId: string,
  config: BattleConfig,
  teacherUid: string,
  teacherName: string,
  // Pass pre-generated questions to guarantee teacher + students see the same
  // shuffled order.  If omitted, questions are generated here.
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
    scores: buildInitialBattleScores(config, teacherUid, teacherName),
    currentAnswers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(battleDocRef(classId), session);
}

export async function startBattle(classId: string): Promise<void> {
  await updateDoc(battleDocRef(classId), {
    status: 'active',
    currentQuestionIndex: 0,
    questionStartedAt: Date.now(),
    currentAnswers: {},
    updatedAt: Date.now(),
  });
}

export async function advanceBattleQuestion(
  classId: string,
  nextIndex: number,
  totalQuestions: number
): Promise<void> {
  const isLast = nextIndex >= totalQuestions;
  await updateDoc(battleDocRef(classId), {
    status: isLast ? 'finished' : 'active',
    currentQuestionIndex: nextIndex,
    questionStartedAt: isLast ? 0 : Date.now(),
    currentAnswers: {},
    updatedAt: Date.now(),
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

// ─── Student operations ────────────────────────────────────────────────────────

export async function joinBattle(
  classId: string,
  uid: string,
  name: string
): Promise<void> {
  await updateDoc(battleDocRef(classId), {
    [`scores.${uid}`]: { uid, name, score: 0, streak: 0, lastAnswerCorrect: null } as BattleParticipant,
    updatedAt: Date.now(),
  });
}

/**
 * Submit a student's answer and recalculate their score.
 *
 * Uses a plain updateDoc (not a transaction) so that Firestore security rules
 * only need `update` permission — no `get` required inside a transaction.
 * The student's `session` prop is already the latest Firestore snapshot
 * delivered by onSnapshot, so score computation is accurate.
 *
 * Dot-notation field paths (`currentAnswers.uid`, `scores.uid`) are written
 * in a single atomic updateDoc call, so teacher's onSnapshot always sees
 * both fields change together — this is what drives the auto-reveal on the
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
  // Guard: already answered this question in the current snapshot
  if (uid in (session.currentAnswers ?? {})) return;
  // Guard: question must be active
  if (session.status !== 'active') return;

  const answeredAt = Date.now();
  const qIdx = session.currentQuestionIndex;
  const question = session.questions[qIdx];
  if (!question) return;

  const isCorrect = evaluateBattleAnswer(question, payload);

  // Speed bonus — 0–500 proportional to time remaining
  const startedAt = session.questionStartedAt ?? 0;
  const elapsed = startedAt > 0 ? (answeredAt - startedAt) / 1000 : 0;
  const timeLimit = session.config.timePerQuestion;
  const speedRatio = startedAt > 0 ? Math.max(0, 1 - elapsed / timeLimit) : 0;

  const baseScore = isCorrect ? 500 : 0;
  const speedBonus = isCorrect ? Math.round(speedRatio * 500) : 0;

  const prev: BattleParticipant = session.scores?.[uid] ?? {
    uid, name, score: 0, streak: 0, lastAnswerCorrect: null,
  };
  const newStreak = isCorrect ? prev.streak + 1 : 0;
  // +50 per consecutive correct answer, capped at +200
  const streakBonus = isCorrect ? Math.min(200, newStreak * 50) : 0;
  const roundPoints = baseScore + speedBonus + streakBonus;
  const newScore = prev.score + roundPoints;

  const answer: BattleAnswer = {
    uid,
    name,
    optionIndex: payload.optionIndex,
    optionIndexes: payload.optionIndexes,
    responseText: payload.responseText,
    isCorrect,
    answeredAt,
    // Store elapsed time (ms) and round points for the reveal panel
    elapsedMs: startedAt > 0 ? answeredAt - startedAt : 0,
    roundPoints,
  };
  const updatedParticipant: BattleParticipant = {
    uid, name, score: newScore, streak: newStreak, lastAnswerCorrect: isCorrect,
  };

  await updateDoc(battleDocRef(classId), {
    [`currentAnswers.${uid}`]: answer,
    [`scores.${uid}`]: updatedParticipant,
    updatedAt: answeredAt,
  });
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

  const allAnswered = participantIds.every(id => id in session.currentAnswers);
  if (!allAnswered) return;

  await showBattleAnswer(classId);
}

// ─── Subscription ─────────────────────────────────────────────────────────────

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
      onChange({ id: classId, ...snap.data() } as BattleSession);
    },
    (err) => {
      // Log the error but don't crash the component tree.
      // Teacher local state (optimistic) still works; students just won't sync.
      console.warn('[Battle] subscribeBattleSession error (Firestore rules may not be deployed):', err.message);
    }
  );
}
