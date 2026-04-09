import { useState, useCallback, useRef } from 'react';
import type { AnyQuestion } from './scoring';
import { scoreAnswer } from './scoring';
import type { AnswerResult } from '../types';

export interface QuestionState {
  question: AnyQuestion;
  index: number;
  total: number;
  answered: boolean;
  lastResult: AnswerResult | null;
}

export interface UseQuizReturn {
  state: QuestionState | null;
  done: boolean;
  results: AnswerResult[];
  answer: (text: string) => void;
  next: () => void;
}

export function useQuiz(questions: AnyQuestion[], playerId: string): UseQuizReturn {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [answered, setAnswered] = useState(false);
  const startRef = useRef<number>(Date.now());

  const done = index >= questions.length;

  const state: QuestionState | null = done
    ? null
    : {
        question: questions[index],
        index,
        total: questions.length,
        answered,
        lastResult,
      };

  const answer = useCallback(
    (text: string) => {
      if (answered || done) return;
      const elapsed = Date.now() - startRef.current;
      const result = scoreAnswer(questions[index], text, playerId, elapsed);
      setLastResult(result);
      setResults((r) => [...r, result]);
      setAnswered(true);
    },
    [answered, done, index, playerId, questions],
  );

  const next = useCallback(() => {
    setAnswered(false);
    setLastResult(null);
    startRef.current = Date.now();
    setIndex((i) => i + 1);
  }, []);

  return { state, done, results, answer, next };
}
