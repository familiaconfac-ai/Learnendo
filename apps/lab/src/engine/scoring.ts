import type { ExerciseItem, BibleItem, AnswerResult, PlayerScore, Player } from '../types';

export type AnyQuestion = ExerciseItem | BibleItem;

function getCorrectAnswer(q: AnyQuestion): string {
  return q.correctAnswer;
}

function getQuestionId(q: AnyQuestion): string {
  return q.id;
}

/** Score per correct answer (deduct half for wrong) */
export const POINTS_CORRECT = 100;
export const POINTS_WRONG = -50;

export function scoreAnswer(
  question: AnyQuestion,
  answer: string,
  playerId: string,
  responseTimeMs: number,
): AnswerResult {
  const normalised = answer.trim().toLowerCase();
  const primary = getCorrectAnswer(question).trim().toLowerCase();

  // Also accept alternatives stored on ExerciseItem
  const alts: string[] =
    'alternatives' in question && Array.isArray(question.alternatives)
      ? question.alternatives.map((a) => a.trim().toLowerCase())
      : [];

  const correct = normalised === primary || alts.includes(normalised);

  // Speed bonus: up to 50 extra points for answering within 5 seconds
  const speedBonus = correct ? Math.max(0, Math.round(50 * (1 - responseTimeMs / 5000))) : 0;
  const pointsEarned = correct ? POINTS_CORRECT + speedBonus : POINTS_WRONG;

  return {
    questionId: getQuestionId(question),
    playerId,
    answer,
    correct,
    responseTimeMs,
    pointsEarned,
  };
}

export function buildRanking(players: Player[], results: AnswerResult[]): PlayerScore[] {
  const map = new Map<string, PlayerScore>();

  for (const p of players) {
    map.set(p.id, {
      player: p,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      totalTimeMs: 0,
    });
  }

  for (const r of results) {
    const entry = map.get(r.playerId);
    if (!entry) continue;
    entry.score += r.pointsEarned;
    entry.totalTimeMs += r.responseTimeMs;
    if (r.correct) entry.correctCount++;
    else entry.wrongCount++;
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
