import { isAnswerMatch } from './answerNormalization.ts';

export type WritingPromptMode = 'answer-question' | 'write-question';

type WritingPromptSource = {
  promptMode?: WritingPromptMode;
  correctValue: string;
  acceptedAnswers?: string[];
};

type QuestionProductionSource = {
  type: string;
  audioValue: string;
  correctValue: string;
  options?: string[];
  acceptedQuestions?: string[];
};

export function normalizeProducedQuestion(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    .replace(/\bwhat'?s\b/g, 'what is')
    .replace(/\bwhere'?s\b/g, 'where is')
    .replace(/\bwho'?s\b/g, 'who is')
    .replace(/\bhow'?s\b/g, 'how is')
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function isProducedQuestionMatch(response: string, target: string): boolean {
  return normalizeProducedQuestion(response) === normalizeProducedQuestion(target);
}

export function isWritingPromptResponseCorrect(source: WritingPromptSource, response: string, language = 'en'): boolean {
  const targets = [source.correctValue, ...(source.acceptedAnswers ?? [])];
  return source.promptMode === 'write-question'
    ? targets.some((target) => isProducedQuestionMatch(response, target))
    : targets.some((target) => isAnswerMatch(response, target, language));
}

function contractedQuestion(question: string): string | null {
  const replacements: Array<[RegExp, string]> = [
    [/^what is\b/i, "What's"],
    [/^where is\b/i, "Where's"],
    [/^who is\b/i, "Who's"],
    [/^how is\b/i, "How's"],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(question)) return question.replace(pattern, replacement);
  }
  return null;
}

export function questionProductionFields(source: QuestionProductionSource): {
  instruction: 'Write the question.';
  displayValue: string;
  audioValue: string;
  correctValue: string;
  acceptedAnswers?: string[];
  promptMode: 'write-question';
} | null {
  const question = source.audioValue.trim();
  if (!source.options?.length || !/\?$/.test(question) || normalizeProducedQuestion(question) === normalizeProducedQuestion(source.correctValue)) {
    return null;
  }
  const contracted = contractedQuestion(question);
  const acceptedQuestions = [...new Set([
    ...(source.acceptedQuestions ?? []),
    ...(contracted && normalizeProducedQuestion(contracted) === normalizeProducedQuestion(question) ? [contracted] : []),
  ])];
  return {
    instruction: 'Write the question.',
    displayValue: `Answer: ${source.correctValue}`,
    audioValue: source.correctValue,
    correctValue: question,
    acceptedAnswers: acceptedQuestions.length ? acceptedQuestions : undefined,
    promptMode: 'write-question',
  };
}
