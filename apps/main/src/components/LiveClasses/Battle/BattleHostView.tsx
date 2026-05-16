import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import { BattleResultsScreen } from './BattleResultsScreen';
import {
  advanceBattleQuestion,
  endBattle,
  showBattleAnswer,
  showBattleRanking,
  startBattle,
  submitBattleAnswer,
} from './battleService';
import type {
  BattleAnswer,
  BattleParticipant,
  BattleSession,
  BattleQuestion,
  BattleQuestionKind,
} from './battleTypes';
import {
  BATTLE_BOT_UID,
  buildBotBattlePayload,
  buildBattleRoundParticipantsSnapshot,
  buildBattleRoundRanking,
  canBattleParticipantAnswerCurrentQuestion,
  compareBattleParticipantsByRanking,
  calculateBattleRoundScore,
  evaluateBattleAnswer,
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleLanguage,
  getBattleParticipantName,
  getBattleQuestionDuration,
  getBattlePromptAudioText,
  getMyBattleAnswer,
  isChoiceQuestion,
  repairBattleTextEncoding,
} from './battleUtils';
import { createBattleThemeAudio, persistBattleVolume, readBattleVolume, type ManagedBattleAudio } from './battleAudio';

interface BattleHostViewProps {
  session: BattleSession;
  classId: string;
  teacherUid: string;
  activeParticipants: Array<{ uid: string; name: string }>;
  onClose: () => void;
  onNewBattle: () => void;
  uiLanguage?: 'en' | 'pt' | 'es';
}

const HOST_COPY = {
  en: {
    brandTitle: 'Learnendo Battle',
    endGame: 'End Game',
    activateMusic: 'Enable music',
    muteMusic: 'Mute music',
    musicVolume: 'Music volume',
    battleRoom: 'Battle Room',
    participantsOnline: (count: number) => `${count} participant(s) online`,
    waitingStudents: 'Waiting for students to join...',
    questionsWord: 'questions',
    each: 'each',
    question: 'Question',
    confirmTeacherAnswer: 'Confirm teacher answer',
    teacherSpeakingPlaceholder: 'Teacher answer...',
    teacherTypingPlaceholder: 'Type the teacher answer...',
    listening: 'Listening...',
    answerByVoice: 'Answer by voice',
    answered: 'answered',
    correctAnswer: 'Correct answer',
    feedbackTitle: 'Why',
    correct: 'correct',
    wrong: 'wrong',
    noAnswer: 'no answer',
    seeRoundRanking: (count: number) => `See round ranking (${count})`,
    roundResults: 'Round Results',
    currentRanking: 'Current ranking',
    continueReview: 'Continue',
    wrongStudents: 'Students who missed',
    noResponse: 'no answer',
    rightLabel: 'Correct',
    wrongLabel: 'Wrong',
    timeLabel: 'Time',
    finishBattle: 'Finish Battle',
    nextQuestion: 'Next Question',
    startBattle: 'Start Battle',
    revealAnswer: 'Reveal Answer',
    ranking: 'Ranking',
    top10: 'Top 10',
    noParticipantsYet: 'No participants yet',
    teacherShort: 'Teacher',
  },
  pt: {
    brandTitle: 'Learnendo Battle',
    endGame: 'Encerrar',
    activateMusic: 'Ativar musica',
    muteMusic: 'Silenciar musica',
    musicVolume: 'Volume da musica',
    battleRoom: 'Sala de Batalha',
    participantsOnline: (count: number) => `${count} participante(s) online`,
    waitingStudents: 'Aguardando alunos entrarem...',
    questionsWord: 'perguntas',
    each: 'cada',
    question: 'Pergunta',
    confirmTeacherAnswer: 'Confirmar resposta do professor',
    teacherSpeakingPlaceholder: 'Resposta do professor...',
    teacherTypingPlaceholder: 'Digite a resposta do professor...',
    listening: 'Ouvindo...',
    answerByVoice: 'Responder falando',
    answered: 'responderam',
    correctAnswer: 'Resposta correta',
    feedbackTitle: 'Explicacao',
    correct: 'certo(s)',
    wrong: 'errado(s)',
    noAnswer: 'sem resposta',
    seeRoundRanking: (count: number) => `Ver ranking da rodada (${count})`,
    roundResults: 'Resultados da Rodada',
    currentRanking: 'Ranking atual',
    continueReview: 'Continuar',
    wrongStudents: 'Alunos que erraram',
    noResponse: 'sem resposta',
    rightLabel: 'Correta',
    wrongLabel: 'Errada',
    timeLabel: 'Tempo',
    finishBattle: 'Finalizar Batalha',
    nextQuestion: 'Proxima Pergunta',
    startBattle: 'Iniciar Batalha',
    revealAnswer: 'Revelar Resposta',
    ranking: 'Ranking',
    top10: 'Top 10',
    noParticipantsYet: 'Nenhum participante ainda',
    teacherShort: 'Prof',
  },
  es: {
    brandTitle: 'Batalla Learnendo',
    endGame: 'Terminar',
    activateMusic: 'Activar musica',
    muteMusic: 'Silenciar musica',
    musicVolume: 'Volumen de la musica',
    battleRoom: 'Sala de Batalla',
    participantsOnline: (count: number) => `${count} participante(s) conectados`,
    waitingStudents: 'Esperando a que entren los alumnos...',
    questionsWord: 'preguntas',
    each: 'cada una',
    question: 'Pregunta',
    confirmTeacherAnswer: 'Confirmar respuesta del profesor',
    teacherSpeakingPlaceholder: 'Respuesta del profesor...',
    teacherTypingPlaceholder: 'Escribe la respuesta del profesor...',
    listening: 'Escuchando...',
    answerByVoice: 'Responder hablando',
    answered: 'respondieron',
    correctAnswer: 'Respuesta correcta',
    feedbackTitle: 'Explicacion',
    correct: 'correcta(s)',
    wrong: 'incorrecta(s)',
    noAnswer: 'sin respuesta',
    seeRoundRanking: (count: number) => `Ver ranking de la ronda (${count})`,
    roundResults: 'Resultados de la Ronda',
    currentRanking: 'Ranking actual',
    continueReview: 'Continuar',
    wrongStudents: 'Alumnos que fallaron',
    noResponse: 'sin respuesta',
    rightLabel: 'Correcta',
    wrongLabel: 'Incorrecta',
    timeLabel: 'Tiempo',
    finishBattle: 'Finalizar Batalla',
    nextQuestion: 'Siguiente Pregunta',
    startBattle: 'Iniciar Batalla',
    revealAnswer: 'Mostrar Respuesta',
    ranking: 'Ranking',
    top10: 'Top 10',
    noParticipantsYet: 'Todavia no hay participantes',
    teacherShort: 'Prof',
  },
} as const;

interface RevealRow {
  pid: string;
  placement: number;
  name: string;
  isCorrect: boolean | null;
  elapsedMs: number | null;
}

export const BattleHostView: React.FC<BattleHostViewProps> = ({
  session,
  classId,
  teacherUid,
  activeParticipants,
  onClose,
  onNewBattle,
  uiLanguage = 'en',
}) => {
  const copy = HOST_COPY[uiLanguage] ?? HOST_COPY.en;
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [busy, setBusy] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [musicVolume, setMusicVolume] = useState<number>(() => readBattleVolume('learnendo_battle_host_volume', 0.35));
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherFrozenTimeLeft, setTeacherFrozenTimeLeft] = useState<number | null>(null);
  const [localCurrentAnswers, setLocalCurrentAnswers] = useState<Record<string, BattleAnswer>>({});
  const [showRankingOverlay, setShowRankingOverlay] = useState(false);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<ManagedBattleAudio | null>(null);
  const recognitionRef = useRef<any>(null);
  const promptPlayedRef = useRef<string>('');
  const botAnswerAttemptRef = useRef<string | null>(null);

  const questionIdx = session.currentQuestionIndex;
  const question = session.questions[questionIdx] ?? null;
  const currentQuestionDuration = getBattleQuestionDuration(question, session.config);
  const totalQuestions = session.questions.length;
  const battleLanguage = getBattleLanguage(session.config.courseId);
  const roundParticipantIds = useMemo(
    () => Array.from(new Set((session.roundParticipantIds ?? []).filter(Boolean))),
    [session.roundParticipantIds],
  );
  const mergedCurrentAnswers = useMemo(
    () => ({ ...(session.currentAnswers ?? {}), ...localCurrentAnswers }),
    [localCurrentAnswers, session.currentAnswers],
  );
  const effectiveRoundParticipantIds = useMemo(() => {
    const activeStudentIds = new Set(activeParticipants.map((participant) => participant.uid));
    return roundParticipantIds.filter((participantId) => (
      participantId === teacherUid ||
      participantId === BATTLE_BOT_UID ||
      activeStudentIds.has(participantId) ||
      participantId in mergedCurrentAnswers
    ));
  }, [activeParticipants, mergedCurrentAnswers, roundParticipantIds, teacherUid]);
  const answerCount = effectiveRoundParticipantIds.filter((participantId) => participantId in mergedCurrentAnswers).length;
  const allAnsweredLocally =
    effectiveRoundParticipantIds.length > 0 &&
    effectiveRoundParticipantIds.every((participantId) => participantId in mergedCurrentAnswers);
  const effectiveStatus: BattleSession['status'] = session.status;
  const teacherIsRegistered =
    Boolean(session.participants?.[teacherUid]) ||
    Boolean(session.scores?.[teacherUid]) ||
    roundParticipantIds.includes(teacherUid);
  const teacherCanPlay = effectiveStatus === 'PLAYING' && session.config.includeTeacher && teacherIsRegistered;
  const myAnswer = mergedCurrentAnswers[teacherUid] ?? getMyBattleAnswer(session, teacherUid);
  const teacherHasAnswered = Boolean(myAnswer) || teacherSubmitting;
  const requiresChoiceConfirmation = question ? getBattleCorrectIndexes(question).length > 1 : false;
  const effectiveFrozenTimeLeft = teacherFrozenTimeLeft ?? myAnswer?.frozenTimeLeft ?? null;
  const roundDurationMs = session.roundDurationMs ?? session.durationMs ?? currentQuestionDuration * 1000;
  const roundStartedAt =
    typeof session.roundStartedAt === 'number' && session.roundStartedAt > 0
      ? session.roundStartedAt
      : typeof session.questionStartedAt === 'number' && session.questionStartedAt > 0
        ? session.questionStartedAt
        : null;
  const endsAt =
    session.endsAt ?? (roundStartedAt != null && roundDurationMs > 0 ? roundStartedAt + roundDurationMs : null);
  const liveRemainingMs =
    effectiveFrozenTimeLeft != null
      ? effectiveFrozenTimeLeft * 1000
      : endsAt != null
        ? Math.max(0, endsAt - Date.now())
        : roundDurationMs;
  const timeUp = effectiveStatus === 'PLAYING' && effectiveFrozenTimeLeft == null && endsAt != null && liveRemainingMs <= 0;
  const displayTimeLeft = effectiveFrozenTimeLeft ?? timeLeft;
  const timeRatio = displayTimeLeft / currentQuestionDuration;

  useEffect(() => {
    console.log('[BATTLE ROUND STATE DEBUG] render', {
      sessionId: session?.id,
      status: session?.status,
      roundStatus: session?.roundStatus ?? null,
      currentQuestionIndex: session?.currentQuestionIndex,
      roundStartedAt: session?.roundStartedAt ?? null,
      questionStartedAt: session?.questionStartedAt ?? null,
      endsAt: session?.endsAt ?? endsAt,
      durationMs: session?.durationMs ?? null,
      roundDurationMs: session?.roundDurationMs ?? null,
      isRevealed: session?.isRevealed ?? null,
      showAnswer: session?.showAnswer ?? null,
      timeUp,
      now: Date.now(),
      remainingMs: liveRemainingMs,
      answers: session?.answers ?? session?.currentAnswers,
      participants: session?.participants,
      roundParticipantIds: session?.roundParticipantIds,
    });
    console.log('[LIVE BATTLE SESSION] loaded', {
      liveClassId: classId,
      userId: teacherUid,
      role: 'teacher',
      status: session?.status,
      currentQuestionIndex: session?.currentQuestionIndex,
      participants: session?.participants,
      answers: session?.answers ?? session?.currentAnswers,
    });
    console.log('[BATTLE ANSWER DEBUG] render question', {
      sessionId: session?.id,
      status: session?.status,
      roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
      currentQuestionIndex: session?.currentQuestionIndex,
      currentQuestion: question,
      userId: teacherUid,
      participantId: teacherUid,
      isHost: true,
      isTeacher: true,
      participants: session?.participants,
      roundParticipantIds: session?.roundParticipantIds,
      answers: (session as BattleSession & { answers?: unknown }).answers ?? null,
      responses: (session as BattleSession & { responses?: unknown }).responses ?? null,
    });
    console.log('[BATTLE PROFESSOR ANSWER DEBUG] render question view', {
      sessionId: session?.id,
      status: session?.status,
      roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
      currentQuestionIndex: session?.currentQuestionIndex,
      currentQuestion: question,
      userId: teacherUid,
      isHost: true,
      isTeacher: true,
      participants: session?.participants,
      roundParticipantIds: session?.roundParticipantIds,
    });
  }, [
    question,
    endsAt,
    liveRemainingMs,
    session?.currentQuestionIndex,
    session?.durationMs,
    session?.endsAt,
    session?.id,
    session?.isRevealed,
    session?.participants,
    session?.questionStartedAt,
    session?.roundDurationMs,
    session?.roundParticipantIds,
    session?.roundStartedAt,
    session?.roundStatus,
    session?.showAnswer,
    session?.status,
    teacherUid,
    timeUp,
  ]);

  useEffect(() => {
    console.log('[BATTLE DEBUG] BattleHostView mounted', {
      classId,
      sessionId: session.id,
      status: session.status,
      teacherUid,
      currentQuestionIndex: session.currentQuestionIndex,
      roundParticipantIds
    });
  }, []);

  const leaderboard = useMemo(() => {
    return roundParticipantIds
      .map((participantId) => {
        const score = session.scores?.[participantId];
        if (!score) return null;
        return score;
      })
      .filter((participant): participant is BattleParticipant => Boolean(participant))
      .sort(compareBattleParticipantsByRanking)
      .slice(0, 10);
  }, [roundParticipantIds, session.scores]);

  const roundResultsRows = useMemo(() => {
    return buildBattleRoundRanking(
      effectiveRoundParticipantIds,
      mergedCurrentAnswers,
      session.questionStartedAt,
    )
      .map((entry) => ({
        pid: entry.uid,
        placement: entry.placement,
        name:
          mergedCurrentAnswers[entry.uid]?.name ??
          session.scores?.[entry.uid]?.name ??
          getBattleParticipantName(session, entry.uid),
        isCorrect: entry.isCorrect,
        elapsedMs: entry.elapsedMs,
      }));
  }, [effectiveStatus, effectiveRoundParticipantIds, mergedCurrentAnswers, session, session.scores]);

  const roundAnswerSummary = useMemo(() => {
    return effectiveRoundParticipantIds.reduce(
      (summary, participantId) => {
        const answer = mergedCurrentAnswers[participantId];
        if (!answer) {
          summary.unanswered += 1;
          return summary;
        }
        if (answer.isCorrect === true) {
          summary.correct += 1;
          return summary;
        }
        summary.wrong += 1;
        return summary;
      },
      { correct: 0, wrong: 0, unanswered: 0 }
    );
  }, [effectiveRoundParticipantIds, mergedCurrentAnswers]);
  const wrongParticipantNames = useMemo(
    () =>
      roundResultsRows
        .filter((row) => row.isCorrect === false)
        .map((row) => row.name),
    [roundResultsRows]
  );

  useEffect(() => {
    console.info('[BATTLE SESSION STATUS] teacher host snapshot', {
      component: 'BattleHostView',
      classId,
      sessionId: session.id,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestionId: session.currentQuestionId ?? question?.id ?? null,
      questionCount: session.questions.length,
      roundParticipantIds,
      teacherCanPlay,
      showSetupBypassed: false,
      scoreKeys: Object.keys(session.scores ?? {}),
    });
    console.info('[BATTLE HOST SESSION] teacher battle session snapshot', {
      component: 'BattleHostView',
      classId,
      sessionId: session.id,
      status: session.status,
      roundParticipantIds,
      currentQuestionId: session.currentQuestionId ?? question?.id ?? null,
    });
    console.info('[BATTLE REGRESSION FIX] teacher battle runtime active', {
      component: 'BattleHostView',
      classId,
      sessionId: session.id,
      status: session.status,
      currentQuestionId: session.currentQuestionId ?? question?.id ?? null,
      teacherCanPlay,
    });
  }, [
    classId,
    question?.id,
    roundParticipantIds,
    session.currentQuestionId,
    session.currentQuestionIndex,
    session.id,
    session.questions.length,
    session.scores,
    session.status,
    teacherCanPlay,
  ]);

  useEffect(() => {
    const audio = createBattleThemeAudio(musicVolume);
    audioRef.current = audio;

    return () => {
      audio?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    persistBattleVolume('learnendo_battle_host_volume', musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (session.status === 'PLAYING') {
      audio.start();
    } else {
      audio.stop();
    }
  }, [session.status]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setVolume(musicVolume);
    }
  }, [musicVolume]);

  useEffect(() => {
    console.info('[BATTLE HOST ROUND RESET] resetting local teacher round state', {
      classId,
      sessionId: session.id,
      status: session.status,
      currentQuestionId: session.currentQuestionId ?? question?.id ?? null,
      questionStartedAt: session.questionStartedAt,
    });
    setSelectedOptions([]);
    setTypedAnswer('');
    setTeacherSubmitting(false);
    setTeacherFrozenTimeLeft(null);
    setTimeLeft(currentQuestionDuration);
    setLocalCurrentAnswers({});
    setShowRankingOverlay(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore stale recognition cleanup
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [classId, questionIdx, question?.id, session.currentQuestionId, session.id, session.questionStartedAt, session.status]);

  useEffect(() => {
    if (session.status !== 'PLAYING') {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (roundStartedAt == null || roundDurationMs <= 0) {
      setTimeLeft(currentQuestionDuration);
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    const start = roundStartedAt;
    const initialRemaining = Math.max(0, roundDurationMs - (Date.now() - start)) / 1000;
    setTimeLeft(initialRemaining);
    console.info('[BATTLE HOST TIMER] starting teacher timer interval', {
      classId,
      sessionId: session.id,
      status: session.status,
      questionStartedAt: session.questionStartedAt,
      effectiveStartAt: start,
      initialRemaining,
    });
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const remainingMs = Math.max(0, roundDurationMs - elapsed);
      const remaining = remainingMs / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        console.warn('[BATTLE ROUND STATE DEBUG] timer expired', {
          now: Date.now(),
          roundStartedAt: session?.roundStartedAt ?? roundStartedAt,
          endsAt,
          remainingMs,
        });
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 200);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentQuestionDuration, endsAt, roundDurationMs, roundStartedAt, session.questionStartedAt, session.roundStartedAt, session.status]);

  useEffect(() => {
    if (!teacherHasAnswered) return;
    if (effectiveFrozenTimeLeft == null) return;
    setTeacherFrozenTimeLeft((current) => current ?? effectiveFrozenTimeLeft);
  }, [effectiveFrozenTimeLeft, teacherHasAnswered]);

  useEffect(() => {
    setShowResults(session.status === 'FINISHED');
  }, [session.status]);

  useEffect(() => {
    if (session.status === 'REVEALED' && session.roundStatus === 'ranking') {
      setShowRankingOverlay(true);
      return;
    }
    if (session.status !== 'FINISHED') {
      setShowRankingOverlay(false);
    }
  }, [session.roundStatus, session.status]);

  useEffect(() => {
    if (!question || session.status !== 'PLAYING' || !question.playAudioOnce) return;

    const promptKey = `${session.id}:${(question.id as string)}:${session.status}`;
    if (promptPlayedRef.current === promptKey) return;

    promptPlayedRef.current = promptKey;
    window.setTimeout(() => {
      speak(getBattlePromptAudioText(question), battleLanguage);
    }, 250);
  }, [battleLanguage, question, session.id, session.status]);

  useEffect(() => {
    if (session.status !== 'PLAYING' || effectiveRoundParticipantIds.length === 0 || !allAnsweredLocally) return;

    console.warn('[BATTLE ROUND STATE DEBUG] revealing answer', {
      reason: 'all-participants-answered',
      answeredCount: answerCount,
      expectedCount: effectiveRoundParticipantIds.length,
      answers: session?.answers ?? session?.currentAnswers,
      roundParticipantIds: session?.roundParticipantIds,
    });
    showBattleAnswer(classId, effectiveRoundParticipantIds).catch((error) => {
      console.error('[BattleHostView] auto reveal failed:', error);
    });
  }, [allAnsweredLocally, answerCount, classId, effectiveRoundParticipantIds, session, session.status]);

  useEffect(() => {
    if (session.status !== 'PLAYING' || !timeUp) return;

    console.warn('[BATTLE ROUND STATE DEBUG] revealing answer', {
      reason: 'timer-expired',
      answeredCount: answerCount,
      expectedCount: roundParticipantIds.length,
      answers: session?.answers ?? session?.currentAnswers,
      roundParticipantIds: session?.roundParticipantIds,
    });
    showBattleAnswer(classId, effectiveRoundParticipantIds).catch((error) => {
      console.error('[BattleHostView] timer reveal failed:', error);
    });
  }, [answerCount, classId, effectiveRoundParticipantIds, session, timeUp]);

  useEffect(() => {
    if (session.status !== 'PLAYING') return;
    if (!session.config.botEnabled) return;
    if (!question) return;
    if (!roundParticipantIds.includes(BATTLE_BOT_UID)) return;
    if ((session.currentAnswers ?? {})[BATTLE_BOT_UID]) return;

    const botRoundKey = `${session.id}:${session.currentQuestionId ?? question.id ?? questionIdx}`;
    if (botAnswerAttemptRef.current === botRoundKey) return;
    botAnswerAttemptRef.current = botRoundKey;

    const { delayMs, payload } = buildBotBattlePayload(session, question);
    const timeoutId = window.setTimeout(() => {
      submitBattleAnswer(
        classId,
        session,
        BATTLE_BOT_UID,
        session.participants?.[BATTLE_BOT_UID]?.name ?? session.config.botName ?? 'Bot',
        payload,
        { forceCurrentRoundParticipation: true },
      ).catch((error) => {
        console.error('[BATTLE HOST BOT] bot answer failed:', error);
        botAnswerAttemptRef.current = null;
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    classId,
    question,
    questionIdx,
    roundParticipantIds,
    session,
  ]);

  const buildRoundParticipantsSnapshot = () =>
    buildBattleRoundParticipantsSnapshot({
      session,
      activeParticipants,
      teacherUid,
      teacherName: session.scores?.[teacherUid]?.name || 'Professor',
      includeExpectedParticipants: false,
    });

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz nao esta disponivel neste navegador.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore stale instance
      }
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = appLangToTts(battleLanguage);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      setTypedAnswer(transcript);
      setIsListening(false);
    };
    recognition.start();
  }

  async function persistTeacherAnswer(payload: { optionIndex?: number; optionIndexes?: number[]; responseText?: string }) {
    console.log('[BATTLE ANSWER DEBUG] submit answer entered', {
      sessionId: session.id,
      userId: teacherUid,
      participantId: teacherUid,
      optionIndex: payload.optionIndex ?? null,
    });
    if (!question) {
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: 'missing-question',
        sessionId: session.id,
        userId: teacherUid,
        participantId: teacherUid,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered: teacherHasAnswered,
      });
      console.warn('[BATTLE PROFESSOR ANSWER DEBUG] answer blocked', {
        reason: 'missing-question',
        userId: teacherUid,
        hasAnswered: teacherHasAnswered,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        status: session?.status,
      });
      return;
    }

    const answeredAt = Date.now();
    const teacherName = session.scores?.[teacherUid]?.name || 'Professor';
    const isCorrect = evaluateBattleAnswer(question, payload);
    const { elapsedMs, roundPoints } = calculateBattleRoundScore({
      answeredAt,
      questionStartedAt: session.questionStartedAt,
      timePerQuestion: currentQuestionDuration,
      isCorrect,
    });

    const localAnswer: BattleAnswer = {
      uid: teacherUid,
      name: teacherName,
      optionIndex: payload.optionIndex,
      optionIndexes: payload.optionIndexes,
      responseText: payload.responseText,
      isCorrect,
      answeredAt,
      elapsedMs,
      roundPoints,
      frozenTimeLeft: Math.max(0, currentQuestionDuration - elapsedMs / 1000),
    };
    const nextFrozenTimeLeft = localAnswer.frozenTimeLeft ?? 0;

    setLocalCurrentAnswers((current) => ({ ...current, [teacherUid]: localAnswer }));
    setTeacherFrozenTimeLeft(nextFrozenTimeLeft);
    setTimeLeft(nextFrozenTimeLeft);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    console.info('[BATTLE HOST FREEZE] teacher timer frozen on answer', {
      classId,
      sessionId: session.id,
      teacherUid,
      frozenTimeLeft: nextFrozenTimeLeft,
    });
    console.info('[BATTLE TEACHER FLOW] teacher answer locked', {
      classId,
      sessionId: session.id,
      teacherUid,
      statusBeforeReveal: session.status,
      elapsedMs,
      frozenTimeLeft: nextFrozenTimeLeft,
    });
    const optimisticAnswers = { ...(session.currentAnswers ?? {}), ...localCurrentAnswers, [teacherUid]: localAnswer };
    const everyoneAnswered =
      effectiveRoundParticipantIds.length > 0 &&
      effectiveRoundParticipantIds.every((participantId) => participantId in optimisticAnswers);

    if (everyoneAnswered) {
      setTimeLeft(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    }

    setTeacherSubmitting(true);

    try {
      console.log('[LIVE BATTLE ANSWER] saving', {
        liveClassId: classId,
        userId: teacherUid,
        role: 'teacher',
        optionIndex: payload.optionIndex ?? null,
        currentQuestionIndex: session.currentQuestionIndex,
      });
      console.log('[BATTLE ANSWER DEBUG] saving answer payload', payload);
      console.log('[BATTLE PROFESSOR ANSWER DEBUG] saving answer...', {
        sessionId: session.id,
        userId: teacherUid,
        optionIndex: payload.optionIndex ?? null,
      });
      const result = await submitBattleAnswer(
        classId,
        session,
        teacherUid,
        teacherName,
        payload,
        { forceCurrentRoundParticipation: true },
      );
      if (result.status !== 'saved') {
        console.warn('[LIVE BATTLE ANSWER] blocked', {
          reason: result.reason,
          liveClassId: classId,
          userId: teacherUid,
          role: 'teacher',
          status: session?.status,
          hasAnswered: teacherHasAnswered,
        });
        console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
          reason: result.reason,
          sessionId: session.id,
          userId: teacherUid,
          participantId: teacherUid,
          status: session?.status,
          roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
          hasAnswered: teacherHasAnswered,
        });
        console.warn('[BATTLE PROFESSOR ANSWER DEBUG] answer blocked', {
          reason: result.reason,
          userId: teacherUid,
          hasAnswered: teacherHasAnswered,
          roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
          status: session?.status,
        });
        setLocalCurrentAnswers((current) => {
          const next = { ...current };
          delete next[teacherUid];
          return next;
        });
        return;
      }

      console.log('[BATTLE ANSWER DEBUG] answer saved');
      console.log('[BATTLE PROFESSOR ANSWER DEBUG] answer saved');
      if (everyoneAnswered) {
        await showBattleAnswer(classId, effectiveRoundParticipantIds);
      }
    } catch (error) {
      console.error('[LIVE BATTLE ANSWER] failed', error);
      console.error('[BATTLE ANSWER DEBUG] answer failed', error);
      console.error('[BATTLE PROFESSOR ANSWER DEBUG] answer failed:', error);
      console.error('[BattleHostView] teacher submit failed:', error);
      setLocalCurrentAnswers((current) => {
        const next = { ...current };
        delete next[teacherUid];
        return next;
      });
    } finally {
      setTeacherSubmitting(false);
    }
  }

  async function submitTeacherChoice(optionIndexes: number[]) {
    if (
      !teacherCanPlay ||
      !question ||
      !isChoiceQuestion(question) ||
      teacherHasAnswered ||
      timeUp ||
      session.status !== 'PLAYING' ||
      optionIndexes.length === 0
    ) {
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !teacherCanPlay
          ? 'teacher-cannot-play'
          : !question
            ? 'missing-question'
            : !isChoiceQuestion(question)
              ? 'question-is-not-choice'
              : teacherHasAnswered
                ? 'already-answered'
                : timeUp
                  ? 'time-up'
                : session.status !== 'PLAYING'
                  ? 'session-not-playing'
                  : 'missing-option-index',
        sessionId: session.id,
        userId: teacherUid,
        participantId: teacherUid,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered: teacherHasAnswered,
      });
      console.warn('[BATTLE PROFESSOR ANSWER DEBUG] answer blocked', {
        reason: !teacherCanPlay
          ? 'teacher-cannot-play'
          : !question
            ? 'missing-question'
            : !isChoiceQuestion(question)
              ? 'question-is-not-choice'
              : teacherHasAnswered
                ? 'teacher-already-answered'
                : session.status !== 'PLAYING'
                  ? 'session-not-playing'
                  : 'no-option-indexes',
        userId: teacherUid,
        hasAnswered: teacherHasAnswered,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        status: session?.status,
      });
      return;
    }

    await persistTeacherAnswer({
      optionIndex: optionIndexes[0],
      optionIndexes,
    });
  }

  function toggleTeacherChoice(optionIndex: number) {
    const option = question?.options?.[optionIndex] ?? null;
    const disabled = effectiveStatus !== 'PLAYING' || teacherHasAnswered;
    console.log('[LIVE BATTLE ANSWER] option clicked', {
      liveClassId: classId,
      userId: teacherUid,
      role: 'teacher',
      optionIndex,
      status: session?.status,
      currentQuestionIndex: session?.currentQuestionIndex,
    });
    console.log('[BATTLE ANSWER DEBUG] option clicked', {
      optionIndex,
      option,
      userId: teacherUid,
      participantId: teacherUid,
      disabled,
      hasAnswered: teacherHasAnswered,
    });
    console.log('[BATTLE PROFESSOR ANSWER DEBUG] option clicked', {
      optionIndex,
      option,
      userId: teacherUid,
      isHost: true,
      isTeacher: true,
      disabled,
      hasAnswered: teacherHasAnswered,
      roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
    });

    if (!question || !isChoiceQuestion(question) || !teacherCanPlay || teacherHasAnswered || timeUp || effectiveStatus !== 'PLAYING') {
      console.warn('[LIVE BATTLE ANSWER] blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : !teacherCanPlay
              ? 'teacher-cannot-play'
              : teacherHasAnswered
                ? 'already-answered'
                : timeUp
                  ? 'time-up'
                : 'status-not-playing',
        liveClassId: classId,
        userId: teacherUid,
        role: 'teacher',
        status: session?.status,
        hasAnswered: teacherHasAnswered,
      });
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : !teacherCanPlay
              ? 'teacher-cannot-play'
              : teacherHasAnswered
                ? 'already-answered'
                : 'status-not-playing',
        sessionId: session.id,
        userId: teacherUid,
        participantId: teacherUid,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered: teacherHasAnswered,
      });
      console.warn('[BATTLE PROFESSOR ANSWER DEBUG] answer blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : !teacherCanPlay
              ? 'teacher-cannot-play'
              : teacherHasAnswered
                ? 'teacher-already-answered'
                : 'status-not-playing',
        userId: teacherUid,
        hasAnswered: teacherHasAnswered,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        status: session?.status,
      });
      console.info('[BATTLE HOST CLICK BLOCK] teacher choice blocked', {
        classId,
        sessionId: session.id,
        teacherUid,
        hasQuestion: Boolean(question),
        teacherCanPlay,
        teacherHasAnswered,
        effectiveStatus,
      });
      return;
    }

    console.info('[BATTLE HOST CLICK] teacher choice accepted', {
      classId,
      sessionId: session.id,
      teacherUid,
      optionIndex,
      currentQuestionId: session.currentQuestionId ?? question.id ?? null,
    });

    if (!requiresChoiceConfirmation) {
      setSelectedOptions([optionIndex]);
      void submitTeacherChoice([optionIndex]);
      return;
    }

    setSelectedOptions((current) =>
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((left, right) => left - right),
    );
  }

  async function confirmTeacherChoice() {
    if (!requiresChoiceConfirmation || selectedOptions.length === 0) return;
    await submitTeacherChoice(selectedOptions);
  }

  async function handleTeacherOpenAnswer() {
    if (
      !teacherCanPlay ||
      !question ||
      isChoiceQuestion(question) ||
      teacherHasAnswered ||
      timeUp ||
      session.status !== 'PLAYING' ||
      !typedAnswer.trim()
    ) {
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !teacherCanPlay
          ? 'teacher-cannot-play'
          : !question
            ? 'missing-question'
            : isChoiceQuestion(question)
              ? 'question-is-choice'
              : teacherHasAnswered
                ? 'already-answered'
                : timeUp
                  ? 'time-up'
                : session.status !== 'PLAYING'
                  ? 'session-not-playing'
                  : 'empty-response',
        sessionId: session.id,
        userId: teacherUid,
        participantId: teacherUid,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered: teacherHasAnswered,
      });
      console.warn('[BATTLE PROFESSOR ANSWER DEBUG] answer blocked', {
        reason: !teacherCanPlay
          ? 'teacher-cannot-play'
          : !question
            ? 'missing-question'
            : isChoiceQuestion(question)
              ? 'question-is-choice'
              : teacherHasAnswered
                ? 'teacher-already-answered'
                : session.status !== 'PLAYING'
                  ? 'session-not-playing'
                  : 'empty-typed-answer',
        userId: teacherUid,
        hasAnswered: teacherHasAnswered,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        status: session?.status,
      });
      return;
    }

    await persistTeacherAnswer({
      responseText: typedAnswer.trim(),
    });
  }

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    try {
      audioRef.current?.start();
      const dedupedActiveParticipants = Array.from(
        new Map(activeParticipants.map((participant) => [participant.uid, participant])).values()
      );
      console.log('[BATTLE DEBUG] Teacher handleStart executing', {
        classId,
        sessionId: session.id,
        teacherUid,
        includeTeacherConfig: session.config.includeTeacher,
        botEnabledConfig: session.config.botEnabled,
        activeParticipantIds: dedupedActiveParticipants.map((participant) => participant.uid),
      });

      // ── Build Participants Snapshot manually to ensure correct order and flags ──
      const participantsSnapshot: any[] = [];
      const seenUids = new Set<string>();

      // 1. Include Teacher if option is marked and UID is valid
      if (session.config.includeTeacher && teacherUid) {
        const teacherName = session.scores?.[teacherUid]?.name || 'Professor';
        participantsSnapshot.push({
          uid: teacherUid,
          role: 'teacher',
          type: 'teacher',
          name: teacherName,
        });
        seenUids.add(teacherUid);
      }

      // 2. Include Bot if enabled
      if (session.config.botEnabled) {
        participantsSnapshot.push({
          uid: BATTLE_BOT_UID,
          role: 'bot',
          type: 'bot',
          name: session.config.botName || 'Bot',
          avatarId: session.config.botAvatarId,
        });
        seenUids.add(BATTLE_BOT_UID);
      }

      // 3. Include all online students (activeParticipants)
      dedupedActiveParticipants.forEach((student) => {
        if (seenUids.has(student.uid)) return;
        participantsSnapshot.push({
          uid: student.uid,
          role: 'student',
          type: 'student',
          name: student.name,
        });
        seenUids.add(student.uid);
      });

      const sessionToStart: BattleSession = {
        ...session,
        status: 'PLAYING',
        currentQuestionIndex: 0,
        currentQuestionId: session.questions[0]?.id ?? null,
        roundParticipantIds: participantsSnapshot.map(p => p.uid),
      };

      console.log('[BATTLE DEBUG] handleStart — constructed payload', {
        status: sessionToStart.status,
        roundParticipantIds: sessionToStart.roundParticipantIds,
        participantsSnapshotCount: participantsSnapshot.length,
        participantEntries: participantsSnapshot,
      });
      await startBattle(classId, sessionToStart, participantsSnapshot, teacherUid);
    } catch (error) {
      console.error('[BATTLE START ERROR]', error);
    } finally {
      setBusy(false);
    }
  }

  async function handleShowAnswer() {
    setBusy(true);
    try {
      await showBattleAnswer(classId, effectiveRoundParticipantIds);
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueToRanking() {
    setBusy(true);
    try {
      await showBattleRanking(classId);
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    setBusy(true);
    try {
      await advanceBattleQuestion(
        classId,
        questionIdx + 1,
        totalQuestions,
        buildRoundParticipantsSnapshot(),
        session.scores ?? {},
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    setBusy(true);
    try {
      await endBattle(classId);
    } finally {
      setBusy(false);
    }
  }

  if (showResults) {
    return (
      <BattleResultsScreen
        scores={session.scores ?? {}}
        myUid={teacherUid}
        onNewBattle={onNewBattle}
        onClose={onClose}
        isTeacher={true}
        validParticipantIds={roundParticipantIds}
        uiLanguage={uiLanguage}
      />
    );
  }

  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const questionHint = repairBattleTextEncoding(question?.hint) ?? '';
  const correctCount = roundAnswerSummary.correct;
  const wrongCount = roundAnswerSummary.wrong;
  const unansweredCount = roundAnswerSummary.unanswered;

  return (
    <div className="fixed inset-0 z-[9000] flex select-none bg-slate-950">
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm">{copy.brandTitle}</span>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              Q {Math.min(questionIdx + 1, totalQuestions)} / {totalQuestions}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-slate-800 px-2 py-1">
              <span className="text-xs text-slate-300" title={copy.musicVolume}>🔊</span>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={Math.round(musicVolume * 100)}
                onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
                className="h-1.5 w-20 accent-orange-500"
                title={copy.musicVolume}
                aria-label={copy.musicVolume}
              />
            </div>
            <button onClick={handleEnd} className="text-xs text-slate-500 transition hover:text-red-400">
              {copy.endGame}
            </button>
          </div>
        </div>

        <div className="h-1.5 flex-shrink-0 bg-slate-800">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${Math.max(0, Math.min(1, timeRatio)) * 100}%`,
              backgroundColor: timeRatio > 0.5 ? '#22c55e' : timeRatio > 0.25 ? '#f97316' : '#ef4444',
            }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-5 overflow-y-auto px-6 py-4">
          {session.status === 'WAITING' ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              {(() => {
                console.info('[BATTLE HOST WAITING SCREEN] showing pre-start lobby', {
                  classId,
                  sessionId: session.id,
                  status: session.status,
                  participantCount: activeParticipants.length,
                });
                return null;
              })()}
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-white">{copy.battleRoom}</h2>
                <p className="text-sm text-slate-400">
                  {activeParticipants.length > 0
                    ? copy.participantsOnline(activeParticipants.length)
                    : copy.waitingStudents}
                </p>
                <p className="text-xs text-slate-500 mt-4">
                  {totalQuestions} {copy.questionsWord} | {session.config.timePerQuestion}s {copy.each} | {session.config.difficulty}
                </p>
              </div>
            </div>
          ) : question ? (
            <>
              {(() => {
                console.info('[BATTLE HOST QUESTION STATE] rendering question during active battle', {
                  classId,
                  sessionId: session.id,
                  status: session.status,
                  questionIdx,
                  questionId: question.id,
                });
                return null;
              })()}
              <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-slate-800/80 p-6 text-center shadow-lg">
                <p className="text-xs uppercase tracking-wider text-slate-500">{copy.question} {questionIdx + 1}</p>
                <div className="text-3xl font-bold leading-snug text-white">{(question.text as string) || ''}</div>
                {question.imageUrl ? (
                  <img
                    src={question.imageUrl}
                    alt="Question reference"
                    className="mx-auto max-h-52 w-auto rounded-xl border border-slate-700 bg-slate-900 object-contain"
                  />
                ) : null}
              </div>

              {isChoiceQuestion(question) ? (
                <>
                  <div className="pointer-events-auto relative z-10 grid w-full max-w-lg grid-cols-2 gap-3">
                    {(question.options ?? []).map((option, index) => {
                      const showCorrect =
                        effectiveStatus === 'REVEALED' &&
                        (teacherHasAnswered || displayTimeLeft <= 0);
                      const isCorrect = getBattleCorrectIndexes(question).includes(index);
                      const isTeacherSelection = selectedOptions.includes(index);
                      const disabled = effectiveStatus !== 'PLAYING' || teacherHasAnswered || timeUp;
                      const disabledReason =
                        effectiveStatus !== 'PLAYING'
                          ? 'status-not-playing'
                          : teacherHasAnswered
                            ? 'already-answered'
                            : timeUp
                              ? 'time-up'
                              : 'enabled';
                      console.log('[BATTLE ROUND STATE DEBUG] option disabled check', {
                        optionIndex: index,
                        disabled,
                        reason: disabledReason,
                        roundStatus: session?.roundStatus ?? null,
                        isRevealed: session?.isRevealed ?? false,
                        showAnswer: session?.showAnswer ?? false,
                        timeUp,
                        hasAnswered: teacherHasAnswered,
                      });
                      console.log('[BATTLE ANSWER DEBUG] option state', {
                        optionIndex: index,
                        option,
                        disabled,
                        userId: teacherUid,
                        participantId: teacherUid,
                        hasAnswered: teacherHasAnswered,
                        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
                      });

                      return (
                        <button
                          key={index}
                          onClick={() => toggleTeacherChoice(index)}
                          disabled={disabled}
                          className={`pointer-events-auto relative z-10 rounded-xl border-2 px-3 py-4 text-center text-sm font-bold transition-all ${
                            showCorrect && isCorrect
                              ? 'border-green-500 bg-green-500/20 text-green-300'
                              : isTeacherSelection
                                ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                                : showCorrect
                                  ? 'border-slate-700 text-slate-500'
                                  : 'border-slate-600 text-white'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {teacherCanPlay && requiresChoiceConfirmation ? (
                    <button
                      onClick={confirmTeacherChoice}
                      disabled={teacherHasAnswered || selectedOptions.length === 0 || effectiveStatus !== 'PLAYING'}
                      className="w-full max-w-lg rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {copy.confirmTeacherAnswer}
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="w-full max-w-lg space-y-3">
                  <textarea
                    value={typedAnswer}
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    disabled={!teacherCanPlay || teacherHasAnswered || effectiveStatus !== 'PLAYING'}
                    placeholder={(question.kind as BattleQuestionKind) === 'speaking' ? copy.teacherSpeakingPlaceholder : copy.teacherTypingPlaceholder}
                    className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                  {teacherCanPlay ? (
                    <div className="flex gap-3">
                      {(question.kind as BattleQuestionKind) === 'speaking' ? (
                        <button
                          onClick={startSpeechRecognition}
                          disabled={teacherHasAnswered || isListening || effectiveStatus !== 'PLAYING'}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                        >
                          {isListening ? copy.listening : copy.answerByVoice}
                        </button>
                      ) : null}
                      <button
                        onClick={handleTeacherOpenAnswer}
                        disabled={!typedAnswer.trim() || teacherHasAnswered || effectiveStatus !== 'PLAYING'}
                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {copy.confirmTeacherAnswer}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>{Math.ceil(displayTimeLeft)}s</span>
                <span>|</span>
                <span>{answerCount} / {effectiveRoundParticipantIds.length} {copy.answered}</span>
              </div>

              {effectiveStatus === 'REVEALED' ? (
                <>
                  <p className="text-center text-sm font-semibold text-green-300">
                    {copy.correctAnswer}: <span className="font-bold text-green-200">{answerLabel || '-'}</span>
                  </p>
                  {questionHint ? (
                    <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.feedbackTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-200">{questionHint}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <span className="rounded-full bg-green-500/15 px-3 py-1 font-semibold text-green-400">
                      {correctCount} {copy.correct}
                    </span>
                    <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-400">
                      {wrongCount} {copy.wrong}
                    </span>
                    {unansweredCount > 0 ? (
                      <span className="rounded-full bg-slate-700/40 px-3 py-1 font-semibold text-slate-400">
                        {unansweredCount} {copy.noAnswer}
                      </span>
                    ) : null}
                  </div>
                  {wrongParticipantNames.length > 0 ? (
                    <div className="w-full max-w-2xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300">{copy.wrongStudents}</p>
                      <p className="mt-1 text-sm leading-6 text-red-100">{wrongParticipantNames.join(', ')}</p>
                    </div>
                  ) : null}
                  {session.roundStatus !== 'ranking' ? (
                    <button
                      onClick={handleContinueToRanking}
                      disabled={busy}
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {copy.continueReview}
                    </button>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>

        {showRankingOverlay && effectiveStatus === 'REVEALED' && session.roundStatus === 'ranking' ? (
          <div className="fixed inset-0 z-[9500] flex flex-col bg-black/96 backdrop-blur-md">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{copy.roundResults}</p>
                <h2 className="mt-1 text-xl font-black text-white">{copy.currentRanking}</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="mx-auto w-full max-w-5xl space-y-2">
              {leaderboard.slice(0, 10).map((player, index) => {
                const row = { ...player, placement: index + 1, pid: player.uid };
                return (
                <div
                  key={player.uid}
                  className="flex items-center gap-3 rounded-2xl border border-slate-700/40 bg-slate-800/60 px-4 py-3 text-sm"
                >
                  <span className="w-8 text-center text-base font-bold text-white">
                    {row.placement === 1 ? '🥇' : row.placement === 2 ? '🥈' : row.placement === 3 ? '🥉' : `#${row.placement}`}
                  </span>
                  <span className="flex-1 truncate text-white">
                    {player.name}
                    {player.uid === teacherUid ? <span className="ml-1 text-[10px] text-slate-500">({copy.teacherShort})</span> : null}
                  </span>
                  <span className="text-xs font-bold text-orange-300">{(player.score ?? 0).toLocaleString()} pts</span>
                </div>
              );
              })}
              </div>
            </div>
            <div className="flex flex-shrink-0 justify-center border-t border-slate-800 px-5 py-3">
              <button
                onClick={() => {
                  void handleNext();
                }}
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-10 py-3 text-base font-black text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {questionIdx + 1 >= totalQuestions ? copy.finishBattle : copy.nextQuestion}
              </button>
            </div>
          </div>
        ) : null}

        {/* [BATTLE HOST TIMER] Moved "Iniciar Batalha" button to bottom bar */}
        {session.status === 'WAITING' ? (
          <div className="relative z-[9999] flex flex-shrink-0 justify-center gap-3 border-t border-slate-800/50 px-5 py-3 pointer-events-auto">
            <button
              onClick={() => {
                console.log('[BATTLE START CLICK]');
                handleStart();
              }}
              disabled={busy}
              className="relative z-[9999] pointer-events-auto rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-10 py-3 text-base font-black text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {copy.startBattle}
            </button>
          </div>
        ) : null}
        <div className="flex flex-shrink-0 justify-center gap-3 border-t border-slate-800/50 px-5 py-3">
          {session.status === 'PLAYING' && !allAnsweredLocally ? (
            <button
              onClick={handleShowAnswer}
              disabled={busy}
              className="rounded-xl bg-slate-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              {copy.revealAnswer}
            </button>
          ) : null}
          {effectiveStatus === 'REVEALED' && session.roundStatus === 'ranking' ? (
            <button
              onClick={handleNext}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-10 py-3 text-base font-black text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {questionIdx + 1 >= totalQuestions ? copy.finishBattle : copy.nextQuestion}
            </button>
          ) : null}
        </div>

        {leaderboard.length > 0 ? (
          <div className="flex flex-shrink-0 items-center gap-2 overflow-x-auto border-t border-slate-800 px-4 pb-2 pt-2 md:hidden">
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-slate-500">{copy.ranking}</span>
            {leaderboard.slice(0, 3).map((player, index) => (
              <div key={player.uid} className="flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                <span className="text-xs">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                <span className="max-w-[64px] truncate text-[11px] text-white">{player.name}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden w-52 flex-col border-l border-slate-800 bg-slate-900 md:flex">
        <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{copy.top10}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {leaderboard.length > 0 ? (
            leaderboard.map((player, index) => (
              <div key={player.uid} className="flex items-center gap-2 px-4 py-2">
                <span className="w-5 text-center text-sm text-slate-500">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="flex-1 truncate text-xs text-white">{player.name}</span>
              </div>
            ))
          ) : (
            <p className="mt-6 text-center text-xs text-slate-600">{copy.noParticipantsYet}</p>
          )}
        </div>
      </div>
    </div>
  );
};
