import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appLangToTts, speak } from '../../../services/ttsService';
import type {
  BattleAnswer,
  BattleSession,
  BattleQuestion,
  BattleQuestionKind,
} from './battleTypes';
import { BattleLabIndicators } from './BattleLabIndicators';
import { joinBattle, submitBattleAnswer } from './battleService';
import { BattleResultsScreen } from './BattleResultsScreen';
import {
  canBattleParticipantAnswerCurrentQuestion,
  calculateBattleRoundScore,
  evaluateBattleAnswer,
  getBattleCorrectAnswerLabel,
  getBattleCorrectIndexes,
  getBattleLanguage,
  getBattleQuestionDuration,
  getBattlePromptAudioText,
  getBattleRegisteredParticipantIds,
  getMyBattleAnswer,
  isChoiceQuestion,
  repairBattleTextEncoding,
} from './battleUtils';

interface TensionLoop {
  start(): void;
  stop(): void;
  setVolume(v: number): void;
}

function createBattleAudio(): TensionLoop | null {
  try {
    const audio = new Audio('/sounds/battle_theme.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    return {
      start() { audio.play().catch(() => {}); },
      stop() { audio.pause(); audio.currentTime = 0; },
      setVolume(v: number) { audio.volume = Math.max(0, Math.min(1, v)); },
    };
  } catch {
    return null;
  }
}

interface Props {
  session: BattleSession;
  classId: string;
  uid: string;
  name: string;
  uiLanguage?: 'en' | 'pt' | 'es';
}

const PLAYER_COPY = {
  en: {
    waitingTitle: 'Battle Starting!',
    waitingBody: 'Waiting for the teacher to start...',
    yourScore: 'Your score',
    correct: 'Correct!',
    wrong: 'Wrong!',
    timeUp: 'Time up!',
    answer: 'Answer',
    feedbackTitle: 'Why',
    totalScore: 'Total score',
    roundPoints: (points: number) => `+${points} this round`,
    streak: (value: number) => `${value} de sequencia!`,
    waitingNext: 'Waiting for next question...',
    correctCount: 'correct',
    wrongCount: 'wrong',
    preparingTitle: 'Preparing battle',
    preparingBody: 'The session is already running, but the current question has not finished loading yet.',
    preparingHint: 'Waiting for the next Firestore snapshot...',
    lockedTitle: 'Current round locked',
    lockedBody: 'You joined after this question started, so you will enter on the next round.',
    participantsInBattle: 'Participants in battle',
    answered: 'answered',
    lockedHint: 'You are already in the battle and will play the next question automatically.',
    pts: 'pts',
    unmuteMusic: 'Enable music',
    muteMusic: 'Mute music',
    audioChoiceHint: 'Listen once and choose the correct answer.',
    audioOpenHint: 'Listen once and type the answer.',
    speakingHint: 'Listen to the command and answer with a full sentence.',
    confirmAnswer: 'Confirm answer',
    yourSpeechAnswer: 'Your spoken answer appears here...',
    yourTypedAnswer: 'Type your answer...',
    listening: 'Listening...',
    answerByVoice: 'Answer by voice',
  },
  pt: {
    waitingTitle: 'Batalha vai comecar!',
    waitingBody: 'Aguardando o professor iniciar...',
    yourScore: 'Sua pontuacao',
    correct: 'Correto!',
    wrong: 'Errado!',
    timeUp: 'Tempo esgotado!',
    answer: 'Resposta',
    feedbackTitle: 'Explicacao',
    totalScore: 'Pontuacao total',
    roundPoints: (points: number) => `+${points} nesta rodada`,
    streak: (value: number) => `${value} streak!`,
    waitingNext: 'Aguardando a proxima pergunta...',
    correctCount: 'certo',
    wrongCount: 'errado',
    preparingTitle: 'Preparando batalha',
    preparingBody: 'A sessao ja esta em andamento, mas a pergunta atual ainda nao terminou de carregar.',
    preparingHint: 'Aguardando o proximo snapshot do Firestore...',
    lockedTitle: 'Rodada atual bloqueada',
    lockedBody: 'Voce entrou depois que esta pergunta comecou, entao vai participar na proxima rodada.',
    participantsInBattle: 'Participantes na batalha',
    answered: 'responderam',
    lockedHint: 'Voce ja esta na batalha e vai jogar a proxima pergunta automaticamente.',
    pts: 'pts',
    unmuteMusic: 'Ativar musica',
    muteMusic: 'Silenciar musica',
    audioChoiceHint: 'Escute apenas uma vez e escolha a resposta entre as alternativas.',
    audioOpenHint: 'Escute apenas uma vez e digite a resposta.',
    speakingHint: 'Ouca o comando e responda falando uma frase completa.',
    confirmAnswer: 'Confirmar resposta',
    yourSpeechAnswer: 'Sua resposta falada aparece aqui...',
    yourTypedAnswer: 'Digite sua resposta...',
    listening: 'Ouvindo...',
    answerByVoice: 'Responder falando',
  },
  es: {
    waitingTitle: 'La batalla va a empezar!',
    waitingBody: 'Esperando a que el profesor inicie...',
    yourScore: 'Tu puntuacion',
    correct: 'Correcto!',
    wrong: 'Incorrecto!',
    timeUp: 'Se acabo el tiempo!',
    answer: 'Respuesta',
    feedbackTitle: 'Explicacion',
    totalScore: 'Puntuacion total',
    roundPoints: (points: number) => `+${points} en esta ronda`,
    streak: (value: number) => `${value} de racha!`,
    waitingNext: 'Esperando la siguiente pregunta...',
    correctCount: 'correctas',
    wrongCount: 'incorrectas',
    preparingTitle: 'Preparando batalla',
    preparingBody: 'La sesion ya esta en marcha, pero la pregunta actual todavia no termino de cargar.',
    preparingHint: 'Esperando el siguiente snapshot de Firestore...',
    lockedTitle: 'Ronda actual bloqueada',
    lockedBody: 'Entraste despues de que empezo esta pregunta, asi que participaras en la siguiente ronda.',
    participantsInBattle: 'Participantes en la batalla',
    answered: 'respondieron',
    lockedHint: 'Ya estas en la batalla y jugaras la siguiente pregunta automaticamente.',
    pts: 'pts',
    unmuteMusic: 'Activar musica',
    muteMusic: 'Silenciar musica',
    audioChoiceHint: 'Escucha solo una vez y elige la respuesta correcta.',
    audioOpenHint: 'Escucha solo una vez y escribe la respuesta.',
    speakingHint: 'Escucha la consigna y responde con una frase completa.',
    confirmAnswer: 'Confirmar respuesta',
    yourSpeechAnswer: 'Tu respuesta hablada aparece aqui...',
    yourTypedAnswer: 'Escribe tu respuesta...',
    listening: 'Escuchando...',
    answerByVoice: 'Responder hablando',
  },
} as const;

export const BattlePlayerView: React.FC<Props> = ({ session, classId, uid, name, uiLanguage = 'en' }) => {
  const copy = PLAYER_COPY[uiLanguage] ?? PLAYER_COPY.en;
  const participantId = uid;
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Local answer registered immediately on submit.
  // Ensures reveal shows correct/incorrect and roundPoints without waiting for Firestore.
  const [localMyAnswer, setLocalMyAnswer] = useState<BattleAnswer | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(session.config.timePerQuestion);
  const [frozenTimeLeft, setFrozenTimeLeft] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinAttemptRef = useRef<string | null>(null);
  const joinInFlightRef = useRef(false);
  const preRoundScoreRef = useRef(0);
  const musicRef = useRef<TensionLoop | null>(null);
  const recognitionRef = useRef<any>(null);
  const promptPlayedRef = useRef<string>('');

  function rollbackStudentSubmitLock() {
    setSubmitted(false);
    setLocalMyAnswer(null);
    setFrozenTimeLeft(null);
    const fallbackRemainingSeconds =
      endsAt != null
        ? Math.max(0, (endsAt - Date.now()) / 1000)
        : getBattleQuestionDuration(session.questions[session.currentQuestionIndex] ?? null, session.config);
    setTimeLeft(fallbackRemainingSeconds);
  }

  function isCurrentRoundAnswer(answer?: BattleAnswer | null) {
    if (!answer) return false;
    if (session.questionStartedAt <= 0) return true;
    return answer.answeredAt >= session.questionStartedAt;
  }

  const questionIdx = Number.isInteger(session.currentQuestionIndex) ? session.currentQuestionIndex : 0;
  const hasCurrentQuestion =
    questionIdx >= 0 &&
    questionIdx < session.questions.length;
  const question = hasCurrentQuestion ? session.questions[questionIdx] : null;
  const currentQuestionDuration = getBattleQuestionDuration(question, session.config);
  const currentQuestionId = question?.id ?? null;
  const totalQ = session.questions.length;
  const registeredParticipantIds = useMemo(
    () => getBattleRegisteredParticipantIds(session),
    [session.participants, session.scores]
  );
  const isRegisteredParticipant = registeredParticipantIds.includes(uid) || (session.roundParticipantIds ?? []).includes(uid);
  const canAnswerCurrentQuestion = useMemo(
    () => canBattleParticipantAnswerCurrentQuestion(session, uid),
    [session.roundParticipantIds, session.participants, session.scores, uid]
  );
  const currentRoundLocalAnswer = isCurrentRoundAnswer(localMyAnswer) ? localMyAnswer : null;
  const visiblePlayerScores = useMemo(
    () => {
      if (!currentRoundLocalAnswer) return session.scores ?? {};
      const previous = session.scores?.[uid];
      const preRoundScore = preRoundScoreRef.current ?? previous?.score ?? 0;
      return {
        ...(session.scores ?? {}),
        [uid]: {
          uid,
          name: previous?.name ?? currentRoundLocalAnswer.name ?? name,
          score: Math.max(previous?.score ?? 0, preRoundScore + (currentRoundLocalAnswer.roundPoints ?? 0)),
          streak: currentRoundLocalAnswer.isCorrect ? (previous?.streak ?? 0) + 1 : 0,
          lastAnswerCorrect: currentRoundLocalAnswer.isCorrect,
          avatarId: previous?.avatarId ?? session.participants?.[uid]?.avatarId,
          isBot: previous?.isBot ?? session.participants?.[uid]?.isBot,
        },
      };
    },
    [currentRoundLocalAnswer, name, session.participants, session.scores, uid]
  );
  const myScore = visiblePlayerScores[uid]?.score ?? 0;
  // Use localMyAnswer as fallback so reveal shows correct/incorrect immediately
  // before Firestore echoes back the written answer.
  const myAnswer = currentRoundLocalAnswer ?? getMyBattleAnswer(session, uid);
  const hasAnswered = submitted || !!myAnswer;
  const myTotalScore = hasAnswered
    ? Math.max(myScore, preRoundScoreRef.current + (myAnswer?.roundPoints ?? 0))
    : myScore;
  const myStreak = visiblePlayerScores[uid]?.streak ?? 0;
  const effectiveFrozenTimeLeft = frozenTimeLeft ?? myAnswer?.frozenTimeLeft ?? null;
  const roundDurationMs = session.roundDurationMs ?? session.durationMs ?? currentQuestionDuration * 1000;
  const roundStartedAt =
    typeof session.roundStartedAt === 'number' && session.roundStartedAt > 0
      ? session.roundStartedAt
      : typeof session.questionStartedAt === 'number' && session.questionStartedAt > 0
        ? session.questionStartedAt
        : null;
  const endsAt =
    session.endsAt ?? (roundStartedAt != null && roundDurationMs > 0 ? roundStartedAt + roundDurationMs : null);
  const remainingMs =
    effectiveFrozenTimeLeft != null
      ? effectiveFrozenTimeLeft * 1000
      : endsAt != null
        ? Math.max(0, endsAt - Date.now())
        : roundDurationMs;
  const timeUp = session.status === 'PLAYING' && effectiveFrozenTimeLeft == null && endsAt != null && remainingMs <= 0;
  const displayTime = hasAnswered && effectiveFrozenTimeLeft != null ? effectiveFrozenTimeLeft : timeLeft;
  const battleLanguage = getBattleLanguage(session.config.courseId);
  const timeRatio = displayTime / currentQuestionDuration;
  const interactionLocked = hasAnswered || timeUp || session.status !== 'PLAYING';
  const isOpenQuestion = question ? !isChoiceQuestion(question) : false;
  const showMicButton = question?.kind === 'speaking';
  const requiresChoiceConfirmation = question ? getBattleCorrectIndexes(question).length > 1 : false;
  const roundAnswerCount = useMemo(
    () => {
      const mergedAnswers = currentRoundLocalAnswer ? { ...session.currentAnswers, [uid]: currentRoundLocalAnswer } : session.currentAnswers;
      return (session.roundParticipantIds ?? []).filter((participantId) => participantId in mergedAnswers).length;
    },
    [currentRoundLocalAnswer, session.roundParticipantIds, session.currentAnswers, uid]
  );

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
      remainingMs,
      answers: session?.answers ?? session?.currentAnswers,
      participants: session?.participants,
      roundParticipantIds: session?.roundParticipantIds,
    });
    console.log('[LIVE BATTLE SESSION] loaded', {
      liveClassId: classId,
      userId: uid,
      role: 'student',
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
      userId: uid,
      participantId,
      isHost: false,
      isTeacher: false,
      participants: session?.participants,
      roundParticipantIds: session?.roundParticipantIds,
      answers: (session as BattleSession & { answers?: unknown }).answers ?? null,
      responses: (session as BattleSession & { responses?: unknown }).responses ?? null,
    });
  }, [
    participantId,
    question,
    endsAt,
    remainingMs,
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
    timeUp,
    uid,
  ]);

  useEffect(() => {
    console.log('[BATTLE DEBUG] BattlePlayerView mounted (Student)', {
      sessionId: session.id,
      classId,
      uid,
      status: session.status,
      inRound: (session.roundParticipantIds ?? []).includes(uid)
    });
  }, [classId, session.id, uid]);

  useEffect(() => {
    musicRef.current = createBattleAudio();
    return () => { musicRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (session.status === 'PLAYING') {
      if (!musicMuted) musicRef.current?.start();
    } else {
      musicRef.current?.stop();
    }
  }, [session.status, musicMuted]);

  useEffect(() => {
    musicRef.current?.setVolume(musicMuted ? 0 : 1);
  }, [musicMuted]);

  useEffect(() => {
    const alreadyTrackedInScores = uid in (session.scores ?? {});
    const alreadyTrackedInParticipants = uid in (session.participants ?? {});
    const alreadyTrackedInRound = (session.roundParticipantIds ?? []).includes(uid);
    const shouldSyncCurrentRound = session.status === 'WAITING';
    const needsMembershipSync =
      !alreadyTrackedInScores ||
      !alreadyTrackedInParticipants ||
      (shouldSyncCurrentRound && !alreadyTrackedInRound);

    console.info('[BATTLE STUDENT JOIN] sync check', {
      component: 'BattlePlayerView',
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      alreadyTrackedInScores,
      alreadyTrackedInParticipants,
      alreadyTrackedInRound,
      shouldSyncCurrentRound,
      needsMembershipSync,
    });

    if (!needsMembershipSync) {
      console.info('[BATTLE STUDENT JOIN] already synced - no action needed', {
        component: 'BattlePlayerView',
        classId,
        sessionId: session.id,
        uid,
      });
      joinAttemptRef.current = null;
      return;
    }

    const joinStateKey = [
      classId,
      session.id,
      session.status,
      session.currentQuestionId ?? session.currentQuestionIndex,
      uid,
      alreadyTrackedInScores ? 'score:1' : 'score:0',
      alreadyTrackedInParticipants ? 'participant:1' : 'participant:0',
      alreadyTrackedInRound ? 'round:1' : 'round:0',
    ].join('|');

    if (joinInFlightRef.current || joinAttemptRef.current === joinStateKey) {
      return;
    }

    joinAttemptRef.current = joinStateKey;
    joinInFlightRef.current = true;

    console.log('[BATTLE DEBUG] Student calling joinBattle', {
      classId,
      uid,
      name
    });

    joinBattle(classId, uid, name, session.scores[uid] ?? null)
      .then(() => {
        console.info('[BATTLE STUDENT JOIN] sync completed successfully', {
          component: 'BattlePlayerView',
          classId,
          sessionId: session.id,
          uid,
          status: session.status,
        });
      })
      .catch((error) => {
        joinAttemptRef.current = null;
        console.error('[BATTLE STUDENT JOIN] sync failed', {
          component: 'BattlePlayerView',
          classId,
          sessionId: session.id,
          uid,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        joinInFlightRef.current = false;
      });
  }, [
    classId,
    name,
    session.currentQuestionIndex,
    session.currentQuestionId,
    session.id,
    session.participants,
    session.roundParticipantIds,
    session.scores,
    session.status,
    uid,
  ]);

  useEffect(() => {
    console.log('[BATTLE QUESTION] mounted questionId:', currentQuestionId);
    console.log('[BATTLE QUESTION] session status on mount:', session.status);
    console.log('[BATTLE QUESTION] reveal state on mount:', session.status === 'REVEALED');
    console.log('[BATTLE QUESTION] translation visible on mount:', Boolean(question?.hint));
    console.log('[BATTLE QUESTION] correct option visible on mount:', session.status === 'REVEALED');
    console.log('[BATTLE QUESTION] correct answer text visible on mount:', session.status === 'REVEALED' && Boolean(getBattleCorrectAnswerLabel(question)));
    preRoundScoreRef.current = session.scores[uid]?.score ?? 0;
    setSelectedOptions([]);
    setTypedAnswer('');
    setSubmitted(false);
    setLocalMyAnswer(null);
    setFrozenTimeLeft(null);
    setTimeLeft(currentQuestionDuration);
    console.log('[BATTLE QUESTION] reset state after question change:', {
      questionId: currentQuestionId,
      submitted: false,
      selectedCount: 0,
      typedAnswer: '',
    });
    console.log('[BATTLE STUDENT UI] render branch: next-question reset');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [currentQuestionDuration, currentQuestionId, questionIdx, session.questionStartedAt, uid]);

  useEffect(() => {
    if (session.status !== 'PLAYING') return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (roundStartedAt == null || roundDurationMs <= 0) {
      setTimeLeft(currentQuestionDuration);
      return;
    }

    const start = roundStartedAt;
    timerRef.current = setInterval(() => {
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
        clearInterval(timerRef.current);
      }
    }, 200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentQuestionDuration, endsAt, roundDurationMs, roundStartedAt, session.status, session.questionStartedAt, session.roundStartedAt]);

  useEffect(() => {
    if (session.status === 'FINISHED') setShowResults(true);
  }, [session.status]);

  useEffect(() => {
    console.info('[BATTLE INTEGRATION] student player snapshot', {
      component: 'BattlePlayerView',
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestionId,
      canAnswerCurrentQuestion,
      roundParticipantIds: session.roundParticipantIds ?? [],
    });
    console.info('[BATTLE PLAYER SESSION] student battle session snapshot', {
      component: 'BattlePlayerView',
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      currentQuestionId,
      roundParticipantIds: session.roundParticipantIds ?? [],
      canAnswerCurrentQuestion,
    });
    console.log('[BATTLE PLAYER] snapshot status:', session.status);
    console.log('[BATTLE PLAYER] currentQuestionIndex:', session.currentQuestionIndex);
    console.log('[BATTLE PLAYER] questionStartedAt:', session.questionStartedAt);
    console.log('[BATTLE PLAYER] roundParticipantIds:', session.roundParticipantIds ?? []);
    console.log('[BATTLE PLAYER] my uid in round:', (session.roundParticipantIds ?? []).includes(uid));
    console.log('[BATTLE PLAYER] currentQuestion resolved:', {
      battleId: session.id,
      roomId: classId,
      currentQuestionId,
      hasCurrentQuestion,
      currentAnswersForUid: session.currentAnswers?.[uid] ?? null,
      answeredAt: myAnswer?.answeredAt ?? null,
      frozenTimeLeft: effectiveFrozenTimeLeft,
      roundPoints: myAnswer?.roundPoints ?? null,
    });
  }, [
    canAnswerCurrentQuestion,
    classId,
    effectiveFrozenTimeLeft,
    hasCurrentQuestion,
    myAnswer?.answeredAt,
    myAnswer?.roundPoints,
    session,
    currentQuestionId,
    uid,
  ]);

  useEffect(() => {
    console.log('[BATTLE STUDENT UI] status from snapshot:', session.status);
    console.log('[BATTLE STUDENT UI] hasAnswered/local locked:', hasAnswered);
    console.log('[BATTLE STUDENT UI] currentQuestionIndex:', session.currentQuestionIndex);
    if (session.status === 'REVEALED') {
      console.log('[BATTLE STUDENT UI] render branch: showing-answer');
      return;
    }
    if (session.status === 'PLAYING' && hasAnswered) {
      console.log('[BATTLE STUDENT UI] render branch: locked');
      return;
    }
    if (session.status === 'PLAYING') {
      console.log('[BATTLE STUDENT UI] render branch: active');
    }
  }, [hasAnswered, session.currentQuestionIndex, session.status]);

  useEffect(() => {
    console.log('[BATTLE SCORE] uid:', uid);
    console.log('[BATTLE SCORE] role/player type:', 'student');
    console.log('[BATTLE SCORE] delta awarded:', currentRoundLocalAnswer?.roundPoints ?? 0);
    console.log('[BATTLE SCORE] total after merge:', myTotalScore);
    console.log('[BATTLE SCORE] persisted scores snapshot:', Object.values(session.scores ?? {}).map((player) => ({
      uid: player.uid,
      score: player.score,
      name: player.name,
    })));
    console.log('[BATTLE SCORE] sidebar entries before render:', Object.values(visiblePlayerScores ?? {}).map((player) => ({
      uid: player.uid,
      score: player.score,
      name: player.name,
    })));
    console.log('[BATTLE SCORE] player uid present in scores:', uid in (visiblePlayerScores ?? {}));
  }, [currentRoundLocalAnswer?.roundPoints, myTotalScore, session.scores, uid, visiblePlayerScores]);

  useEffect(() => {
    if (!hasAnswered) return;
    if (effectiveFrozenTimeLeft == null) return;
    setFrozenTimeLeft((current) => current ?? effectiveFrozenTimeLeft);
  }, [effectiveFrozenTimeLeft, hasAnswered]);

  useEffect(() => {
    console.info('[BATTLE PLAYER FLOW] derived timer state', {
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      hasAnswered,
      timeLeft,
      effectiveFrozenTimeLeft,
      displayTime,
    });
  }, [classId, displayTime, effectiveFrozenTimeLeft, hasAnswered, session.id, session.status, timeLeft, uid]);

  useEffect(() => {
    if (!question || session.status !== 'PLAYING' || !question.playAudioOnce) return;
    const promptKey = `${session.id}:${question.id}:${session.status}`;
    if (promptPlayedRef.current === promptKey) return;

    promptPlayedRef.current = promptKey;
    const audioText = getBattlePromptAudioText(question);
    console.log('[BATTLE AUDIO] questionId:', question.id);
    console.log('[BATTLE AUDIO] question type:', question.kind);
    console.log('[BATTLE AUDIO] source field used for audio:', question.promptAudioText ? 'promptAudioText' : 'text');
    console.log('[BATTLE AUDIO] audio text resolved:', audioText);
    window.setTimeout(() => {
      speak(audioText, battleLanguage);
    }, 250);
  }, [session.id, session.status, question, battleLanguage]);

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz nao esta disponivel neste navegador.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
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

  async function submitChoiceAnswer(optionIndexes: number[]) {
    console.log('[BATTLE ANSWER DEBUG] submit answer entered', {
      sessionId: session.id,
      userId: uid,
      participantId,
      optionIndex: optionIndexes[0] ?? null,
    });
    console.log('[BATTLE STUDENT SUBMIT] uid:', uid);
    console.log('[BATTLE STUDENT SUBMIT] questionIndex:', session.currentQuestionIndex);
    console.log('[BATTLE STUDENT SUBMIT] option selected:', optionIndexes);
    console.log('[Battle:Player] submitChoiceAnswer called', {
      uid,
      hasQuestion: !!question,
      isChoice: question ? isChoiceQuestion(question) : false,
      canAnswerCurrentQuestion,
      hasAnswered,
      sessionStatus: session.status,
      optionIndexes,
      roundParticipantIds: session.roundParticipantIds,
      scoresKeys: Object.keys(session.scores ?? {}),
    });
    if (!question || !isChoiceQuestion(question) || hasAnswered || timeUp || session.status !== 'PLAYING' || optionIndexes.length === 0) {
      console.warn('[LIVE BATTLE ANSWER] blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : hasAnswered
              ? 'already-answered'
              : timeUp
                ? 'time-up'
                : session.status !== 'PLAYING'
                  ? 'status-not-playing'
                  : 'missing-option-index',
        liveClassId: classId,
        userId: uid,
        role: 'student',
        status: session?.status,
        hasAnswered,
      });
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : hasAnswered
              ? 'already-answered'
              : session.status !== 'PLAYING'
                ? 'session-not-playing'
                : 'missing-option-index',
        sessionId: session.id,
        userId: uid,
        participantId,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered,
      });
      console.log('[Battle:Player] submitChoiceAnswer BLOCKED by guard', { canAnswerCurrentQuestion, hasAnswered, sessionStatus: session.status });
      return;
    }
    
    const answeredAt = Date.now();
    const payload = { optionIndex: optionIndexes[0], optionIndexes };
    
    // Register locally before any await so reveal renders correct state immediately
    const isCorrect = evaluateBattleAnswer(question, payload);
    const { elapsedMs, roundPoints } = calculateBattleRoundScore({
      answeredAt,
      questionStartedAt: session.questionStartedAt,
      timePerQuestion: currentQuestionDuration,
      isCorrect,
    });
    const nextFrozenTimeLeft = Math.max(0, currentQuestionDuration - elapsedMs / 1000);
    console.info('[BATTLE ANSWER]', {
      uid,
      answeredAt,
      elapsedMs,
      frozenTimeLeft: nextFrozenTimeLeft,
      roundPoints,
      roomId: classId,
      battleId: session.id,
    });
    setLocalMyAnswer({
      uid,
      name,
      optionIndex: payload.optionIndex,
      optionIndexes: payload.optionIndexes,
      isCorrect,
      answeredAt,
      elapsedMs,
      roundPoints,
      frozenTimeLeft: nextFrozenTimeLeft,
    });
    setFrozenTimeLeft(nextFrozenTimeLeft);
    setTimeLeft(nextFrozenTimeLeft);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSubmitted(true);
    
    try {
      console.log('[LIVE BATTLE ANSWER] saving', {
        liveClassId: classId,
        userId: uid,
        role: 'student',
        optionIndex: payload.optionIndex ?? null,
        currentQuestionIndex: session.currentQuestionIndex,
      });
      console.log('[BATTLE ANSWER DEBUG] saving answer payload', payload);
      console.log('[BATTLE STUDENT SUBMIT] submit started');
      const result = await submitBattleAnswer(classId, session, uid, name, payload, {
        forceCurrentRoundParticipation: true,
      });
      if (result.status !== 'saved') {
        console.warn('[LIVE BATTLE ANSWER] blocked', {
          reason: result.reason,
          liveClassId: classId,
          userId: uid,
          role: 'student',
          status: session?.status,
          hasAnswered,
        });
        console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
          reason: result.reason,
          sessionId: session.id,
          userId: uid,
          participantId,
          status: session?.status,
          roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
          hasAnswered,
        });
        console.warn('[BATTLE STUDENT SUBMIT] submit failed:', result.reason);
        rollbackStudentSubmitLock();
        return;
      }
      console.log('[BATTLE ANSWER DEBUG] answer saved');
      console.log('[BATTLE STUDENT SCORE] uid:', uid);
      console.log('[BATTLE STUDENT SCORE] delta awarded:', result.answer.roundPoints ?? 0);
      console.log('[BATTLE STUDENT SCORE] total after merge:', result.updatedParticipant.score);
      console.log('[BATTLE STUDENT SCORE] scores keys after save:', Object.keys(session.scores ?? {}).concat(result.updatedParticipant.uid));
      console.log('[BATTLE STUDENT SUBMIT] submit resolved');
    } catch (error) {
      console.error('[LIVE BATTLE ANSWER] failed', error);
      console.error('[BATTLE ANSWER DEBUG] answer failed', error);
      console.error('[BATTLE STUDENT SUBMIT] submit failed:', error);
      rollbackStudentSubmitLock();
    }
  }

  function toggleChoiceSelection(optionIndex: number) {
    const option = question?.options?.[optionIndex] ?? null;
    const disabled = interactionLocked;
    console.log('[LIVE BATTLE ANSWER] option clicked', {
      liveClassId: classId,
      userId: uid,
      role: 'student',
      optionIndex,
      status: session?.status,
      currentQuestionIndex: session?.currentQuestionIndex,
    });
    console.log('[BATTLE ANSWER DEBUG] option clicked', {
      optionIndex,
      option,
      userId: uid,
      participantId,
      disabled,
      hasAnswered,
    });
    if (!question || !isChoiceQuestion(question) || hasAnswered || timeUp || session.status !== 'PLAYING') {
      console.warn('[LIVE BATTLE ANSWER] blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : hasAnswered
              ? 'already-answered'
              : timeUp
                ? 'time-up'
                : 'status-not-playing',
        liveClassId: classId,
        userId: uid,
        role: 'student',
        status: session?.status,
        hasAnswered,
      });
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !question
          ? 'missing-question'
          : !isChoiceQuestion(question)
            ? 'question-is-not-choice'
            : hasAnswered
              ? 'already-answered'
              : 'session-not-playing',
        sessionId: session.id,
        userId: uid,
        participantId,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered,
      });
      return;
    }
    if (!requiresChoiceConfirmation) {
      setSelectedOptions([optionIndex]);
      void submitChoiceAnswer([optionIndex]);
      return;
    }
    setSelectedOptions((current) => (
      current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b)
    ));
  }

  async function confirmChoiceAnswer() {
    if (!requiresChoiceConfirmation || selectedOptions.length === 0) return;
    await submitChoiceAnswer(selectedOptions);
  }

  async function submitOpenAnswer() {
    console.log('[BATTLE ANSWER DEBUG] submit answer entered', {
      sessionId: session.id,
      userId: uid,
      participantId,
      optionIndex: null,
    });
    console.log('[BATTLE STUDENT SUBMIT] uid:', uid);
    console.log('[BATTLE STUDENT SUBMIT] questionIndex:', session.currentQuestionIndex);
    console.log('[BATTLE STUDENT SUBMIT] option selected:', typedAnswer.trim());
    console.log('[Battle:Player] submitOpenAnswer called', {
      uid,
      canAnswerCurrentQuestion,
      hasAnswered,
      sessionStatus: session.status,
      typedAnswer: typedAnswer.trim(),
    });
    if (!question || !isOpenQuestion || hasAnswered || timeUp || session.status !== 'PLAYING' || !typedAnswer.trim()) {
      console.warn('[LIVE BATTLE ANSWER] blocked', {
        reason: !question
          ? 'missing-question'
          : !isOpenQuestion
            ? 'question-is-choice'
            : hasAnswered
              ? 'already-answered'
              : timeUp
                ? 'time-up'
                : session.status !== 'PLAYING'
                  ? 'status-not-playing'
                  : 'empty-response',
        liveClassId: classId,
        userId: uid,
        role: 'student',
        status: session?.status,
        hasAnswered,
      });
      console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
        reason: !question
          ? 'missing-question'
          : !isOpenQuestion
            ? 'question-is-choice'
            : hasAnswered
              ? 'already-answered'
              : session.status !== 'PLAYING'
                ? 'session-not-playing'
                : 'empty-response',
        sessionId: session.id,
        userId: uid,
        participantId,
        status: session?.status,
        roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
        hasAnswered,
      });
      console.log('[Battle:Player] submitOpenAnswer BLOCKED by guard', { canAnswerCurrentQuestion, hasAnswered, sessionStatus: session.status });
      return;
    }
    
    const answeredAt = Date.now();
    const payload = { responseText: typedAnswer.trim() };
    
    const isCorrect = evaluateBattleAnswer(question, payload);
    const { elapsedMs, roundPoints } = calculateBattleRoundScore({
      answeredAt,
      questionStartedAt: session.questionStartedAt,
      timePerQuestion: currentQuestionDuration,
      isCorrect,
    });
    const nextFrozenTimeLeft = Math.max(0, currentQuestionDuration - elapsedMs / 1000);
    console.info('[BATTLE ANSWER]', {
      uid,
      answeredAt,
      elapsedMs,
      frozenTimeLeft: nextFrozenTimeLeft,
      roundPoints,
      roomId: classId,
      battleId: session.id,
    });
    setLocalMyAnswer({
      uid,
      name,
      responseText: payload.responseText,
      isCorrect,
      answeredAt,
      elapsedMs,
      roundPoints,
      frozenTimeLeft: nextFrozenTimeLeft,
    });
    setFrozenTimeLeft(nextFrozenTimeLeft);
    setTimeLeft(nextFrozenTimeLeft);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSubmitted(true);
    
    try {
      console.log('[LIVE BATTLE ANSWER] saving', {
        liveClassId: classId,
        userId: uid,
        role: 'student',
        optionIndex: null,
        currentQuestionIndex: session.currentQuestionIndex,
      });
      console.log('[BATTLE ANSWER DEBUG] saving answer payload', payload);
      console.log('[BATTLE STUDENT SUBMIT] submit started');
      const result = await submitBattleAnswer(classId, session, uid, name, payload, {
        forceCurrentRoundParticipation: true,
      });
      if (result.status !== 'saved') {
        console.warn('[LIVE BATTLE ANSWER] blocked', {
          reason: result.reason,
          liveClassId: classId,
          userId: uid,
          role: 'student',
          status: session?.status,
          hasAnswered,
        });
        console.warn('[BATTLE ANSWER DEBUG] submit answer blocked', {
          reason: result.reason,
          sessionId: session.id,
          userId: uid,
          participantId,
          status: session?.status,
          roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
          hasAnswered,
        });
        console.warn('[BATTLE STUDENT SUBMIT] submit failed:', result.reason);
        rollbackStudentSubmitLock();
        return;
      }
      console.log('[BATTLE ANSWER DEBUG] answer saved');
      console.log('[BATTLE STUDENT SCORE] uid:', uid);
      console.log('[BATTLE STUDENT SCORE] delta awarded:', result.answer.roundPoints ?? 0);
      console.log('[BATTLE STUDENT SCORE] total after merge:', result.updatedParticipant.score);
      console.log('[BATTLE STUDENT SCORE] scores keys after save:', Object.keys(session.scores ?? {}).concat(result.updatedParticipant.uid));
      console.log('[BATTLE STUDENT SUBMIT] submit resolved');
    } catch (error) {
      console.error('[LIVE BATTLE ANSWER] failed', error);
      console.error('[BATTLE ANSWER DEBUG] answer failed', error);
      console.error('[BATTLE STUDENT SUBMIT] submit failed:', error);
      rollbackStudentSubmitLock();
    }
  }

  const answerLabel = question ? getBattleCorrectAnswerLabel(question) : '';
  const questionText = repairBattleTextEncoding(question?.text) ?? '';
  const questionHint = repairBattleTextEncoding(question?.hint) ?? '';
  const questionImageUrl = question?.imageUrl?.trim() ?? '';
  const questionOptions = (question?.options ?? []).map((option) => repairBattleTextEncoding(option) ?? option);
  const correctCount = useMemo(
    () => Object.values(session.currentAnswers).filter(answer => answer.isCorrect).length,
    [session.currentAnswers]
  );
  const wrongCount = useMemo(
    () => Object.values(session.currentAnswers).filter(answer => !answer.isCorrect).length,
    [session.currentAnswers]
  );

  if (showResults) {
    console.log('[BATTLE PLAYER] render branch: finished');
    const validParticipantIds = (session.roundParticipantIds ?? []).length > 0
      ? (session.roundParticipantIds ?? [])
      : Object.keys(session.participants ?? {});
    console.log('[BATTLE FINISH] roundParticipantIds:', session.roundParticipantIds);
    console.log('[BATTLE FINISH] participants keys:', Object.keys(session.participants ?? {}));
    console.log('[BATTLE FINISH] scores snapshot:', Object.keys(session.scores ?? {}));
    console.log('[BATTLE FINISH] resolved validParticipantIds:', validParticipantIds);
    return (
      <BattleResultsScreen
        scores={visiblePlayerScores}
        myUid={uid}
        onClose={() => setShowResults(false)}
        isTeacher={false}
        validParticipantIds={validParticipantIds}
        uiLanguage={uiLanguage}
      />
    );
  }

  if (session.status === 'WAITING') {
    console.info('[BATTLE STUDENT WAITING] player waiting on teacher start', {
      component: 'BattlePlayerView',
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      currentQuestionId,
    });
    console.log('[BATTLE PLAYER] render branch: waiting');
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="text-center space-y-4 px-8">
          <div className="text-5xl animate-bounce">⏳</div>
          <h2 className="text-2xl font-bold text-white">{copy.waitingTitle}</h2>
          <p className="text-slate-300">{copy.waitingBody}</p>
          <div className="mt-4 bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">{copy.yourScore}</p>
            <p className="text-3xl font-black text-orange-400">{myScore.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'REVEALED') {
    console.log('[BATTLE PLAYER] render branch: showing-answer');
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 text-center space-y-4">
          <div className="text-5xl">
            {myAnswer?.isCorrect === true ? '✅' : myAnswer?.isCorrect === false ? '❌' : '⏰'}
          </div>
          <h2 className="text-xl font-bold text-white">
            {myAnswer?.isCorrect === true ? copy.correct : myAnswer?.isCorrect === false ? copy.wrong : copy.timeUp}
          </h2>
          {question && (
            <p className="text-sm text-slate-300">
              {copy.answer}: <span className="text-green-400 font-bold">{answerLabel || '-'}</span>
            </p>
          )}
          {questionHint ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.feedbackTitle}</p>
              <p className="mt-1 text-sm leading-6 text-slate-200">{questionHint}</p>
            </div>
          ) : null}
          <div className="bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">{copy.totalScore}</p>
            <p className="text-3xl font-black text-orange-400">{myTotalScore.toLocaleString()}</p>
            {currentRoundLocalAnswer && currentRoundLocalAnswer.roundPoints > 0 && (
              <p className="text-xs text-green-400">{copy.roundPoints(currentRoundLocalAnswer.roundPoints)}</p>
            )}
            {myStreak >= 3 && <p className="text-xs text-orange-300">{copy.streak(myStreak)}</p>}
          </div>
          <div className="flex justify-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">
              {correctCount} {copy.correctCount}
            </span>
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">
              {wrongCount} {copy.wrongCount}
            </span>
          </div>
          <p className="text-xs text-slate-500">{copy.waitingNext}</p>
        </div>
      </div>
    );
  }

  if (session.status === 'PLAYING' && !question) {
    console.warn('[BATTLE PLAYER] PLAYING without question', {
      battleId: session.id,
      roomId: classId,
      status: session.status,
      updatedAt: session.updatedAt,
      currentQuestionIndex: session.currentQuestionIndex,
      hasCurrentQuestion,
      totalQuestions: session.questions.length,
    });
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h2 className="text-xl font-bold text-white">{copy.preparingTitle}</h2>
          <p className="text-sm text-slate-300">
            {copy.preparingBody}
          </p>
          <p className="text-xs text-slate-500">
            {copy.preparingHint}
          </p>
        </div>
      </div>
    );
  }

  if (session.status === 'PLAYING' && !canAnswerCurrentQuestion && question && !isRegisteredParticipant) {
    console.info('[BATTLE PLAYER ACTIVATE] player locked out of current round', {
      component: 'BattlePlayerView',
      classId,
      sessionId: session.id,
      uid,
      status: session.status,
      currentQuestionId,
      roundParticipantIds: session.roundParticipantIds ?? [],
    });
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-white">{copy.lockedTitle}</h2>
          <p className="text-sm text-slate-300">
            {copy.lockedBody}
          </p>
          <div className="bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
            <p className="text-xs text-slate-400">{copy.participantsInBattle}</p>
            <p className="text-3xl font-black text-orange-400">{registeredParticipantIds.length}</p>
          </div>
          <div className="flex justify-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 font-semibold">
              Q {questionIdx + 1} / {totalQ}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-700/40 text-slate-300 font-semibold">
              {roundAnswerCount} {copy.answered}
            </span>
          </div>
          <p className="text-xs text-slate-500">{copy.lockedHint}</p>
        </div>
      </div>
    );
  }

  console.log('[BATTLE PLAYER] render branch: active');
  console.info('[BATTLE PLAYER ACTIVATE] player entered active battle round', {
    component: 'BattlePlayerView',
    classId,
    sessionId: session.id,
    uid,
    status: session.status,
    currentQuestionId,
    roundParticipantIds: session.roundParticipantIds ?? [],
  });
  return (
    <div className="fixed inset-0 z-[9000] flex flex-col bg-slate-950 select-none">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="text-xs text-slate-400">
          Q {questionIdx + 1} <span className="text-slate-600">/ {totalQ}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-full px-3 py-1">
            <span className="text-orange-400 font-bold text-sm">{myTotalScore.toLocaleString()}</span>
            {myStreak >= 3 && <span className="ml-1 text-xs">🔥 {myStreak}</span>}
          </div>
          <button
            onClick={() => setMusicMuted((value) => !value)}
            title={musicMuted ? copy.unmuteMusic : copy.muteMusic}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs transition"
          >
            {musicMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-slate-800">
        <div
          className="h-full transition-all bg-gradient-to-r from-green-500 to-orange-500"
          style={{
            width: `${timeRatio * 100}%`,
            backgroundColor: timeRatio > 0.5 ? undefined : timeRatio > 0.25 ? '#f97316' : '#ef4444',
          }}
        />
      </div>

      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2">
        <BattleLabIndicators />
      </div>

      <div key={session.currentQuestionId ?? currentQuestionId ?? questionIdx} className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="w-full max-w-md bg-slate-800/80 rounded-2xl p-6 text-center shadow-inner space-y-4">
          <div className="text-3xl font-bold text-white leading-snug">{questionText}</div>
          {questionImageUrl && (
            <img
              src={questionImageUrl}
              alt="Question reference"
              className="mx-auto max-h-48 w-auto rounded-xl border border-slate-700 object-contain bg-slate-900"
            />
          )}
          {question.kind === 'audio-choice' && (
            <p className="text-xs text-amber-300">
              {copy.audioChoiceHint}
            </p>
          )}
          {question.kind === 'audio-open' && (
            <p className="text-xs text-amber-300">
              {copy.audioOpenHint}
            </p>
          )}
          {question.kind === 'speaking' && (
            <p className="text-xs text-amber-300">
              {copy.speakingHint}
            </p>
          )}
        </div>

        {isChoiceQuestion(question) ? (
          <>
            <div className="w-full max-w-sm grid grid-cols-2 gap-3">
              {questionOptions.map((opt, index) => {
                const isSelected = selectedOptions.includes(index);
                const disabled = interactionLocked;
                const reason =
                  hasAnswered
                    ? 'already-answered'
                    : timeUp
                      ? 'time-up'
                      : session.status !== 'PLAYING'
                        ? 'status-not-playing'
                        : 'enabled';
                console.log('[BATTLE ROUND STATE DEBUG] option disabled check', {
                  optionIndex: index,
                  disabled,
                  reason,
                  roundStatus: session?.roundStatus ?? null,
                  isRevealed: session?.isRevealed ?? false,
                  showAnswer: session?.showAnswer ?? false,
                  timeUp,
                  hasAnswered,
                });
                console.log('[BATTLE ANSWER DEBUG] option state', {
                  optionIndex: index,
                  option: opt,
                  disabled,
                  userId: uid,
                  participantId,
                  hasAnswered,
                  roundStatus: (session as BattleSession & { roundStatus?: string }).roundStatus ?? null,
                });
                return (
                  <button
                    key={index}
                    onClick={() => toggleChoiceSelection(index)}
                    disabled={disabled}
                    className={`py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : disabled
                        ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                        : 'border-slate-600 text-white hover:border-orange-400 hover:bg-orange-400/10'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {requiresChoiceConfirmation && (
              <button
                onClick={confirmChoiceAnswer}
                disabled={interactionLocked || selectedOptions.length === 0}
                className="w-full max-w-sm rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {copy.confirmAnswer}
              </button>
            )}
          </>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <textarea
              value={typedAnswer}
              onChange={(event) => setTypedAnswer(event.target.value)}
              disabled={interactionLocked}
              placeholder={(question.kind as BattleQuestionKind) === 'speaking' ? copy.yourSpeechAnswer : copy.yourTypedAnswer}
              className="w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-400 disabled:opacity-60"
            />
            <div className="flex gap-3">
              {showMicButton && (
                <button
                  onClick={startSpeechRecognition}
                  disabled={interactionLocked || isListening}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isListening ? copy.listening : copy.answerByVoice}
                </button>
              )}
              <button
                onClick={submitOpenAnswer}
                disabled={interactionLocked || !typedAnswer.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {copy.confirmAnswer}
              </button>
            </div>
          </div>
        )}

        {hasAnswered && session.status === 'PLAYING' && (
          <p className="text-sm text-slate-400 animate-pulse">{copy.confirmAnswer}!</p>
        )}
        {!hasAnswered && !canAnswerCurrentQuestion && !isRegisteredParticipant && session.status === 'PLAYING' && (
          <p className="text-sm text-slate-400">{copy.waitingNext}</p>
        )}
        {timeUp && !hasAnswered && (
          <p className="text-sm text-red-400">{copy.timeUp}</p>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex justify-center gap-4 text-xs text-slate-500">
          <span>{Math.ceil(displayTime)}s</span>
          <span>|</span>
          <span>{roundAnswerCount} / {((session.roundParticipantIds ?? []).length || registeredParticipantIds.length)} {copy.answered}</span>
        </div>
      </div>
    </div>
  );
};

