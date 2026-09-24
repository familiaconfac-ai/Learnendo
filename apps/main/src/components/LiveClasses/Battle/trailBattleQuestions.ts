import type { BattleQuestion } from './battleTypes';
import { getBattleCorrectIndexes, isChoiceQuestion } from './battleUtils';

function shuffleWith<T>(values: T[], random: () => number): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function randomizeTrailBattleQuestions(
  questions: BattleQuestion[],
  random: () => number = Math.random,
): BattleQuestion[] {
  const randomized = questions.map((question) => {
    if (!isChoiceQuestion(question) || !question.options?.length) return { ...question };

    const correctLabels = new Set(
      getBattleCorrectIndexes(question)
        .map((index) => question.options?.[index])
        .filter((label): label is string => typeof label === 'string'),
    );
    const options = shuffleWith(question.options, random);
    const correctIndexes = options
      .map((option, index) => (correctLabels.has(option) ? index : -1))
      .filter((index) => index >= 0);

    return {
      ...question,
      options,
      correctIndex: correctIndexes[0] ?? 0,
      correctIndexes: correctIndexes.length ? correctIndexes : [0],
    };
  });

  return shuffleWith(randomized, random);
}
