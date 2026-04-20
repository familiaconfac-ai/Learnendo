import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleConfig, BattleParticipant, BattleQuestion } from './battleTypes';
import {
  buildBattleParticipantScore,
  calculateBattleRoundScore,
  evaluateBattleAnswer,
  getBattleBotAvatarId,
  getBattleBotName,
  getBattleCorrectIndexes,
  isChoiceQuestion,
} from './battleUtils';

export interface PracticeBattlePlayer {
  uid: string;
  name: string;
  avatarId?: string;
  isBot?: boolean;
}

export interface PracticeBattleAnswerPayload {
  optionIndex?: number;
  optionIndexes?: number[];
  responseText?: string;
}

export interface PracticeBattleRoundResult {
  uid: string;
  name: string;
  avatarId?: string;
  isBot?: boolean;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsEarned: number;
  frozenTimeLeft: number;
  optionIndexes?: number[];
  responseText?: string;
}

export interface PracticeBattleFeedback {
  question: BattleQuestion;
  humanResult: PracticeBattleRoundResult;
  botResults: PracticeBattleRoundResult[];
  isTimeout: boolean;
}

type PracticeBattlePhase = 'lobby' | 'question' | 'feedback' | 'done';

const BOT_ACCURACY_BY_DIFFICULTY: Record<BattleConfig['difficulty'], number> = {
  easy: 0.82,
  normal: 0.67,
  hard: 0.52,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildParticipantMap(players: PracticeBattlePlayer[]): Record<string, BattleParticipant> {
  return players.reduce<Record<string, BattleParticipant>>((acc, player) => {
    acc[player.uid] = {
      uid: player.uid,
      name: player.name,
      score: 0,
      streak: 0,
      lastAnswerCorrect: null,
      avatarId: player.avatarId,
      isBot: player.isBot,
    };
    return acc;
  }, {});
}

function buildBotPayload(
  question: BattleQuestion,
  config: BattleConfig,
): { payload: PracticeBattleAnswerPayload; elapsedMs: number; isCorrect: boolean } {
  const totalMs = config.timePerQuestion * 1000;
  const shouldAnswerCorrectly = Math.random() < BOT_ACCURACY_BY_DIFFICULTY[config.difficulty];
  const minDelay = Math.min(totalMs - 250, 1200);
  const maxDelay = Math.min(totalMs - 150, Math.max(minDelay, totalMs * 0.82));
  const elapsedMs = clamp(
    Math.round(minDelay + Math.random() * Math.max(0, maxDelay - minDelay)),
    350,
    Math.max(350, totalMs - 120),
  );

  if (isChoiceQuestion(question)) {
    const correctIndexes = getBattleCorrectIndexes(question);
    const allIndexes = Array.from({ length: question.options?.length ?? 0 }, (_, index) => index);
    const wrongIndexes = allIndexes.filter((index) => !correctIndexes.includes(index));
    const optionIndexes = shouldAnswerCorrectly
      ? correctIndexes
      : wrongIndexes.slice(0, Math.max(1, correctIndexes.length || 1));
    const payload = {
      optionIndex: optionIndexes[0],
      optionIndexes,
    };
    return {
      payload,
      elapsedMs,
      isCorrect: evaluateBattleAnswer(question, payload),
    };
  }

  const correctText = question.correctText?.trim() || question.acceptedAnswers?.[0]?.trim() || '';
  const payload = {
    responseText: shouldAnswerCorrectly ? correctText : `${correctText || 'bot'}...`,
  };

  return {
    payload,
    elapsedMs,
    isCorrect: evaluateBattleAnswer(question, payload),
  };
}

function buildRoundResult(params: {
  question: BattleQuestion;
  config: BattleConfig;
  player: PracticeBattlePlayer;
  answeredAt: number;
  questionStartedAt: number;
  payload: PracticeBattleAnswerPayload;
  forceIncorrect?: boolean;
}): PracticeBattleRoundResult {
  const { question, config, player, answeredAt, questionStartedAt, payload, forceIncorrect = false } = params;
  const { elapsedMs, roundPoints } = calculateBattleRoundScore({
    answeredAt,
    questionStartedAt,
    timePerQuestion: config.timePerQuestion,
    isCorrect: forceIncorrect ? false : evaluateBattleAnswer(question, payload),
  });
  const optionIndexes = Array.from(new Set([
    ...(payload.optionIndexes ?? []),
    ...(payload.optionIndex != null ? [payload.optionIndex] : []),
  ])).sort((a, b) => a - b);

  return {
    uid: player.uid,
    name: player.name,
    avatarId: player.avatarId,
    isBot: player.isBot,
    isCorrect: forceIncorrect ? false : evaluateBattleAnswer(question, payload),
    responseTimeMs: elapsedMs,
    pointsEarned: roundPoints,
    frozenTimeLeft: Math.max(0, config.timePerQuestion - elapsedMs / 1000),
    ...(optionIndexes.length > 0 ? { optionIndexes } : {}),
    ...(payload.responseText?.trim() ? { responseText: payload.responseText.trim() } : {}),
  };
}

export function usePracticeBattleEngine(params: {
  questions: BattleQuestion[];
  config: BattleConfig;
  human: PracticeBattlePlayer;
  opponents: PracticeBattlePlayer[];
}) {
  const { questions, config, human, opponents } = params;
  const allPlayers = useMemo(() => [human, ...opponents], [human, opponents]);
  const [phase, setPhase] = useState<PracticeBattlePhase>('lobby');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(config.timePerQuestion);
  const [scores, setScores] = useState<Record<string, BattleParticipant>>(() => buildParticipantMap(allPlayers));
  const [feedback, setFeedback] = useState<PracticeBattleFeedback | null>(null);
  const startedAtRef = useRef(0);
  const lockRef = useRef(false);

  const question = questions[questionIndex] ?? null;

  useEffect(() => {
    setScores(buildParticipantMap(allPlayers));
  }, [allPlayers]);

  useEffect(() => {
    if (phase !== 'question') return;

    lockRef.current = false;
    startedAtRef.current = Date.now();
    setTimeLeft(config.timePerQuestion);

    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, config.timePerQuestion - elapsedMs / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0 && !lockRef.current) {
        lockRef.current = true;
        const currentQuestion = questions[questionIndex];
        if (!currentQuestion) {
          setPhase('done');
          window.clearInterval(timer);
          return;
        }

        const timeoutAnsweredAt = startedAtRef.current + config.timePerQuestion * 1000;
        const humanResult = buildRoundResult({
          question: currentQuestion,
          config,
          player: human,
          answeredAt: timeoutAnsweredAt,
          questionStartedAt: startedAtRef.current,
          payload: { responseText: '' },
          forceIncorrect: true,
        });
        const botResults = opponents.map((opponent) => {
          const simulation = buildBotPayload(currentQuestion, config);
          return buildRoundResult({
            question: currentQuestion,
            config,
            player: opponent,
            answeredAt: startedAtRef.current + simulation.elapsedMs,
            questionStartedAt: startedAtRef.current,
            payload: simulation.payload,
          });
        });

        setScores((previous) => {
          const next = { ...previous };
          for (const result of [humanResult, ...botResults]) {
            next[result.uid] = {
              ...buildBattleParticipantScore(
                result.uid,
                result.name,
                next[result.uid],
                result.isCorrect,
                result.pointsEarned,
              ),
              avatarId: result.avatarId ?? next[result.uid]?.avatarId,
              isBot: result.isBot ?? next[result.uid]?.isBot,
            };
          }
          return next;
        });
        setFeedback({
          question: currentQuestion,
          humanResult,
          botResults,
          isTimeout: true,
        });
        setPhase('feedback');
        window.clearInterval(timer);
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [config, human, opponents, phase, questionIndex, questions]);

  const ranking = useMemo(
    () => Object.values(scores).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    }),
    [scores],
  );

  const start = useCallback(() => {
    setQuestionIndex(0);
    setFeedback(null);
    setScores(buildParticipantMap(allPlayers));
    setPhase('question');
  }, [allPlayers]);

  const answer = useCallback((payload: PracticeBattleAnswerPayload) => {
    if (phase !== 'question' || !question || lockRef.current) return;
    lockRef.current = true;

    const answeredAt = Date.now();
    const humanResult = buildRoundResult({
      question,
      config,
      player: human,
      answeredAt,
      questionStartedAt: startedAtRef.current,
      payload,
    });
    const botResults = opponents.map((opponent) => {
      const simulation = buildBotPayload(question, config);
      return buildRoundResult({
        question,
        config,
        player: opponent,
        answeredAt: startedAtRef.current + simulation.elapsedMs,
        questionStartedAt: startedAtRef.current,
        payload: simulation.payload,
      });
    });

    setScores((previous) => {
      const next = { ...previous };
      for (const result of [humanResult, ...botResults]) {
        next[result.uid] = {
          ...buildBattleParticipantScore(
            result.uid,
            result.name,
            next[result.uid],
            result.isCorrect,
            result.pointsEarned,
          ),
          avatarId: result.avatarId ?? next[result.uid]?.avatarId,
          isBot: result.isBot ?? next[result.uid]?.isBot,
        };
      }
      return next;
    });
    setFeedback({
      question,
      humanResult,
      botResults,
      isTimeout: false,
    });
    setPhase('feedback');
  }, [config, human, opponents, phase, question]);

  const next = useCallback(() => {
    if (questionIndex + 1 >= questions.length) {
      setPhase('done');
      return;
    }
    setQuestionIndex((value) => value + 1);
    setFeedback(null);
    setPhase('question');
  }, [questionIndex, questions.length]);

  const restart = useCallback(() => {
    setQuestionIndex(0);
    setTimeLeft(config.timePerQuestion);
    setFeedback(null);
    setScores(buildParticipantMap(allPlayers));
    setPhase('lobby');
  }, [allPlayers, config.timePerQuestion]);

  return {
    phase,
    question,
    questionIndex,
    totalQuestions: questions.length,
    timeLeft,
    scores,
    ranking,
    feedback,
    start,
    answer,
    next,
    restart,
  };
}
