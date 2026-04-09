import { useState, useCallback } from 'react';
import type { AnyQuestion } from '../scoring';
import type { ContestTeam, ContestRoundResult, TeamScore } from '../../types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ContestPhase = 'question' | 'reveal' | 'done';

export interface ContestState {
  phase: ContestPhase;
  question: AnyQuestion;
  index: number;
  total: number;
  /** teamIds that the host has marked correct for this round */
  roundCorrectTeams: string[];
  teamScores: TeamScore[];
}

export interface UseContestReturn {
  state: ContestState | null;
  isDone: boolean;
  finalScores: TeamScore[];
  allResults: ContestRoundResult[];
  /** Host presses "Reveal Answer" — moves from question → reveal phase */
  reveal: () => void;
  /** Host taps a team chip to toggle correct/incorrect for this round */
  toggleTeam: (teamId: string) => void;
  /** Host presses "Confirm & Next" — awards points, advances question */
  confirmRound: () => void;
  restart: () => void;
}

const POINTS_CORRECT = 100;

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function calcScores(
  teams: ContestTeam[],
  results: ContestRoundResult[],
): TeamScore[] {
  return teams
    .map((team) => {
      const mine = results.filter((r) => r.teamId === team.id);
      return {
        team,
        score: mine.reduce((s, r) => s + r.pointsEarned, 0),
        correctCount: mine.filter((r) => r.correct).length,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useContest — host-controlled contest engine.
 *
 * The host decides which teams answered correctly per question.
 * No automatic timers: the host advances the flow manually, making this
 * suitable for classroom / EBD concurso use.
 *
 * Designed to be decoupled from UI so it can be lifted to the main
 * Learnendo app or an EBD module without changes.
 */
export function useContest(
  questions: AnyQuestion[],
  teams: ContestTeam[],
): UseContestReturn {
  const [index, setIndex]                   = useState(0);
  const [phase, setPhase]                   = useState<ContestPhase>('question');
  const [allResults, setAllResults]         = useState<ContestRoundResult[]>([]);
  const [roundCorrectTeams, setRoundCorrect] = useState<string[]>([]);

  const isDone = phase === 'done';
  const currentQuestion = questions[index] ?? null;
  const teamScores = calcScores(teams, allResults);

  const reveal = useCallback(() => {
    if (phase !== 'question') return;
    setRoundCorrect([]);
    setPhase('reveal');
  }, [phase]);

  const toggleTeam = useCallback((teamId: string) => {
    setRoundCorrect((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  }, []);

  const confirmRound = useCallback(() => {
    if (phase !== 'reveal' || !currentQuestion) return;

    const newResults: ContestRoundResult[] = teams.map((team) => {
      const correct = roundCorrectTeams.includes(team.id);
      return {
        questionId: currentQuestion.id,
        teamId: team.id,
        correct,
        pointsEarned: correct ? POINTS_CORRECT : 0,
      };
    });

    setAllResults((prev) => [...prev, ...newResults]);
    setRoundCorrect([]);

    const nextIdx = index + 1;
    if (nextIdx >= questions.length) {
      setPhase('done');
    } else {
      setIndex(nextIdx);
      setPhase('question');
    }
  }, [phase, currentQuestion, teams, roundCorrectTeams, index, questions.length]);

  const restart = useCallback(() => {
    setIndex(0);
    setPhase('question');
    setAllResults([]);
    setRoundCorrect([]);
  }, []);

  const state: ContestState | null =
    isDone || !currentQuestion
      ? null
      : {
          phase,
          question: currentQuestion,
          index,
          total: questions.length,
          roundCorrectTeams,
          teamScores,
        };

  return {
    state,
    isDone,
    finalScores: calcScores(teams, allResults),
    allResults,
    reveal,
    toggleTeam,
    confirmRound,
    restart,
  };
}
