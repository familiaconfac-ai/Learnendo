import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const USE_SIMPLE_LIVE_BATTLE = false;
const TEST_FALLBACK_QUESTIONS: LiveBattleSimpleQuestion[] = [
  {
    id: 'test-1',
    question: 'What is your name?',
    options: ['My name is Ana.', 'I am ten.', 'I live in Brazil.', 'Good morning.'],
    correctIndex: 0,
  },
  {
    id: 'test-2',
    question: 'How do you say “bom dia” in English?',
    options: ['Good night', 'Good morning', 'Goodbye', 'Thank you'],
    correctIndex: 1,
  },
  {
    id: 'test-3',
    question: 'Choose the correct sentence.',
    options: ['She are happy.', 'He am Carlos.', 'I am a student.', 'They is here.'],
    correctIndex: 2,
  },
];

type LiveBattleSimpleStatus = 'waiting' | 'running' | 'revealed' | 'finished';

type LiveBattleSimpleQuestion = {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
};

type LiveBattleSimpleParticipant = {
  name: string;
  role: 'teacher' | 'student' | 'bot';
  avatarId: string | null;
};

type LiveBattleSimpleAnswer = {
  optionIndex: number;
  answeredAt: number;
  responseTimeMs: number;
  isCorrect: boolean;
};

type LiveBattleSimpleSession = {
  liveClassId: string;
  status: LiveBattleSimpleStatus;
  currentQuestionIndex: number;
  roundStartedAt: number;
  roundDurationMs: number;
  questions: LiveBattleSimpleQuestion[];
  participants: Record<string, LiveBattleSimpleParticipant>;
  answers: Record<string, LiveBattleSimpleAnswer>;
};

export type LiveBattleSimpleProps = {
  liveClassId: string;
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  onClose?: () => void;
  onNewBattle?: () => void;
  questions?: Array<{
    id?: string;
    question: string;
    options: string[];
    correctIndex: number;
  }>;
};

const DEFAULT_ROUND_DURATION_MS = 10_000;

function battleDocRef(liveClassId: string) {
  return doc(db, 'liveClasses', liveClassId, 'session', 'battle');
}

function sanitizeQuestion(question: LiveBattleSimpleQuestion, index: number): LiveBattleSimpleQuestion | null {
  const text = question.question?.trim();
  const options = (question.options ?? [])
    .map((option) => option?.trim())
    .filter((option): option is string => Boolean(option));

  if (!text || options.length < 2) {
    return null;
  }

  const correctIndex = Number.isInteger(question.correctIndex)
    && question.correctIndex >= 0
    && question.correctIndex < options.length
    ? question.correctIndex
    : 0;

  return {
    id: question.id?.trim() || `simple-battle-${index + 1}`,
    question: text,
    options,
    correctIndex,
  };
}

function sanitizeQuestions(questions: LiveBattleSimpleProps['questions']): LiveBattleSimpleQuestion[] {
  return (questions ?? [])
    .map((question, index) => sanitizeQuestion(question, index))
    .filter((question): question is LiveBattleSimpleQuestion => question !== null);
}

function normalizeSession(
  liveClassId: string,
  data: Record<string, unknown> | undefined,
): LiveBattleSimpleSession | null {
  if (!data) return null;

  const questions = Array.isArray(data.questions)
    ? data.questions
        .map((entry, index) => sanitizeQuestion((entry ?? {}) as LiveBattleSimpleQuestion, index))
        .filter((entry): entry is LiveBattleSimpleQuestion => entry !== null)
    : [];

  const participants = Object.entries((data.participants ?? {}) as Record<string, LiveBattleSimpleParticipant>).reduce<
    Record<string, LiveBattleSimpleParticipant>
  >((acc, [uid, participant]) => {
    if (!uid) return acc;
    acc[uid] = {
      name: participant?.name?.trim() || uid,
      role: participant?.role === 'teacher' || participant?.role === 'student' || participant?.role === 'bot'
        ? participant.role
        : 'student',
      avatarId: participant?.avatarId ?? null,
    };
    return acc;
  }, {});

  const answers = Object.entries((data.answers ?? {}) as Record<string, LiveBattleSimpleAnswer>).reduce<
    Record<string, LiveBattleSimpleAnswer>
  >((acc, [uid, answer]) => {
    if (!uid) return acc;
    if (!answer || !Number.isInteger(answer.optionIndex)) return acc;
    acc[uid] = {
      optionIndex: answer.optionIndex,
      answeredAt: typeof answer.answeredAt === 'number' ? answer.answeredAt : 0,
      responseTimeMs: typeof answer.responseTimeMs === 'number' ? answer.responseTimeMs : 0,
      isCorrect: Boolean(answer.isCorrect),
    };
    return acc;
  }, {});

  const rawStatus = data.status;
  const status: LiveBattleSimpleStatus =
    rawStatus === 'waiting' || rawStatus === 'WAITING'
      ? 'waiting'
      : rawStatus === 'running' || rawStatus === 'RUNNING' || rawStatus === 'PLAYING'
        ? 'running'
        : rawStatus === 'revealed' || rawStatus === 'REVEALED'
          ? 'revealed'
          : rawStatus === 'finished' || rawStatus === 'FINISHED'
            ? 'finished'
            : 'waiting';

  return {
    liveClassId: typeof data.liveClassId === 'string' ? data.liveClassId : liveClassId,
    status,
    currentQuestionIndex: typeof data.currentQuestionIndex === 'number' ? data.currentQuestionIndex : 0,
    roundStartedAt: typeof data.roundStartedAt === 'number' ? data.roundStartedAt : 0,
    roundDurationMs: typeof data.roundDurationMs === 'number' ? data.roundDurationMs : DEFAULT_ROUND_DURATION_MS,
    questions,
    participants,
    answers,
  };
}

function countHumanParticipants(participants: Record<string, LiveBattleSimpleParticipant>) {
  return Object.entries(participants).filter(([, participant]) => (
    participant.role === 'teacher' || participant.role === 'student'
  )).length;
}

function formatMsLabel(value: number) {
  return `${Math.max(0, Math.ceil(value / 1000))}s`;
}

export const LiveBattleSimple: React.FC<LiveBattleSimpleProps> = ({
  liveClassId,
  userId,
  userName,
  role,
  onClose,
  onNewBattle,
  questions,
}) => {
  console.log('[LIVE BATTLE SIMPLE QUESTIONS] received props', {
    liveClassId,
    userId,
    role,
    questionsLength: questions?.length,
    questions,
  });

  const [battle, setBattle] = useState<LiveBattleSimpleSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const revealLockRef = useRef(false);

  const preparedQuestions = useMemo(() => sanitizeQuestions(questions), [questions]);
  const effectiveQuestions = useMemo(
    () => (preparedQuestions.length > 0 ? preparedQuestions : TEST_FALLBACK_QUESTIONS),
    [preparedQuestions],
  );
  const currentQuestion = battle?.questions?.[battle.currentQuestionIndex] ?? null;
  const currentAnswer = battle?.answers?.[userId] ?? null;
  const hasAnswered = Boolean(currentAnswer);
  const humanParticipantCount = countHumanParticipants(battle?.participants ?? {});
  const answeredHumanCount = Object.entries(battle?.participants ?? {}).filter(([uid, participant]) => (
    (participant.role === 'teacher' || participant.role === 'student') && Boolean(battle?.answers?.[uid])
  )).length;

  const globalRemainingMs = useMemo(() => {
    if (!battle || battle.status !== 'running') {
      return battle?.roundDurationMs ?? DEFAULT_ROUND_DURATION_MS;
    }

    if (!battle.roundStartedAt || battle.roundStartedAt <= 0) {
      return battle.roundDurationMs;
    }

    return Math.max(0, battle.roundStartedAt + battle.roundDurationMs - now);
  }, [battle, now]);

  const remainingMs = useMemo(() => {
    if (!battle) return DEFAULT_ROUND_DURATION_MS;
    if (currentAnswer) {
      return Math.max(0, battle.roundDurationMs - currentAnswer.responseTimeMs);
    }
    return globalRemainingMs;
  }, [battle, currentAnswer, globalRemainingMs]);

  const subscribeBattle = useCallback(() => onSnapshot(
    battleDocRef(liveClassId),
    (snapshot) => {
      const nextBattle = normalizeSession(liveClassId, snapshot.exists() ? snapshot.data() : undefined);
      console.log('[LIVE BATTLE SIMPLE] session loaded', {
        liveClassId,
        userId,
        role,
        exists: snapshot.exists(),
        status: nextBattle?.status ?? null,
        currentQuestionIndex: nextBattle?.currentQuestionIndex ?? null,
        participants: nextBattle?.participants ?? {},
        answers: nextBattle?.answers ?? {},
      });
      setBattle(nextBattle);
      if (nextBattle) {
        setError(null);
      }
    },
    (snapshotError) => {
      console.error('[LIVE BATTLE SIMPLE] error', snapshotError);
      setError('Falha ao carregar a Battle simples.');
    },
  ), [liveClassId, role, userId]);

  const ensureParticipant = useCallback(async () => {
    try {
      const ref = battleDocRef(liveClassId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) return;
      const currentBattle = normalizeSession(liveClassId, snapshot.data() as Record<string, unknown>);
      const currentParticipant = currentBattle?.participants?.[userId];
      if (
        currentParticipant
        && currentParticipant.name === (userName || (role === 'teacher' ? 'Professor' : 'Aluno'))
        && currentParticipant.role === role
        && currentParticipant.avatarId === null
      ) {
        return;
      }

      await setDoc(ref, {
        participants: {
          [userId]: {
            name: userName || (role === 'teacher' ? 'Professor' : 'Aluno'),
            role,
            avatarId: null,
          },
        },
      }, { merge: true });

      console.log('[LIVE BATTLE SIMPLE] participant ensured', {
        liveClassId,
        userId,
        role,
      });
    } catch (participantError) {
      console.error('[LIVE BATTLE SIMPLE] error', participantError);
      setError('Falha ao registrar participante na Battle simples.');
    }
  }, [liveClassId, role, userId, userName]);

  const revealAnswer = useCallback(async (reason: 'all-answered' | 'time-up') => {
    if (role !== 'teacher') return;
    if (revealLockRef.current) return;

    revealLockRef.current = true;
    try {
      await runTransaction(db, async (transaction) => {
        const ref = battleDocRef(liveClassId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return;

        const nextBattle = normalizeSession(liveClassId, snapshot.data() as Record<string, unknown>);
        if (!nextBattle || nextBattle.status !== 'running') return;

        console.warn('[LIVE BATTLE SIMPLE] reveal answer', {
          liveClassId,
          reason,
          answeredHumanCount: Object.entries(nextBattle.participants).filter(([uid, participant]) => (
            (participant.role === 'teacher' || participant.role === 'student') && Boolean(nextBattle.answers[uid])
          )).length,
          humanParticipantCount: countHumanParticipants(nextBattle.participants),
        });

        transaction.update(ref, {
          status: 'revealed',
        });
      });
    } catch (revealError) {
      console.error('[LIVE BATTLE SIMPLE] error', revealError);
      setError('Falha ao revelar a resposta da Battle simples.');
    } finally {
      revealLockRef.current = false;
    }
  }, [liveClassId, role]);

  const finishBattle = useCallback(async () => {
    try {
      await updateDoc(battleDocRef(liveClassId), {
        status: 'finished',
      });
      setError(null);
    } catch (finishError) {
      console.error('[LIVE BATTLE SIMPLE] error', finishError);
      setError('Falha ao finalizar a Battle simples.');
    }
  }, [liveClassId]);

  const nextQuestion = useCallback(async () => {
    if (role !== 'teacher') return;

    try {
      await runTransaction(db, async (transaction) => {
        const ref = battleDocRef(liveClassId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return;

        const nextBattle = normalizeSession(liveClassId, snapshot.data() as Record<string, unknown>);
        if (!nextBattle) return;

        const nextIndex = nextBattle.currentQuestionIndex + 1;
        if (nextIndex >= nextBattle.questions.length) {
          transaction.update(ref, { status: 'finished' });
          return;
        }

        transaction.update(ref, {
          status: 'running',
          currentQuestionIndex: nextIndex,
          roundStartedAt: Date.now(),
          roundDurationMs: nextBattle.roundDurationMs || DEFAULT_ROUND_DURATION_MS,
          answers: {},
        });
      });
      setError(null);
    } catch (nextError) {
      console.error('[LIVE BATTLE SIMPLE] error', nextError);
      setError('Falha ao avançar para a próxima pergunta.');
    }
  }, [liveClassId, role]);

  const startBattle = useCallback(async () => {
    if (role !== 'teacher') return;

    if (preparedQuestions.length === 0) {
      console.warn('[LIVE BATTLE SIMPLE] reveal answer', {
        liveClassId,
        reason: 'using-fallback-questions',
        userId,
      });
      setError('Nenhuma pergunta encontrada para iniciar a Battle. Usando perguntas de teste temporárias.');
    }

    try {
      const ref = battleDocRef(liveClassId);
      const snapshot = await getDoc(ref);
      const existingBattle = normalizeSession(liveClassId, snapshot.exists() ? snapshot.data() as Record<string, unknown> : undefined);
      const participants = {
        ...(existingBattle?.participants ?? {}),
        [userId]: {
          name: userName || 'Professor',
          role: 'teacher' as const,
          avatarId: null,
        },
      };
      const nextBattle: LiveBattleSimpleSession = {
        liveClassId,
        status: 'running',
        currentQuestionIndex: 0,
        roundStartedAt: Date.now(),
        roundDurationMs: DEFAULT_ROUND_DURATION_MS,
        questions: effectiveQuestions,
        participants,
        answers: {},
      };

      console.log('[LIVE BATTLE SIMPLE] start battle', {
        liveClassId,
        userId,
        questionCount: nextBattle.questions.length,
        participants: Object.keys(nextBattle.participants),
      });

      await setDoc(ref, nextBattle);
      setError(null);
    } catch (startError) {
      console.error('[LIVE BATTLE SIMPLE] error', startError);
      setError('Falha ao iniciar a Battle simples.');
    }
  }, [effectiveQuestions, liveClassId, preparedQuestions.length, role, userId, userName]);

  const submitAnswer = useCallback(async (optionIndex: number) => {
    console.log('[LIVE BATTLE SIMPLE] option clicked', {
      liveClassId,
      userId,
      role,
      optionIndex,
    });

    if (!battle || !currentQuestion) {
      return;
    }

    if (battle.status !== 'running') {
      return;
    }

    if (hasAnswered) {
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const ref = battleDocRef(liveClassId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) {
          throw new Error('Battle simples não encontrada.');
        }

        const nextBattle = normalizeSession(liveClassId, snapshot.data() as Record<string, unknown>);
        if (!nextBattle) {
          throw new Error('Battle simples inválida.');
        }

        const transactionQuestion = nextBattle.questions[nextBattle.currentQuestionIndex];
        if (!transactionQuestion) {
          throw new Error('Pergunta atual não encontrada.');
        }

        if (nextBattle.status !== 'running') {
          return;
        }

        if (nextBattle.answers[userId]) {
          return;
        }

        if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= transactionQuestion.options.length) {
          throw new Error('Alternativa inválida.');
        }

        const answeredAt = Date.now();
        const responseTimeMs = nextBattle.roundStartedAt > 0
          ? Math.max(0, answeredAt - nextBattle.roundStartedAt)
          : 0;
        const answer: LiveBattleSimpleAnswer = {
          optionIndex,
          answeredAt,
          responseTimeMs,
          isCorrect: optionIndex === transactionQuestion.correctIndex,
        };
        const participants = {
          ...nextBattle.participants,
          [userId]: {
            name: nextBattle.participants[userId]?.name || userName || (role === 'teacher' ? 'Professor' : 'Aluno'),
            role,
            avatarId: null,
          },
        };
        const answers = {
          ...nextBattle.answers,
          [userId]: answer,
        };
        const humanParticipantIds = Object.entries(participants)
          .filter(([, participant]) => participant.role === 'teacher' || participant.role === 'student')
          .map(([participantId]) => participantId);
        const allAnswered = humanParticipantIds.length >= 2
          && humanParticipantIds.every((participantId) => Boolean(answers[participantId]));

        if (allAnswered) {
          console.warn('[LIVE BATTLE SIMPLE] reveal answer', {
            liveClassId,
            reason: 'all-answered',
            humanParticipantIds,
          });
        }

        transaction.update(ref, {
          participants,
          answers,
          status: allAnswered ? 'revealed' : 'running',
        });
      });

      console.log('[LIVE BATTLE SIMPLE] answer saved', {
        liveClassId,
        userId,
        role,
      });
      setError(null);
    } catch (answerError) {
      console.error('[LIVE BATTLE SIMPLE] error', answerError);
      setError('Falha ao salvar a resposta da Battle simples.');
    }
  }, [battle, currentQuestion, hasAnswered, liveClassId, role, userId, userName]);

  useEffect(() => {
    const unsubscribe = subscribeBattle();
    return unsubscribe;
  }, [subscribeBattle]);

  useEffect(() => {
    if (!battle) return;
    void ensureParticipant();
  }, [battle, ensureParticipant]);

  useEffect(() => {
    if (!battle || battle.status !== 'running') return undefined;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [battle]);

  useEffect(() => {
    if (role !== 'teacher') return;
    if (!battle || battle.status !== 'running') return;
    if (!battle.roundStartedAt || battle.roundStartedAt <= 0) return;
    if (globalRemainingMs > 0) return;

    console.warn('[LIVE BATTLE SIMPLE] reveal answer', {
      liveClassId,
      reason: 'time-up',
      userId,
    });
    void revealAnswer('time-up');
  }, [battle, globalRemainingMs, liveClassId, revealAnswer, role, userId]);

  const selectedOptionIndex = currentAnswer?.optionIndex ?? null;
  const canAnswer = battle?.status === 'running' && !hasAnswered;
  const teacherHeaderActions = role === 'teacher' ? (
    <div className="flex flex-wrap items-center gap-2">
      {battle?.status === 'finished' && onNewBattle ? (
        <button
          type="button"
          onClick={onNewBattle}
          className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-orange-200"
        >
          Nova Battle
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-200"
        >
          Voltar
        </button>
      ) : null}
    </div>
  ) : null;

  if (!battle) {
    if (role === 'teacher') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">Battle Simples</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Use o mesmo documento da LiveClass para iniciar uma batalha direta e estável.
                </p>
              </div>
              {teacherHeaderActions}
            </div>
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void startBattle();
              }}
              className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)]"
            >
              Iniciar Battle Simples
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <h2 className="text-xl font-black text-white">Battle Simples</h2>
        <p className="mt-3 text-sm text-slate-300">Aguardando o professor iniciar a Battle...</p>
      </div>
    );
  }

  if (!currentQuestion && battle.status !== 'finished') {
    if (role === 'teacher') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">Battle Simples</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Nenhuma pergunta encontrada para iniciar a Battle.
                </p>
              </div>
              {teacherHeaderActions}
            </div>
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Vamos usar 3 perguntas de teste temporárias para validar o fluxo da Battle simples.
            </div>
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void startBattle();
              }}
              className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)]"
            >
              Iniciar Battle Simples
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <h2 className="text-xl font-black text-white">Battle Simples</h2>
        <p className="mt-3 text-sm text-slate-300">Aguardando o professor iniciar a Battle...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/95 px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-orange-300">Battle Simples</div>
            <h1 className="mt-2 text-2xl font-black text-white">
              {battle.status === 'waiting'
                ? 'Sala de espera'
                : battle.status === 'running'
                  ? `Pergunta ${battle.currentQuestionIndex + 1} de ${battle.questions.length}`
                  : battle.status === 'revealed'
                    ? 'Resposta revelada'
                    : 'Battle finalizada'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {teacherHeaderActions}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-right">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Seu tempo</div>
              <div className="mt-1 text-2xl font-black text-white">{formatMsLabel(remainingMs)}</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {battle.status === 'waiting' ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-6 text-sm text-slate-300">
            Aguardando o professor iniciar a rodada...
          </div>
        ) : null}

        {battle.status === 'finished' ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-6 text-sm text-slate-300">
            Battle encerrada.
          </div>
        ) : null}

        {currentQuestion && (battle.status === 'running' || battle.status === 'revealed') ? (
          <>
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 px-5 py-5">
              <p className="text-lg font-bold text-white">{currentQuestion.question}</p>
            </div>

            <div className="mt-4 grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = selectedOptionIndex === optionIndex;
                const isCorrect = currentQuestion.correctIndex === optionIndex;
                const isRevealed = battle.status === 'revealed';
                const buttonClassName = isRevealed
                  ? isCorrect
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : isSelected
                      ? 'border-red-400 bg-red-500/20 text-red-100'
                      : 'border-slate-700 bg-slate-950/70 text-slate-300'
                  : isSelected
                    ? 'border-orange-400 bg-orange-500/20 text-orange-100'
                    : 'border-slate-700 bg-slate-950/70 text-slate-100 hover:border-orange-400/70';

                return (
                  <button
                    key={`${currentQuestion.id ?? battle.currentQuestionIndex}-${optionIndex}`}
                    type="button"
                    disabled={!canAnswer}
                    onClick={() => {
                      void submitAnswer(optionIndex);
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${buttonClassName} disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
              <div>
                {battle.status === 'running'
                  ? `${answeredHumanCount} / ${humanParticipantCount} responderam`
                  : `Resposta correta: ${currentQuestion.options[currentQuestion.correctIndex] ?? ''}`}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {hasAnswered ? (
                  <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-200">
                    Resposta registrada
                  </span>
                ) : null}
                {role === 'teacher' && battle.status === 'revealed' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (battle.currentQuestionIndex + 1 >= battle.questions.length) {
                        void finishBattle();
                        return;
                      }
                      void nextQuestion();
                    }}
                    className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-black text-white"
                  >
                    {battle.currentQuestionIndex + 1 >= battle.questions.length ? 'Encerrar Battle' : 'Próxima Pergunta'}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

