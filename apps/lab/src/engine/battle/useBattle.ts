import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnyQuestion } from '../scoring';
import { scoreAnswer, buildRanking } from '../scoring';
import type { AnswerResult, Player, PlayerScore } from '../../types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type BattlePhase = 'question' | 'feedback' | 'done';

export interface QuestionFeedback {
  humanResult: AnswerResult;
  botResults: AnswerResult[];
}

export interface BattleState {
  phase: 'question' | 'feedback';
  question: AnyQuestion;
  index: number;
  total: number;
  timeLeft: number;
  maxTime: number;
  ranking: PlayerScore[];
  feedback: QuestionFeedback | null;
}

export interface UseBattleReturn {
  state: BattleState | null;
  isDone: boolean;
  ranking: PlayerScore[];
  totalResults: AnswerResult[];
  answer: (text: string) => void;
  next: () => void;
  restart: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TIME_PER_QUESTION = 15; // seconds

// ─── Bot simulation ───────────────────────────────────────────────────────────

function makeBotResult(q: AnyQuestion, bot: Player): AnswerResult {
  const correct = Math.random() < 0.62;
  const allOpts =
    'options' in q && Array.isArray(q.options) && q.options.length > 0
      ? q.options
      : null;

  let chosen: string;
  if (correct) {
    chosen = q.correctAnswer;
  } else if (allOpts) {
    chosen = allOpts.find((o) => o !== q.correctAnswer) ?? allOpts[0];
  } else {
    // fill-in: bot either answers correctly or gives a generic wrong answer
    chosen = 'wrong';
  }

  const responseMs = 800 + Math.random() * 10_000;
  return scoreAnswer(q, chosen, bot.id, responseMs);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useBattle — drives a full timed battle session.
 *
 * players[0] is the human; the rest are bots that answer automatically
 * when the human submits (or when time runs out).
 *
 * Architecture note: keep this hook dependency-free from UI so it can be
 * extracted to the main Learnendo app without changes.
 */
export function useBattle(
  questions: AnyQuestion[],
  players: Player[],
): UseBattleReturn {
  const humanId = players[0].id;

  // Refs for always-fresh values inside effects/callbacks
  const botsRef = useRef<Player[]>(players.slice(1));
  botsRef.current = players.slice(1);

  const questionRef = useRef<AnyQuestion | null>(questions[0] ?? null);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<BattlePhase>('question');
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [allResults, setAllResults] = useState<AnswerResult[]>([]);
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);

  const isDone = phase === 'done';
  const currentQuestion = questions[index] ?? null;

  // Keep ref in sync every render
  questionRef.current = currentQuestion;

  // ── Reset start time whenever a new question becomes active ──────────────
  const startTimeRef = useRef(Date.now());
  useEffect(() => {
    if (phase === 'question') startTimeRef.current = Date.now();
  }, [index, phase]);

  // ── Countdown: tick -1 every second while in 'question' phase ────────────
  useEffect(() => {
    if (phase !== 'question' || isDone || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, isDone]);

  // ── Auto-submit when countdown hits zero ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || timeLeft > 0 || isDone) return;
    const q = questionRef.current;
    if (!q) return;

    const elapsed = TIME_PER_QUESTION * 1000;
    const humanResult = scoreAnswer(q, '__timeout__', humanId, elapsed);
    const botResults = botsRef.current.map((b) => makeBotResult(q, b));

    setFeedback({ humanResult, botResults });
    setAllResults((prev) => [...prev, humanResult, ...botResults]);
    setPhase('feedback');
  }, [phase, timeLeft, isDone, humanId]);

  // ── Human answer ─────────────────────────────────────────────────────────
  const answer = useCallback(
    (text: string) => {
      if (phase !== 'question') return;
      const q = questionRef.current;
      if (!q) return;

      const elapsed = Date.now() - startTimeRef.current;
      const humanResult = scoreAnswer(q, text, humanId, elapsed);
      const botResults = botsRef.current.map((b) => makeBotResult(q, b));

      setFeedback({ humanResult, botResults });
      setAllResults((prev) => [...prev, humanResult, ...botResults]);
      setPhase('feedback');
    },
    [phase, humanId],
  );

  // ── Advance to next question ──────────────────────────────────────────────
  const next = useCallback(() => {
    const nextIdx = index + 1;
    if (nextIdx >= questions.length) {
      setPhase('done');
    } else {
      setIndex(nextIdx);
      setTimeLeft(TIME_PER_QUESTION);
      setFeedback(null);
      setPhase('question');
    }
  }, [index, questions.length]);

  // ── Restart ───────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setIndex(0);
    setPhase('question');
    setTimeLeft(TIME_PER_QUESTION);
    setAllResults([]);
    setFeedback(null);
    startTimeRef.current = Date.now();
  }, []);

  const ranking = buildRanking(players, allResults);

  const state: BattleState | null =
    isDone || !currentQuestion
      ? null
      : {
          phase: phase as 'question' | 'feedback',
          question: currentQuestion,
          index,
          total: questions.length,
          timeLeft,
          maxTime: TIME_PER_QUESTION,
          ranking,
          feedback,
        };

  return { state, isDone, ranking, totalResults: allResults, answer, next, restart };
}
