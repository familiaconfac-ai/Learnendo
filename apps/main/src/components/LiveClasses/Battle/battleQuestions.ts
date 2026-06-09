import type { BattleConfig, BattleQuestion } from './battleTypes';
import { getBattleQuestionsFromLab } from './battleLabSource';

export async function getBattleQuestions(
  config: Pick<BattleConfig, 'questionCount' | 'scope' | 'lessonId' | 'workbookId' | 'courseId' | 'difficulty' | 'trailIds'> & {
    recentQuestionIds?: string[];
  }
): Promise<BattleQuestion[]> {
  return getBattleQuestionsFromLab(config);
}
