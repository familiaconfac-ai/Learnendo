import type { Exercise } from '../types.ts';
import type { MasteryItemState } from './masteryQueueEngine.ts';
import { classifySpeakingExercise } from '../utils/speakingExercise.ts';

export type FinalTestSkill = 'listening' | 'writing' | 'shadowing' | 'speaking';

export interface FinalTestSkillMetric {
  total: number;
  firstTryCorrect: number;
  correctedAfterError: number;
  incorrectAttempts: number;
  firstTryAccuracy: number;
}

export function finalTestSkillForExercise(exercise: Exercise): FinalTestSkill[] {
  if (exercise.assessmentMode === 'listening-writing') return ['listening', 'writing'];
  if (exercise.type === 'speaking') {
    return [classifySpeakingExercise(exercise) === 'question-and-answer' ? 'speaking' : 'shadowing'];
  }
  if (exercise.type === 'writing') return ['writing'];
  return [];
}

export function buildFinalTestReport(
  exercises: Exercise[],
  items: Record<string, MasteryItemState>,
): Record<FinalTestSkill, FinalTestSkillMetric> {
  const counts: Record<FinalTestSkill, Omit<FinalTestSkillMetric, 'firstTryAccuracy'>> = {
    listening: { total: 0, firstTryCorrect: 0, correctedAfterError: 0, incorrectAttempts: 0 },
    writing: { total: 0, firstTryCorrect: 0, correctedAfterError: 0, incorrectAttempts: 0 },
    shadowing: { total: 0, firstTryCorrect: 0, correctedAfterError: 0, incorrectAttempts: 0 },
    speaking: { total: 0, firstTryCorrect: 0, correctedAfterError: 0, incorrectAttempts: 0 },
  };
  for (const exercise of exercises) {
    const item = items[exercise.id];
    for (const skill of finalTestSkillForExercise(exercise)) {
      counts[skill].total += 1;
      if (item && !item.firstPassHadError && item.status === 'mastered') counts[skill].firstTryCorrect += 1;
      if (item?.firstPassHadError && item.status === 'mastered') counts[skill].correctedAfterError += 1;
      counts[skill].incorrectAttempts += item?.incorrectAttempts ?? 0;
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([skill, metric]) => [skill, {
    ...metric,
    firstTryAccuracy: metric.total ? Math.round((metric.firstTryCorrect / metric.total) * 100) : 0,
  }])) as Record<FinalTestSkill, FinalTestSkillMetric>;
}
